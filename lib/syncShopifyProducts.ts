import prisma from "@/lib/prisma";
import { syncShopifyData } from "@/lib/shopify";
import { getPeriodDateRange } from "@/lib/reports";

export async function syncShopifyProducts(clientId: string): Promise<{ synced: number }> {
  const start = Date.now();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.shopifyDomain || !client?.shopifyToken) {
    throw new Error("Shopify not configured for this client");
  }

  const dateRange = getPeriodDateRange("MONTHLY");
  const { products } = await syncShopifyData(client.shopifyDomain, client.shopifyToken, dateRange);

  let synced = 0;
  for (const productData of products) {
    const { variants, ...productFields } = productData;

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

  const now = new Date();
  await prisma.client.update({
    where: { id: clientId },
    data: { lastShopifySyncAt: now },
  });

  const elapsed = Date.now() - start;
  console.log(`[sync/shopify] client=${clientId} products=${synced} elapsed=${elapsed}ms`);

  return { synced };
}
