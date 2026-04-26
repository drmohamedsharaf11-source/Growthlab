import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { getOrders } from "@/lib/shopify";
import { getPeriodDateRange } from "@/lib/reports";

const GRAPHQL_VERSION = "2024-10";

// ----- GraphQL types -----

interface GqlSelectedOption {
  name: string;
  value: string;
}

interface GqlVariantNode {
  id: string;
  inventoryQuantity: number;
  selectedOptions: GqlSelectedOption[];
}

interface GqlProductNode {
  id: string;
  title: string;
  variants: { edges: Array<{ node: GqlVariantNode }> };
}

interface GqlResponse {
  data?: {
    products: {
      edges: Array<{ cursor: string; node: GqlProductNode }>;
      pageInfo: { hasNextPage: boolean };
    };
  };
  errors?: Array<{ message: string }>;
}

// ----- GraphQL query -----

const PRODUCTS_QUERY = `
  query($cursor: String) {
    products(first: 250, after: $cursor) {
      edges {
        cursor
        node {
          id
          title
          variants(first: 100) {
            edges {
              node {
                id
                inventoryQuantity
                selectedOptions { name value }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

// ----- Fetcher -----

async function fetchAllProductsGql(domain: string, token: string): Promise<GqlProductNode[]> {
  const url = `https://${domain}/admin/api/${GRAPHQL_VERSION}/graphql.json`;
  const allProducts: GqlProductNode[] = [];
  let cursor: string | null = null;
  let page = 0;
  const start = Date.now();

  while (true) {
    page++;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { cursor } }),
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error(`Shopify GraphQL auth failed (${res.status}) — token may be expired or missing scopes`);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify GraphQL ${res.status}: ${text.slice(0, 200)}`);
    }

    const json: GqlResponse = await res.json();

    if (json.errors?.length) {
      console.error("[sync/graphql] GraphQL errors:", json.errors);
      throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`);
    }

    const edges = json.data?.products.edges ?? [];
    for (const { node } of edges) allProducts.push(node);

    console.log(`[sync/graphql] page ${page}, ${allProducts.length} products so far, ${Date.now() - start}ms`);

    if (!json.data?.products.pageInfo.hasNextPage || edges.length === 0) break;
    cursor = edges[edges.length - 1].cursor;
  }

  return allProducts;
}

// ----- Helpers -----

// "gid://shopify/Product/123" → "123"
function gidToNumeric(gid: string): string {
  return gid.split("/").pop() ?? gid;
}

// ----- Main export -----

