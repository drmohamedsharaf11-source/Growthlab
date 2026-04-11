import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { syncShopifyData } from "@/lib/shopify";
import { getPeriodDateRange } from "@/lib/reports";
import { Role } from "@prisma/client";

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

    const dateRange = getPeriodDateRange("MONTHLY");
    const { products } = await syncShopifyData(
      client.shopifyDomain,
      client.shopifyToken,
      dateRange
    );

    let synced = 0;
    for (const productData of products) {
      const { variants, ...productFields } = productData;

      // Find existing product by shopifyId
      const existingProduct = await prisma.product.findFirst({
        where: { clientId, shopifyId: productFields.shopifyId },
      });

      let product;
      if (existingProduct) {
        product = await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: productFields.name,
            totalSold: productFields.totalSold,
            revenue: productFields.revenue,
          },
        });
      } else {
        product = await prisma.product.create({
          data: { ...productFields, clientId },
        });
      }

      // Upsert variants
      for (const variant of variants) {
        const existingVariant = await prisma.variant.findFirst({
          where: { productId: product.id, shopifyId: variant.shopifyId },
        });

        if (existingVariant) {
          await prisma.variant.update({
            where: { id: existingVariant.id },
            data: {
              sold: variant.sold,
              stockLeft: variant.stockLeft,
              initialStock: Math.max(existingVariant.initialStock, variant.initialStock),
              revenue: variant.revenue,
            },
          });
        } else {
          await prisma.variant.create({
            data: { ...variant, productId: product.id },
          });
        }
      }
      synced++;
    }

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error("Shopify sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Shopify sync failed" },
      { status: 500 }
    );
  }
}
