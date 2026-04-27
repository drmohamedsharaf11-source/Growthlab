import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

const GRAPHQL_VERSION = "2024-10";

// ----- GraphQL types: products -----

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

interface GqlProductsResponse {
  data?: {
    products: {
      edges: Array<{ cursor: string; node: GqlProductNode }>;
      pageInfo: { hasNextPage: boolean };
    };
  };
  errors?: Array<{ message: string }>;
}

// ----- GraphQL types: orders -----

interface GqlLineItemNode {
  id: string;
  quantity: number;
  originalUnitPriceSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
  variant: { id: string } | null;
  product: { id: string } | null;
  title: string;
  variantTitle: string | null;
}

interface GqlOrderNode {
  id: string;
  createdAt: string;
  lineItems: { edges: Array<{ node: GqlLineItemNode }> };
}

interface GqlOrdersResponse {
  data?: {
    orders: {
      edges: Array<{ cursor: string; node: GqlOrderNode }>;
      pageInfo: { hasNextPage: boolean };
    };
  };
  errors?: Array<{ message: string }>;
}

// ----- GraphQL queries -----

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

const ORDERS_QUERY = `
  query($cursor: String, $q: String!) {
    orders(first: 250, after: $cursor, query: $q) {
      edges {
        cursor
        node {
          id
          createdAt
          lineItems(first: 250) {
            edges {
              node {
                id
                quantity
                originalUnitPriceSet {
                  shopMoney { amount currencyCode }
                }
                variant { id }
                product { id }
                title
                variantTitle
              }
            }
          }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

// ----- Shared GraphQL fetcher -----

async function gqlFetch(domain: string, token: string, query: string, variables: Record<string, unknown>): Promise<unknown> {
  const url = `https://${domain}/admin/api/${GRAPHQL_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(`Shopify GraphQL auth failed (${res.status}) — token may be expired or missing scopes`);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify GraphQL ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ----- Fetchers -----

async function fetchAllProductsGql(domain: string, token: string): Promise<GqlProductNode[]> {
  const allProducts: GqlProductNode[] = [];
  let cursor: string | null = null;
  let page = 0;
  const start = Date.now();

  while (true) {
    page++;
    const json = await gqlFetch(domain, token, PRODUCTS_QUERY, { cursor }) as GqlProductsResponse;

    if (json.errors?.length) {
      throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`);
    }

    const edges = json.data?.products.edges ?? [];
    for (const { node } of edges) allProducts.push(node);

    console.log(`[sync/products] page ${page}, ${allProducts.length} products so far, ${Date.now() - start}ms`);

    if (!json.data?.products.pageInfo.hasNextPage || edges.length === 0) break;
    cursor = edges[edges.length - 1].cursor;
  }

  return allProducts;
}

async function fetchAllOrdersGql(domain: string, token: string, sinceDate: string): Promise<GqlOrderNode[]> {
  const allOrders: GqlOrderNode[] = [];
  let cursor: string | null = null;
  let page = 0;
  const start = Date.now();
  const q = `created_at:>="${sinceDate}" financial_status:paid`;

  while (true) {
    page++;
    const json = await gqlFetch(domain, token, ORDERS_QUERY, { cursor, q }) as GqlOrdersResponse;

    if (json.errors?.length) {
      throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`);
    }

    const edges = json.data?.orders.edges ?? [];
    for (const { node } of edges) allOrders.push(node);

    console.log(`[sync/orders] page ${page}, ${allOrders.length} orders so far, ${Date.now() - start}ms`);

    if (!json.data?.orders.pageInfo.hasNextPage || edges.length === 0) break;
    cursor = edges[edges.length - 1].cursor;
  }

  return allOrders;
}

// ----- Main export -----