export async function syncShopifyProducts(clientId: string): Promise<{ synced: number; elapsed: number }> {
  const start = Date.now();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.shopifyDomain || !client?.shopifyToken) {
    throw new Error("Shopify not configured for this client");
  }

  const { shopifyDomain: domain, shopifyToken: token } = client;
  const dateRange = getPeriodDateRange("MONTHLY");

  // Phase 1: fetch products (GraphQL) + orders (REST) in parallel
  const [gqlProducts, orders] = await Promise.all([
    fetchAllProductsGql(domain, token),
    getOrders(domain, token, dateRange),
  ]);

  console.log(
    `[sync/graphql] fetched ${gqlProducts.length} products + ${orders.length} orders in ${Date.now() - start}ms`
  );

  // Phase 2: build sales maps from orders (keyed by numeric Shopify ID)
  const salesMap = new Map<string, {
    sold: number;
    revenue: number;
    variants: Map<string, { sold: number; revenue: number }>;
  }>();

  for (const order of orders) {
    for (const item of order.line_items) {
      const pId = item.product_id.toString();
      const vId = item.variant_id.toString();
      const rev = parseFloat(item.price) * item.quantity;

      if (!salesMap.has(pId)) salesMap.set(pId, { sold: 0, revenue: 0, variants: new Map() });
      const pd = salesMap.get(pId)!;
      pd.sold += item.quantity;
      pd.revenue += rev;

      if (!pd.variants.has(vId)) pd.variants.set(vId, { sold: 0, revenue: 0 });
      const vd = pd.variants.get(vId)!;
      vd.sold += item.quantity;
      vd.revenue += rev;
    }
  }

  // Phase 3: map GQL nodes to our internal shape
  type MappedVariant = {
    shopifyId: string;
    size: string | null;
    color: string | null;
    sold: number;
    stockLeft: number;
    initialStock: number;
    revenue: number;
  };
  type MappedProduct = {
    shopifyId: string;
    name: string;
    totalSold: number;
    revenue: number;
    variants: MappedVariant[];
  };

  const mapped: MappedProduct[] = gqlProducts.map((p) => {
    const numPid = gidToNumeric(p.id);
    const ps = salesMap.get(numPid);

    return {
      shopifyId: p.id,
      name: p.title,
      totalSold: ps?.sold ?? 0,
      revenue: ps?.revenue ?? 0,
      variants: p.variants.edges.map(({ node: v }) => {
        const numVid = gidToNumeric(v.id);
        const vs = ps?.variants.get(numVid);
        const stockLeft = Math.max(0, v.inventoryQuantity ?? 0);
        const sold = vs?.sold ?? 0;

        // selectedOptions[0] = Size/first option, [1] = Color/second option
        const opts = v.selectedOptions;
        const isDefault = opts.length === 1 && opts[0].value === "Default Title";

        return {
          shopifyId: v.id,
          size: isDefault ? null : (opts[0]?.value ?? null),
          color: isDefault ? null : (opts[1]?.value ?? null),
          sold,
          stockLeft,
          initialStock: sold + stockLeft,
          revenue: vs?.revenue ?? 0,
        };
      }),
    };
  });

  // Phase 4: load existing records in 2 bulk queries
  const [existingProducts, existingVariants] = await Promise.all([
    prisma.product.findMany({
      where: { clientId },
      select: { id: true, shopifyId: true },
    }),
    prisma.variant.findMany({
      where: { product: { clientId } },
      select: { id: true, productId: true, shopifyId: true, initialStock: true },
    }),
  ]);

  const productIdMap = new Map(existingProducts.map((p) => [p.shopifyId, p.id]));
  const variantIdMap = new Map(
    existingVariants.map((v) => [`${v.productId}:${v.shopifyId}`, v])
  );

  // Phase 5: bulk upsert products — 1 UPDATE + 1 INSERT (max 2 SQL statements)
  const dbStart = Date.now();

  const toUpdateProducts = mapped.filter(({ shopifyId }) => productIdMap.has(shopifyId));
  const toInsertProducts = mapped.filter(({ shopifyId }) => !productIdMap.has(shopifyId));

  // Pre-generate IDs for new products so we can build the full map without a RETURNING query
  const newProductIds = new Map(toInsertProducts.map(({ shopifyId }) => [shopifyId, randomUUID()]));

  if (toUpdateProducts.length > 0) {
    await prisma.$executeRaw`
      UPDATE "Product" AS p
      SET    "name"      = v.name,
             "totalSold" = v.total_sold,
             "revenue"   = v.revenue
      FROM  (VALUES ${Prisma.join(
        toUpdateProducts.map(({ shopifyId, name, totalSold, revenue }) =>
          Prisma.sql`(${productIdMap.get(shopifyId)!}::text, ${name}::text, ${totalSold}::int, ${revenue}::float8)`
        )
      )}) AS v(id, name, total_sold, revenue)
      WHERE  p.id = v.id
    `;
  }

  if (toInsertProducts.length > 0) {
    await prisma.$executeRaw`
      INSERT INTO "Product" ("id", "clientId", "shopifyId", "name", "totalSold", "revenue")
      VALUES ${Prisma.join(
        toInsertProducts.map(({ shopifyId, name, totalSold, revenue }) =>
          Prisma.sql`(${newProductIds.get(shopifyId)!}, ${clientId}, ${shopifyId}, ${name}, ${totalSold}::int, ${revenue}::float8)`
        )
      )}
    `;
  }

  console.log(
    `[sync] products: ${toUpdateProducts.length} updated, ${toInsertProducts.length} inserted in ${Date.now() - dbStart}ms`
  );

  // Build complete shopifyId → DB id map (existing + newly inserted)
  const allProductIdMap = new Map([...Array.from(productIdMap), ...Array.from(newProductIds)]);

  // Phase 6: bulk upsert variants — 1 UPDATE + 1 INSERT (max 2 SQL statements)
  const variantStart = Date.now();

  type VariantWithProductId = MappedVariant & { productId: string };
  const allVariants: VariantWithProductId[] = mapped.flatMap(({ shopifyId: productShopifyId, variants }) => {
    const dbProductId = allProductIdMap.get(productShopifyId)!;
    return variants.map((v) => ({ ...v, productId: dbProductId }));
  });

  const toUpdateVariants = allVariants.filter(
    ({ productId, shopifyId }) => variantIdMap.has(`${productId}:${shopifyId}`)
  );
  const toInsertVariants = allVariants.filter(
    ({ productId, shopifyId }) => !variantIdMap.has(`${productId}:${shopifyId}`)
  );

  if (toUpdateVariants.length > 0) {
    await prisma.$executeRaw`
      UPDATE "Variant" AS v
      SET    "sold"         = u.sold,
             "stockLeft"    = u.stock_left,
             "initialStock" = GREATEST(v."initialStock", u.initial_stock),
             "revenue"      = u.revenue
      FROM  (VALUES ${Prisma.join(
        toUpdateVariants.map(({ shopifyId, productId, sold, stockLeft, initialStock, revenue }) =>
          Prisma.sql`(${variantIdMap.get(`${productId}:${shopifyId}`)!.id}::text, ${sold}::int, ${stockLeft}::int, ${initialStock}::int, ${revenue}::float8)`
        )
      )}) AS u(id, sold, stock_left, initial_stock, revenue)
      WHERE  v.id = u.id
    `;
  }

  // Pre-generate IDs for new variants so we can build a complete lookup map
  const newVariantIds = new Map(
    toInsertVariants.map(({ productId, shopifyId }) => [`${productId}:${shopifyId}`, randomUUID()])
  );

  if (toInsertVariants.length > 0) {
    await prisma.$executeRaw`
      INSERT INTO "Variant" ("id", "productId", "shopifyId", "size", "color", "sold", "stockLeft", "initialStock", "revenue")
      VALUES ${Prisma.join(
        toInsertVariants.map(({ shopifyId, productId, size, color, sold, stockLeft, initialStock, revenue }) =>
          Prisma.sql`(${newVariantIds.get(`${productId}:${shopifyId}`)!}, ${productId}, ${shopifyId}, ${size}, ${color}, ${sold}::int, ${stockLeft}::int, ${initialStock}::int, ${revenue}::float8)`
        )
      )}
    `;
  }

  console.log(
    `[sync] variants: ${toUpdateVariants.length} updated, ${toInsertVariants.length} inserted in ${Date.now() - variantStart}ms`
  );

  // Build complete variant lookup map: "dbProductId:variantGid" → db variant id
  const allVariantIdMap = new Map<string, string>([
    ...Array.from(variantIdMap, ([k, v]) => [k, v.id] as [string, string]),
    ...Array.from(newVariantIds),
  ]);

  // Phase 7: upsert orders + line items
  const orderStart = Date.now();

  const existingOrders = await prisma.order.findMany({
    where: { clientId, shopifyId: { in: orders.map((o) => o.id.toString()) } },
    select: { id: true, shopifyId: true },
  });
  const orderIdMap = new Map(existingOrders.map((o) => [o.shopifyId, o.id]));

  const newOrders = orders
    .filter((o) => !orderIdMap.has(o.id.toString()))
    .map((o) => ({ id: randomUUID(), shopifyId: o.id.toString(), createdAt: new Date(o.created_at) }));

  if (newOrders.length > 0) {
    await prisma.$executeRaw`
      INSERT INTO "Order" ("id", "clientId", "shopifyId", "createdAt")
      VALUES ${Prisma.join(
        newOrders.map((o) => Prisma.sql`(${o.id}, ${clientId}, ${o.shopifyId}, ${o.createdAt})`)
      )}
      ON CONFLICT ("clientId", "shopifyId") DO NOTHING
    `;
    for (const o of newOrders) orderIdMap.set(o.shopifyId, o.id);
  }

  const allLineItems = orders.flatMap((o) => {
    const orderId = orderIdMap.get(o.id.toString());
    if (!orderId) return [];
    const orderedAt = new Date(o.created_at);

    return o.line_items.map((item) => {
      const productGid = `gid://shopify/Product/${item.product_id}`;
      const variantGid = `gid://shopify/ProductVariant/${item.variant_id}`;
      const dbProductId = allProductIdMap.get(productGid) ?? null;
      const dbVariantId = dbProductId ? (allVariantIdMap.get(`${dbProductId}:${variantGid}`) ?? null) : null;

      return {
        id: randomUUID(),
        orderId,
        shopifyLineId: item.id.toString(),
        productId: dbProductId,
        variantId: dbVariantId,
        title: item.title,
        variantTitle: item.variant_title || null,
        quantity: item.quantity,
        price: parseFloat(item.price),
        revenue: parseFloat(item.price) * item.quantity,
        orderedAt,
      };
    });
  });

  const CHUNK = 500;
  for (let i = 0; i < allLineItems.length; i += CHUNK) {
    const chunk = allLineItems.slice(i, i + CHUNK);
    await prisma.$executeRaw`
      INSERT INTO "OrderLineItem" ("id", "orderId", "shopifyLineId", "productId", "variantId", "title", "variantTitle", "quantity", "price", "revenue", "orderedAt")
      VALUES ${Prisma.join(
        chunk.map((li) =>
          Prisma.sql`(${li.id}, ${li.orderId}, ${li.shopifyLineId}, ${li.productId}, ${li.variantId}, ${li.title}, ${li.variantTitle}, ${li.quantity}::int, ${li.price}::float8, ${li.revenue}::float8, ${li.orderedAt})`
        )
      )}
      ON CONFLICT ("orderId", "shopifyLineId") DO NOTHING
    `;
  }

  console.log(
    `[sync] orders: ${newOrders.length} new, ${allLineItems.length} line items in ${Date.now() - orderStart}ms`
  );

  // Stamp sync time
  await prisma.client.update({
    where: { id: clientId },
    data: { lastShopifySyncAt: new Date() },
  });

  const elapsed = Date.now() - start;
  console.log(`[sync/shopify] client=${clientId} products=${mapped.length} elapsed=${elapsed}ms`);

  return { synced: mapped.length, elapsed };
}
