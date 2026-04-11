import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  // Clients can only access their own data
  if (session.user.role === Role.CLIENT && session.user.clientId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, clientId: true, createdAt: true } },
        adAccounts: {
          include: {
            creatives: { orderBy: { roas: "desc" } },
          },
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

    return NextResponse.json(client);
  } catch (error) {
    console.error("GET /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      name,
      shopifyDomain,
      shopifyToken,
      metaAccountId,
      metaAccessToken,
      tiktokAccountId,
      tiktokAccessToken,
      reportFrequency,
      status,
    } = body;

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(shopifyDomain !== undefined && { shopifyDomain }),
        ...(shopifyToken !== undefined && { shopifyToken }),
        ...(metaAccountId !== undefined && { metaAccountId }),
        ...(metaAccessToken !== undefined && { metaAccessToken }),
        ...(tiktokAccountId !== undefined && { tiktokAccountId }),
        ...(tiktokAccessToken !== undefined && { tiktokAccessToken }),
        ...(reportFrequency && { reportFrequency }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("PUT /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Delete in order due to foreign key constraints
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { adAccounts: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Delete creatives
    for (const account of client.adAccounts) {
      await prisma.creative.deleteMany({ where: { adAccountId: account.id } });
    }

    // Delete in cascade order
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
  } catch (error) {
    console.error("DELETE /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
