import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import crypto from "crypto";

const SCOPES = "read_orders,read_products,read_inventory,read_analytics";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");
  const clientId = searchParams.get("clientId");

  if (!shop || !clientId) {
    return NextResponse.json({ error: "Missing shop or clientId" }, { status: 400 });
  }

  // Normalize and validate shop domain
  const cleanShop = shop
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  if (!cleanShop.endsWith(".myshopify.com") && !cleanShop.includes(".")) {
    return NextResponse.json(
      { error: "Invalid Shopify domain. Use format: storename.myshopify.com" },
      { status: 400 }
    );
  }

  // Verify the client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Generate CSRF state: clientId:nonce
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${clientId}:${nonce}`;

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/shopify/callback`;

  const installUrl =
    `https://${cleanShop}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_CLIENT_ID}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  const response = NextResponse.redirect(installUrl);

  // Store state in a short-lived cookie for CSRF validation on callback
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
