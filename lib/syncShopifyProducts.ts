import prisma from "@/lib/prisma";
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

  // Phase 4: load all existing DB records in 2 bulk queries
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

  const PRODUCT_BATCH = 10;
  const VARIANT_BATCH = 20;
  const productTotalBatches = Math.ceil(mapped.length / PRODUCT_BATCH);

  // Phase 5: upsert products in batches of 10 via $transaction
  type ProductResult = { product: { id: string; shopifyId: string }; variants: MappedVariant[] };
  const productResults: ProductResult[] = [];

  for (let i = 0; i < mapped.length; i += PRODUCT_BATCH) {
    const batchNum = Math.floor(i / PRODUCT_BATCH) + 1;
    const batchStart = Date.now();
    const batch = mapped.slice(i, i + PRODUCT_BATCH);

    const results = await prisma.$transaction(
      batch.map(({ variants: _v, ...fields }) => {
        const existingId = productIdMap.get(fields.shopifyId);
        return existingId
          ? prisma.product.update({
              where: { id: existingId },
              data: { name: fields.name, totalSold: fields.totalSold, revenue: fields.revenue },
            })
          : prisma.product.create({ data: { ...fields, clientId } });
      })
    );

    console.log(
      `[sync] products batch ${batchNum}/${productTotalBatches}, ${Date.now() - batchStart}ms`
    );

    for (let j = 0; j < results.length; j++) {
      productResults.push({ product: results[j], variants: batch[j].variants });
    }
  }

  // Phase 6: collect all variant pairs, then upsert in batches of 20
  type VariantPair = { productId: string; variant: MappedVariant };
  const allVariantPairs: VariantPair[] = productResults.flatMap(({ product, variants }) =>
    variants.map((variant) => ({ productId: product.id, variant }))
  );

  const variantTotalBatches = Math.ceil(allVariantPairs.length / VARIANT_BATCH);

  for (let i = 0; i < allVariantPairs.length; i += VARIANT_BATCH) {
    const batchNum = Math.floor(i / VARIANT_BATCH) + 1;
    const batchStart = Date.now();
    const batch = allVariantPairs.slice(i, i + VARIANT_BATCH);

    await prisma.$transaction(
      batch.map(({ productId, variant }) => {
        const existing = variantIdMap.get(`${productId}:${variant.shopifyId}`);
        return existing
          ? prisma.variant.update({
              where: { id: existing.id },
              data: {
                sold: variant.sold,
                stockLeft: variant.stockLeft,
                initialStock: Math.max(existing.initialStock, variant.initialStock),
                revenue: variant.revenue,
              },
            })
          : prisma.variant.create({ data: { ...variant, productId } });
      })
    );

    console.log(
      `[sync] variants batch ${batchNum}/${variantTotalBatches}, ${Date.now() - batchStart}ms`
    );
  }

  // Stamp sync time
  await prisma.client.update({
    where: { id: clientId },
    data: { lastShopifySyncAt: new Date() },
  });

  const elapsed = Date.now() - start;
  console.log(`[sync/shopify] client=${clientId} products=${mapped.length} elapsed=${elapsed}ms`);

  return { synced: mapped.length, elapsed };
}
