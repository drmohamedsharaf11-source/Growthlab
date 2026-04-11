import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function validateHmac(query: URLSearchParams, secret: string): boolean {
  const hmac = query.get("hmac");
  if (!hmac) return false;

  // Collect all params except hmac, sort, and join
  const params: string[] = [];
  query.forEach((value, key) => {
    if (key !== "hmac") {
      params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });
  params.sort();
  const message = params.join("&");

  const digest = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

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
  const adminUrl = `${process.env.NEXTAUTH_URL}/dashboard/admin`;

  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");

  if (!code || !shop || !state) {
    return NextResponse.redirect(`${adminUrl}?shopify=error&msg=missing_params`);
  }

  // Validate HMAC signature from Shopify
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    console.error("SHOPIFY_CLIENT_SECRET not configured");
    return NextResponse.redirect(`${adminUrl}?shopify=error&msg=not_configured`);
  }

  if (!validateHmac(searchParams, secret)) {
    return NextResponse.redirect(`${adminUrl}?shopify=error&msg=invalid_hmac`);
  }

  // Validate state against database (replaces cookie-based CSRF check)
  const storedState = await prisma.shopifyOAuthState.findUnique({
    where: { state },
  });

  if (!storedState) {
    console.error("Shopify OAuth state not found in DB:", state);
    return NextResponse.redirect(`${adminUrl}?shopify=error&msg=invalid_state`);
  }

  if (storedState.expiresAt < new Date()) {
    await prisma.shopifyOAuthState.delete({ where: { state } });
    return NextResponse.redirect(`${adminUrl}?shopify=error&msg=state_expired`);
  }

  const clientId = storedState.clientId;

  // Consume the state immediately to prevent replay attacks
  await prisma.shopifyOAuthState.delete({ where: { state } });

  // Exchange authorization code for permanent access token
  try {
    const tokenRes = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_CLIENT_ID,
          client_secret: secret,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      console.error("Shopify token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(
        `${adminUrl}?shopify=error&msg=token_exchange_failed`
      );
    }

    const tokenData = await tokenRes.json();
    const access_token: string = tokenData.access_token;

    if (!access_token) {
      return NextResponse.redirect(
        `${adminUrl}?shopify=error&msg=no_access_token`
      );
    }

    // Persist to database
    await prisma.client.update({
      where: { id: clientId },
      data: {
        shopifyDomain: shop,
        shopifyToken: access_token,
      },
    });

    return NextResponse.redirect(
      `${adminUrl}?shopify=connected&shop=${encodeURIComponent(shop)}`
    );
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    return NextResponse.redirect(`${adminUrl}?shopify=error&msg=server_error`);
  }
}
