export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const requestedClientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let targetClientId: string | null;
    if (session.user.role === Role.ADMIN) {
      targetClientId = requestedClientId;
    } else {
      targetClientId = session.user.clientId ?? null;
    }

    if (!targetClientId) {
      return NextResponse.json({ error: "No client selected" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { clientId: targetClientId },
      include: { variants: true },
      orderBy: { totalSold: "desc" },
    });

    if (!startDate || !endDate) {
      return NextResponse.json({ products });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const lineItems = await prisma.orderLineItem.findMany({
      where: {
        order: { clientId: targetClientId },
        orderedAt: { gte: start, lte: end },
        productId: { not: null },
      },
      select: {
        productId: true,
        variantId: true,
        quantity: true,
        revenue: true,
      },
    });

    const productRevMap = new Map<string, { totalSold: number; revenue: number }>();
    const variantRevMap = new Map<string, { sold: number; revenue: number }>();

    for (const li of lineItems) {
      if (li.productId) {
        if (!productRevMap.has(li.productId))
          productRevMap.set(li.productId, { totalSold: 0, revenue: 0 });
        const pd = productRevMap.get(li.productId)!;
        pd.totalSold += li.quantity;
        pd.revenue += li.revenue;
      }
      if (li.variantId) {
        if (!variantRevMap.has(li.variantId))
          variantRevMap.set(li.variantId, { sold: 0, revenue: 0 });
        const vd = variantRevMap.get(li.variantId)!;
        vd.sold += li.quantity;
        vd.revenue += li.revenue;
      }
    }

    const enriched = products.map((p) => {
      const pr = productRevMap.get(p.id);
      return {
        ...p,
        totalSold: pr?.totalSold ?? 0,
        revenue: pr?.revenue ?? 0,
        variants: p.variants.map((v) => {
          const vr = variantRevMap.get(v.id);
          return { ...v, sold: vr?.sold ?? 0, revenue: vr?.revenue ?? 0 };
        }),
      };
    });

    // Sort by revenue in the selected period
    enriched.sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ products: enriched });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Inventory API error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
