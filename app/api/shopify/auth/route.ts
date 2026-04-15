import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ?? null;

  const shop = process.env.SHOPIFY_SHOP || "pinkrose-eg.myshopify.com";
  const apiKey = process.env.SHOPIFY_CLIENT_ID;
  const baseUrl = process.env.NEXTAUTH_URL || "";
  const redirectUri = `${baseUrl}/api/shopify/callback`;
  const scopes = "read_orders,read_products,read_inventory";

  if (!apiKey) {
    return NextResponse.json(
      { error: "SHOPIFY_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  // Generate a random state token for CSRF protection
  const state = crypto.randomBytes(16).toString("hex");

  // Persist state + clientId in an httpOnly cookie (10-minute TTL)
  const cookieStore = await cookies();
  cookieStore.set("shopify_oauth_state", JSON.stringify({ state, clientId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", apiKey);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
