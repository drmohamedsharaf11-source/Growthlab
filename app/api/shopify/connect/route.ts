import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { syncShopifyProducts } from "@/lib/syncShopifyProducts";
import { Role } from "@prisma/client";

function normalizeShop(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!s) return "";
  return s.includes(".myshopify.com") ? s : `${s}.myshopify.com`;
}

function isValidShop(shop: string): boolean {
  return /^[a-z0-9-]+\.myshopify\.com$/.test(shop);
}

export async function POST(request: NextRequest) {
  console.log("[shopify/connect] request received");

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { shopDomain?: string; clientId?: string; clientSecret?: string; targetClientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { shopDomain, clientId, clientSecret, targetClientId } = body;

  // Validate inputs
  if (!shopDomain || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: "shopDomain, clientId, and clientSecret are required" },
      { status: 400 }
    );
  }

  const shop = normalizeShop(shopDomain);
  if (!isValidShop(shop)) {
    return NextResponse.json(
      { error: "Invalid Shopify domain — must be like your-store.myshopify.com" },
      { status: 400 }
    );
  }

  // Determine which client record to update
  let resolvedClientId: string | null;
  if (session.user.role === Role.CLIENT) {
    resolvedClientId = session.user.clientId ?? null;
  } else {
    // ADMIN — targetClientId required
    resolvedClientId = targetClientId ?? null;
  }

  if (!resolvedClientId) {
    return NextResponse.json({ error: "No client associated with this account" }, { status: 400 });
  }

  console.log(`[shopify/connect] attempting Client Credentials Grant for shop=${shop} clientRecord=${resolvedClientId}`);

  // Exchange credentials for access token via Client Credentials Grant
  let accessToken: string;
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    console.log(`[shopify/connect] Shopify token response status: ${tokenRes.status}`);

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error(`[shopify/connect] Shopify returned ${tokenRes.status}:`, errBody);
      return NextResponse.json(
        { success: false, error: "Invalid credentials — check your Client ID and Secret" },
        { status: 400 }
      );
    }

    const tokenData = await tokenRes.json();
    console.log("[shopify/connect] token data keys:", Object.keys(tokenData));
    accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[shopify/connect] no access_token in response:", tokenData);
      return NextResponse.json(
        { success: false, error: "Shopify did not return an access token" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[shopify/connect] fetch error:", err);
    return NextResponse.json(
      { success: false, error: "Could not reach Shopify — check the store domain" },
      { status: 502 }
    );
  }

  // Encrypt the client secret before storing
  const encryptedSecret = encrypt(clientSecret);

  console.log(`[shopify/connect] saving credentials to DB for clientId=${resolvedClientId}`);

  await prisma.client.update({
    where: { id: resolvedClientId },
    data: {
      shopifyDomain: shop,
      shopifyToken: accessToken,
      shopifyClientId: clientId,
      shopifyClientSecret: encryptedSecret,
    },
  });

  console.log(`[shopify/connect] success — shop=${shop}`);

  // Fire-and-forget initial sync — don't block the response
  syncShopifyProducts(resolvedClientId).catch((e) =>
    console.error("[shopify/connect] initial sync failed:", e)
  );

  return NextResponse.json({ success: true, shop });
}
