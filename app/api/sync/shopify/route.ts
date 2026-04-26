import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncShopifyProducts } from "@/lib/syncShopifyProducts";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clientId } = await request.json();

    if (session.user.role === Role.CLIENT && session.user.clientId !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify client exists and has Shopify configured
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (!client.shopifyDomain || !client.shopifyToken) {
      return NextResponse.json(
        { error: "Shopify credentials not configured for this client" },
        { status: 400 }
      );
    }

    const { synced, elapsed } = await syncShopifyProducts(clientId);

    // Re-fetch lastShopifySyncAt to return to the client
    const updated = await prisma.client.findUnique({
      where: { id: clientId },
      select: { lastShopifySyncAt: true },
    });

    return NextResponse.json({ success: true, synced, elapsed, lastShopifySyncAt: updated?.lastShopifySyncAt });
  } catch (error) {
    console.error("Shopify sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Shopify sync failed" },
      { status: 500 }
    );
  }
}