export async function syncShopifyProducts(clientId: string): Promise<{ synced: number; elapsed: number }> {
  const start = Date.now();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.shopifyDomain || !client?.shopifyToken) {
    throw new Error("Shopify not configured for this client");
  }

  const { shopifyDomain: domain, shopifyToken: token, lastShopifySyncAt } = client;

  // First sync → go back to Jan 1 2025; subsequent → fetch only new orders
  const sinceDate = lastShopifySyncAt
    ? lastShopifySyncAt.toISOString().split("T")[0]
    : "2025-01-01";

  console.log(`[sync/shopify] client=${clientId} sinceDate=${sinceDate}`);

  // Phase 1: fetch products (GraphQL) + orders (GraphQL, paginated) in parallel
  const [gqlProducts, gqlOrders] = await Promise.all([
    fetchAllProductsGql(domain, token),
    fetchAllOrdersGql(domain, token, sinceDate),
  ]);

  const totalLineItems = gqlOrders.reduce((s, o) => s + o.lineItems.edges.length, 0);
  console.log(
    `[sync/orders] total: ${gqlOrders.length} orders, ${totalLineItems} line items in ${Date.now() - start}ms`
  );

  // Phase 2: build sales maps from orders (keyed by Shopify GID — matches GQL product IDs directly)
  const salesMap = new Map<string, {
    sold: number;
    revenue: number;
    variants: Map<string, { sold: number; revenue: number }>;
  }>();

  for (const order of gqlOrders) {
    for (const { node: item } of order.lineItems.edges) {
      if (!item.product?.id) continue; // skip gift cards / custom line items
      const pGid = item.product.id;
      const vGid = item.variant?.id ?? null;
      const price = parseFloat(item.originalUnitPriceSet.shopMoney.amount);
      const rev = price * item.quantity;

      if (!salesMap.has(pGid)) salesMap.set(pGid, { sold: 0, revenue: 0, variants: new Map() });
      const pd = salesMap.get(pGid)!;
      pd.sold += item.quantity;
      pd.revenue += rev;

      if (vGid) {
        if (!pd.variants.has(vGid)) pd.variants.set(vGid, { sold: 0, revenue: 0 });
        const vd = pd.variants.get(vGid)!;
        vd.sold += item.quantity;
        vd.revenue += rev;
      }
    }
  }

  // Phase 3: map GQL product nodes to our internal shape
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
    // p.id is already a GID — direct lookup in salesMap, no conversion needed
    const ps = salesMap.get(p.id);

    return {
      shopifyId: p.id,
      name: p.title,
      totalSold: ps?.sold ?? 0,
      revenue: ps?.revenue ?? 0,
      variants: p.variants.edges.map(({ node: v }) => {
        const vs = ps?.variants.get(v.id); // v.id is also a GID
        const stockLeft = Math.max(0, v.inventoryQuantity ?? 0);
        const sold = vs?.sold ?? 0;

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

  // Phase 5: bulk upsert products
  const dbStart = Date.now();

  const toUpdateProducts = mapped.filter(({ shopifyId }) => productIdMap.has(shopifyId));
  const toInsertProducts = mapped.filter(({ shopifyId }) => !productIdMap.has(shopifyId));

  const newProductIds = new Map(toInsertProducts.map(({ shopifyId }) => [shopifyId, randomUUID()]));

  if (toUpdateProducts.length > 0) {
    // Incremental: ADD new sold/revenue from this sync window on top of existing totals
    await prisma.$executeRaw`
      UPDATE "Product" AS p
      SET    "name"      = v.name,
             "totalSold" = p."totalSold" + v.additional_sold,
             "revenue"   = p."revenue" + v.additional_revenue
      FROM  (VALUES ${Prisma.join(
        toUpdateProducts.map(({ shopifyId, name, totalSold, revenue }) =>
          Prisma.sql`(${productIdMap.get(shopifyId)!}::text, ${name}::text, ${totalSold}::int, ${revenue}::float8)`
        )
      )}) AS v(id, name, additional_sold, additional_revenue)
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

  const allProductIdMap = new Map([...Array.from(productIdMap), ...Array.from(newProductIds)]);

  // Phase 6: bulk upsert variants
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
    // Incremental: ADD new sold/revenue; stockLeft/initialStock always reflect current inventory
    await prisma.$executeRaw`
      UPDATE "Variant" AS v
      SET    "sold"         = v."sold" + u.additional_sold,
             "stockLeft"    = u.stock_left,
             "initialStock" = GREATEST(v."initialStock", u.initial_stock),
             "revenue"      = v."revenue" + u.additional_revenue
      FROM  (VALUES ${Prisma.join(
        toUpdateVariants.map(({ shopifyId, productId, sold, stockLeft, initialStock, revenue }) =>
          Prisma.sql`(${variantIdMap.get(`${productId}:${shopifyId}`)!.id}::text, ${sold}::int, ${stockLeft}::int, ${initialStock}::int, ${revenue}::float8)`
        )
      )}) AS u(id, additional_sold, stock_left, initial_stock, additional_revenue)
      WHERE  v.id = u.id
    `;
  }

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

  const allVariantIdMap = new Map<string, string>([
    ...Array.from(variantIdMap, ([k, v]) => [k, v.id] as [string, string]),
    ...Array.from(newVariantIds),
  ]);

  // Phase 7: upsert orders + line items
  const orderStart = Date.now();

  // Insert all orders; DO UPDATE (no-op) so RETURNING gives us IDs for both new and existing rows
  type OrderRow = { id: string; shopifyId: string };
  let orderIdMap = new Map<string, string>();

  if (gqlOrders.length > 0) {
    const orderRows: OrderRow[] = await prisma.$queryRaw`
      INSERT INTO "Order" ("id", "clientId", "shopifyId", "createdAt")
      VALUES ${Prisma.join(
        gqlOrders.map((o) =>
          Prisma.sql`(${randomUUID()}, ${clientId}, ${o.id}, ${new Date(o.createdAt)})`
        )
      )}
      ON CONFLICT ("clientId", "shopifyId") DO UPDATE
        SET "createdAt" = "Order"."createdAt"
      RETURNING id, "shopifyId"
    `;
    orderIdMap = new Map(orderRows.map((r) => [r.shopifyId, r.id]));
  }

  const allLineItems = gqlOrders.flatMap((o) => {
    const orderId = orderIdMap.get(o.id);
    if (!orderId) return [];
    const orderedAt = new Date(o.createdAt);

    return o.lineItems.edges.map(({ node: item }) => {
      const dbProductId = item.product?.id ? (allProductIdMap.get(item.product.id) ?? null) : null;
      const dbVariantId = (dbProductId && item.variant?.id)
        ? (allVariantIdMap.get(`${dbProductId}:${item.variant.id}`) ?? null)
        : null;
      const price = parseFloat(item.originalUnitPriceSet.shopMoney.amount);

      return {
        id: randomUUID(),
        orderId,
        shopifyLineId: item.id,
        productId: dbProductId,
        variantId: dbVariantId,
        title: item.title,
        variantTitle: item.variantTitle ?? null,
        quantity: item.quantity,
        price,
        revenue: price * item.quantity,
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
    `[sync] orders: ${gqlOrders.length} upserted, ${allLineItems.length} line items in ${Date.now() - orderStart}ms`
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
