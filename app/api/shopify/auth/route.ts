import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

/** Strip protocol/trailing slash, append .myshopify.com if missing */
function normalizeShop(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!s) return "";
  return s.includes(".myshopify.com") ? s : `${s}.myshopify.com`;
}

/** Only allow "something.myshopify.com" with valid handle characters */
function isValidShop(shop: string): boolean {
  return /^[a-z0-9-]+\.myshopify\.com$/.test(shop);
}

export async function GET(request: NextRequest) {
  console.log('[shopify/auth] params:', Object.fromEntries(new URL(request.url).searchParams));

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Shop must always come from the caller — no env-var fallback
  const shop = normalizeShop(searchParams.get("shop") || "");
  if (!shop || !isValidShop(shop)) {
    return NextResponse.json(
      { error: "A valid shop domain is required (e.g. your-store.myshopify.com)" },
      { status: 400 }
    );
  }

  // Determine clientId and redirect source based on role
  let clientId: string | null;
  let source: string;

  if (session.user.role === Role.ADMIN) {
    clientId = searchParams.get("clientId") ?? null;
    source = "admin";
  } else {
    clientId = session.user.clientId;
    source = "onboard";
  }

  const apiKey = process.env.SHOPIFY_CLIENT_ID;
  const baseUrl = process.env.NEXTAUTH_URL || "";
  const redirectUri = `${baseUrl}/api/shopify/callback`;
  const scopes = "read_orders,read_products,read_inventory,read_customers,read_analytics";

  if (!apiKey) {
    return NextResponse.json(
      { error: "SHOPIFY_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("shopify_oauth_state", JSON.stringify({ state, clientId, source }), {
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
