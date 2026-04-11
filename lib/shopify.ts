import {
  ShopifyOrder,
  ShopifyProduct,
  ShopifyVariant,
  DateRange,
} from "@/types";

export { computeSellThrough, computeRestockRatio, calculateRestockUnits } from "./sellthrough";

const SHOPIFY_API_VERSION = "2024-01";

function shopifyUrl(domain: string, endpoint: string): string {
  const cleanDomain = domain.replace(/^https?:\/\//, "");
  return `https://${cleanDomain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
}

async function shopifyFetch<T>(
  domain: string,
  token: string,
  endpoint: string
): Promise<T> {
  const url = shopifyUrl(domain, endpoint);
  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error ${response.status}: ${response.statusText} (${url})`);
  }

  return response.json() as Promise<T>;
}

export async function getOrders(
  domain: string,
  token: string,
  dateRange: DateRange
): Promise<ShopifyOrder[]> {
  const since = dateRange.start.toISOString();
  const until = dateRange.end.toISOString();
  const endpoint = `orders.json?status=any&financial_status=paid&created_at_min=${since}&created_at_max=${until}&limit=250`;

  const data = await shopifyFetch<{ orders: ShopifyOrder[] }>(
    domain,
    token,
    endpoint
  );
  return data.orders || [];
}

export async function getProducts(
  domain: string,
  token: string
): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{ products: ShopifyProduct[] }>(
    domain,
    token,
    "products.json?limit=250&fields=id,title,variants"
  );
  return data.products || [];
}

export async function getInventoryLevels(
  domain: string,
  token: string,
  variantIds: string[]
): Promise<Map<string, number>> {
  const inventoryMap = new Map<string, number>();

  // Fetch in batches of 50
  const batchSize = 50;
  for (let i = 0; i < variantIds.length; i += batchSize) {
    const batch = variantIds.slice(i, i + batchSize);
    const ids = batch.join(",");
    const endpoint = `variants.json?ids=${ids}&fields=id,inventory_quantity`;

    const data = await shopifyFetch<{ variants: Array<{ id: string; inventory_quantity: number }> }>(
      domain,
      token,
      endpoint
    );

    for (const variant of data.variants || []) {
      inventoryMap.set(variant.id.toString(), variant.inventory_quantity);
    }
  }

  return inventoryMap;
}

export async function syncShopifyData(
  domain: string,
  token: string,
  dateRange: DateRange
): Promise<{
  products: Array<{
    shopifyId: string;
    name: string;
    totalSold: number;
    revenue: number;
    variants: Array<{
      shopifyId: string;
      size: string | null;
      color: string | null;
      sold: number;
      stockLeft: number;
      initialStock: number;
      revenue: number;
    }>;
  }>;
}> {
  const [orders, products] = await Promise.all([
    getOrders(domain, token, dateRange),
    getProducts(domain, token),
  ]);

  // Build revenue/sold maps from orders
  const productSalesMap = new Map<
    string,
    { sold: number; revenue: number; variants: Map<string, { sold: number; revenue: number }> }
  >();

  for (const order of orders) {
    for (const item of order.line_items) {
      const pId = item.product_id.toString();
      const vId = item.variant_id.toString();
      const itemRevenue = parseFloat(item.price) * item.quantity;

      if (!productSalesMap.has(pId)) {
        productSalesMap.set(pId, { sold: 0, revenue: 0, variants: new Map() });
      }
      const pData = productSalesMap.get(pId)!;
      pData.sold += item.quantity;
      pData.revenue += itemRevenue;

      if (!pData.variants.has(vId)) {
        pData.variants.set(vId, { sold: 0, revenue: 0 });
      }
      const vData = pData.variants.get(vId)!;
      vData.sold += item.quantity;
      vData.revenue += itemRevenue;
    }
  }

  // Get all variant IDs for inventory lookup
  const allVariantIds = products.flatMap((p) =>
    p.variants.map((v) => v.id.toString())
  );
  const inventoryMap = await getInventoryLevels(domain, token, allVariantIds);

  return {
    products: products.map((product) => {
      const salesData = productSalesMap.get(product.id.toString());

      return {
        shopifyId: `gid://shopify/Product/${product.id}`,
        name: product.title,
        totalSold: salesData?.sold || 0,
        revenue: salesData?.revenue || 0,
        variants: product.variants.map((variant: ShopifyVariant) => {
          const vId = variant.id.toString();
          const variantSales = salesData?.variants.get(vId);
          const stockLeft = inventoryMap.get(vId) || variant.inventory_quantity || 0;
          const sold = variantSales?.sold || 0;

          return {
            shopifyId: `gid://shopify/ProductVariant/${variant.id}`,
            size: variant.option1,
            color: variant.option2,
            sold,
            stockLeft: Math.max(0, stockLeft),
            initialStock: sold + Math.max(0, stockLeft),
            revenue: variantSales?.revenue || 0,
          };
        }),
      };
    }),
  };
}
