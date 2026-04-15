import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

function verifyShopifyHmac(query: URLSearchParams, secret: string): boolean {
  const hmac = query.get("hmac");
  if (!hmac) return false;

  // Build the message from all params except hmac, sorted alphabetically
  const params = new URLSearchParams(query);
  params.delete("hmac");

  const message = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, "hex"),
      Buffer.from(hmac, "hex")
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseUrl = process.env.NEXTAUTH_URL || "";
  const dashboardUrl = `${baseUrl}/dashboard/admin`;

  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");

  if (!code || !shop || !state) {
    return NextResponse.redirect(`${dashboardUrl}?shopify=error&msg=missing_params`);
  }

  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    return NextResponse.redirect(`${dashboardUrl}?shopify=error&msg=not_configured`);
  }

  // Verify Shopify HMAC signature
  if (!verifyShopifyHmac(searchParams, secret)) {
    return NextResponse.redirect(`${dashboardUrl}?shopify=error&msg=invalid_hmac`);
  }

  // Verify state cookie to prevent CSRF
  const cookieStore = await cookies();
  const stateCookieRaw = cookieStore.get("shopify_oauth_state")?.value;
  if (!stateCookieRaw) {
    return NextResponse.redirect(`${dashboardUrl}?shopify=error&msg=invalid_state`);
  }

  let savedState: { state: string; clientId: string | null };
  try {
    savedState = JSON.parse(stateCookieRaw);
  } catch {
    return NextResponse.redirect(`${dashboardUrl}?shopify=error&msg=invalid_state`);
  }

  if (savedState.state !== state) {
    return NextResponse.redirect(`${dashboardUrl}?shopify=error&msg=invalid_state`);
  }

  // Clear the state cookie
  cookieStore.delete("shopify_oauth_state");

  // Exchange the authorization code for a permanent access token
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: secret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Shopify token exchange failed:", tokenRes.status, await tokenRes.text());
      return NextResponse.redirect(`${dashboardUrl}?shopify=error&msg=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string | undefined = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${dashboardUrl}?shopify=error&msg=no_access_token`);
    }

    // Persist the access token on the client record (if a clientId was passed)
    if (savedState.clientId) {
      await prisma.client.update({
        where: { id: savedState.clientId },
        data: {
          shopifyDomain: shop,
          shopifyToken: accessToken,
        },
      });
    }

    return NextResponse.redirect(
      `${dashboardUrl}?shopify=connected&shop=${encodeURIComponent(shop)}`
    );
  } catch (err) {
    console.error("Shopify OAuth callback error:", err);
    return NextResponse.redirect(`${dashboardUrl}?shopify=error&msg=server_error`);
  }
}
