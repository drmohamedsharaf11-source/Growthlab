import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireAuth, requireAdmin } from "@/lib/auth-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeClient(client: any) {
  const { shopifyToken, shopifyClientId, shopifyClientSecret, ...rest } = client;
  return {
    ...rest,
    shopifyConnected: !!(shopifyToken && shopifyToken.length > 0),
  };
}

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAuth();

    // CLIENT can only access their own record
    if (session.user.role === Role.CLIENT && session.user.clientId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, clientId: true, createdAt: true } },
        adAccounts: {
          include: { creatives: { orderBy: { roas: "desc" } } },
        },
        products: {
          include: { variants: true },
          orderBy: { totalSold: "desc" },
        },
        alerts: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(sanitizeClient(client));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/clients/[id] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.role === Role.ADMIN;

    // CLIENT can only update their own record
    if (!isAdmin && session.user.clientId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      shopifyDomain,
      shopifyToken,
      shopifyClientId: bodyShopifyClientId,
      shopifyClientSecret: bodyShopifyClientSecret,
      metaAccountId,
      metaAccessToken,
      tiktokAccountId,
      tiktokAccessToken,
      reportFrequency,
      status,
    } = body;

    // Clients cannot set their own tokens — only ADMIN or the connect flow can
    if (!isAdmin && (shopifyToken !== undefined || metaAccessToken !== undefined || tiktokAccessToken !== undefined)) {
      return NextResponse.json(
        { error: "Forbidden: token fields can only be set by an admin" },
        { status: 403 }
      );
    }

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(shopifyDomain !== undefined && { shopifyDomain }),
        ...(isAdmin && shopifyToken !== undefined && { shopifyToken }),
        // Allow nulling out Shopify credentials (disconnect)
        ...(isAdmin && bodyShopifyClientId !== undefined && { shopifyClientId: bodyShopifyClientId }),
        ...(isAdmin && bodyShopifyClientSecret !== undefined && { shopifyClientSecret: bodyShopifyClientSecret }),
        ...(metaAccountId !== undefined && { metaAccountId }),
        ...(isAdmin && metaAccessToken !== undefined && { metaAccessToken }),
        ...(tiktokAccountId !== undefined && { tiktokAccountId }),
        ...(isAdmin && tiktokAccessToken !== undefined && { tiktokAccessToken }),
        ...(reportFrequency && { reportFrequency }),
        ...(isAdmin && status && { status }),
      },
    });

    return NextResponse.json(sanitizeClient(client));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PUT /api/clients/[id] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { adAccounts: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    for (const account of client.adAccounts) {
      await prisma.creative.deleteMany({ where: { adAccountId: account.id } });
    }

    await prisma.adAccount.deleteMany({ where: { clientId: params.id } });
    await prisma.alert.deleteMany({ where: { clientId: params.id } });

    const products = await prisma.product.findMany({ where: { clientId: params.id } });
    for (const product of products) {
      await prisma.variant.deleteMany({ where: { productId: product.id } });
    }
    await prisma.product.deleteMany({ where: { clientId: params.id } });
    await prisma.user.updateMany({
      where: { clientId: params.id },
      data: { clientId: null },
    });

    await prisma.client.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("DELETE /api/clients/[id] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
