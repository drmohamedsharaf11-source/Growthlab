import { PrismaClient, Platform, AlertType, ClientStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await prisma.alert.deleteMany();
  await prisma.creative.deleteMany();
  await prisma.adAccount.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();

  // Create admin user first (no clientId)
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@growthOS.com",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // Create client: PinkRose Egypt
  const client = await prisma.client.create({
    data: {
      name: "PinkRose Egypt",
      shopifyDomain: "pinkroseeg.myshopify.com",
      shopifyToken: "demo_shopify_token_pinkrose",
      metaAccountId: "act_123456789",
      metaAccessToken: "demo_meta_token_pinkrose",
      tiktokAccountId: "7123456789012345678",
      tiktokAccessToken: "demo_tiktok_token_pinkrose",
      reportFrequency: "DAILY_WEEKLY_MONTHLY",
      status: ClientStatus.ACTIVE,
    },
  });
  console.log("✅ Client created:", client.name);

  // Create client user
  const clientPassword = await bcrypt.hash("client123", 12);
  const clientUser = await prisma.user.create({
    data: {
      name: "PinkRose Manager",
      email: "client@pinkrose.com",
      password: clientPassword,
      role: Role.CLIENT,
      clientId: client.id,
    },
  });
  console.log("✅ Client user created:", clientUser.email);

  // Create Ad Accounts
  const metaAccount = await prisma.adAccount.create({
    data: {
      clientId: client.id,
      platform: Platform.META,
      accountId: "act_123456789",
    },
  });

  const tiktokAccount = await prisma.adAccount.create({
    data: {
      clientId: client.id,
      platform: Platform.TIKTOK,
      accountId: "7123456789012345678",
    },
  });
  console.log("✅ Ad accounts created");

  // Create creatives with realistic EGP values
  const creatives = [
    {
      name: "Summer Collection - Floral Dress UGC",
      campaignName: "Summer 2024 - Conversion",
      thumbnailUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop",
      platform: Platform.META,
      adAccountId: metaAccount.id,
      spend: 12500,
      revenue: 125000,
      roas: 10.0,
      purchases: 248,
      ctr: 4.2,
      cpa: 50.4,
      impressions: 185000,
      roi: 900,
    },
    {
      name: "Pink Rose Signature Abaya - Lifestyle",
      campaignName: "Ramadan Collection",
      thumbnailUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=500&fit=crop",
      platform: Platform.META,
      adAccountId: metaAccount.id,
      spend: 18200,
      revenue: 136500,
      roas: 7.5,
      purchases: 195,
      ctr: 3.8,
      cpa: 93.3,
      impressions: 240000,
      roi: 650,
    },
    {
      name: "Wedding Guest Dress - Model Showcase",
      campaignName: "Formal Occasions",
      thumbnailUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop",
      platform: Platform.TIKTOK,
      adAccountId: tiktokAccount.id,
      spend: 9800,
      revenue: 68600,
      roas: 7.0,
      purchases: 132,
      ctr: 5.1,
      cpa: 74.2,
      impressions: 320000,
      roi: 600,
    },
    {
      name: "Casual Chic Set - TikTok Trend",
      campaignName: "Everyday Looks TT",
      thumbnailUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=500&fit=crop",
      platform: Platform.TIKTOK,
      adAccountId: tiktokAccount.id,
      spend: 7600,
      revenue: 45600,
      roas: 6.0,
      purchases: 98,
      ctr: 6.3,
      cpa: 77.6,
      impressions: 410000,
      roi: 500,
    },
    {
      name: "Midi Skirt Collection - Carousel",
      campaignName: "New Arrivals Meta",
      thumbnailUrl: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&h=500&fit=crop",
      platform: Platform.META,
      adAccountId: metaAccount.id,
      spend: 22000,
      revenue: 88000,
      roas: 4.0,
      purchases: 176,
      ctr: 2.9,
      cpa: 125.0,
      impressions: 180000,
      roi: 300,
    },
    {
      name: "Accessories Bundle - Story Ad",
      campaignName: "Accessories Campaign",
      thumbnailUrl: "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=400&h=500&fit=crop",
      platform: Platform.META,
      adAccountId: metaAccount.id,
      spend: 15000,
      revenue: 49500,
      roas: 3.3,
      purchases: 85,
      ctr: 2.1,
      cpa: 176.5,
      impressions: 165000,
      roi: 230,
    },
  ];

  for (const creative of creatives) {
    await prisma.creative.create({ data: creative });
  }
  console.log("✅ Creatives created:", creatives.length);

  // Create Products with variants
  const productsData = [
    {
      shopifyId: "gid://shopify/Product/001",
      name: "Floral Maxi Dress",
      totalSold: 248,
      revenue: 124000,
      variants: [
        { shopifyId: "var_001_xs", size: "XS", color: "Pink Floral", sold: 32, stockLeft: 8, initialStock: 50, revenue: 16000 },
        { shopifyId: "var_001_s", size: "S", color: "Pink Floral", sold: 78, stockLeft: 12, initialStock: 100, revenue: 39000 },
        { shopifyId: "var_001_m", size: "M", color: "Pink Floral", sold: 89, stockLeft: 11, initialStock: 100, revenue: 44500 },
        { shopifyId: "var_001_l", size: "L", color: "Pink Floral", sold: 35, stockLeft: 15, initialStock: 60, revenue: 17500 },
        { shopifyId: "var_001_xl", size: "XL", color: "Pink Floral", sold: 14, stockLeft: 6, initialStock: 25, revenue: 7000 },
      ],
    },
    {
      shopifyId: "gid://shopify/Product/002",
      name: "Signature Abaya",
      totalSold: 195,
      revenue: 136500,
      variants: [
        { shopifyId: "var_002_s", size: "S", color: "Black", sold: 45, stockLeft: 3, initialStock: 50, revenue: 31500 },
        { shopifyId: "var_002_m", size: "M", color: "Black", sold: 82, stockLeft: 4, initialStock: 90, revenue: 57400 },
        { shopifyId: "var_002_l", size: "L", color: "Black", sold: 48, stockLeft: 7, initialStock: 60, revenue: 33600 },
        { shopifyId: "var_002_xl", size: "XL", color: "Black", sold: 20, stockLeft: 10, initialStock: 35, revenue: 14000 },
      ],
    },
    {
      shopifyId: "gid://shopify/Product/003",
      name: "Wedding Guest Dress",
      totalSold: 132,
      revenue: 92400,
      variants: [
        { shopifyId: "var_003_xs", size: "XS", color: "Champagne", sold: 18, stockLeft: 12, initialStock: 35, revenue: 12600 },
        { shopifyId: "var_003_s", size: "S", color: "Champagne", sold: 45, stockLeft: 5, initialStock: 55, revenue: 31500 },
        { shopifyId: "var_003_m", size: "M", color: "Champagne", sold: 52, stockLeft: 0, initialStock: 55, revenue: 36400 },
        { shopifyId: "var_003_l", size: "L", color: "Champagne", sold: 17, stockLeft: 8, initialStock: 28, revenue: 11900 },
      ],
    },
    {
      shopifyId: "gid://shopify/Product/004",
      name: "Casual Chic Co-ord Set",
      totalSold: 98,
      revenue: 58800,
      variants: [
        { shopifyId: "var_004_s", size: "S", color: "Beige", sold: 28, stockLeft: 22, initialStock: 60, revenue: 16800 },
        { shopifyId: "var_004_m", size: "M", color: "Beige", sold: 42, stockLeft: 18, initialStock: 70, revenue: 25200 },
        { shopifyId: "var_004_l", size: "L", color: "Beige", sold: 20, stockLeft: 20, initialStock: 50, revenue: 12000 },
        { shopifyId: "var_004_xl", size: "XL", color: "Beige", sold: 8, stockLeft: 12, initialStock: 25, revenue: 4800 },
      ],
    },
    {
      shopifyId: "gid://shopify/Product/005",
      name: "Satin Midi Skirt",
      totalSold: 76,
      revenue: 38000,
      variants: [
        { shopifyId: "var_005_s", size: "S", color: "Rose Gold", sold: 22, stockLeft: 18, initialStock: 45, revenue: 11000 },
        { shopifyId: "var_005_m", size: "M", color: "Rose Gold", sold: 31, stockLeft: 19, initialStock: 55, revenue: 15500 },
        { shopifyId: "var_005_l", size: "L", color: "Rose Gold", sold: 15, stockLeft: 20, initialStock: 40, revenue: 7500 },
        { shopifyId: "var_005_xl", size: "XL", color: "Rose Gold", sold: 8, stockLeft: 17, initialStock: 30, revenue: 4000 },
      ],
    },
  ];

  for (const productData of productsData) {
    const { variants, ...productFields } = productData;
    const product = await prisma.product.create({
      data: {
        ...productFields,
        clientId: client.id,
        variants: {
          create: variants,
        },
      },
    });
    console.log(`✅ Product created: ${product.name}`);
  }

  // Create alerts
  const floral = await prisma.product.findFirst({ where: { name: "Floral Maxi Dress" } });
  const abaya = await prisma.product.findFirst({ where: { name: "Signature Abaya" } });
  const wedding = await prisma.product.findFirst({ where: { name: "Wedding Guest Dress" } });

  const alertsData = [
    {
      clientId: client.id,
      type: AlertType.OUT_OF_STOCK,
      productName: "Wedding Guest Dress",
      variantInfo: "M / Champagne",
      message: "Wedding Guest Dress (M / Champagne) is OUT OF STOCK. 52 units sold, 0 remaining.",
      read: false,
    },
    {
      clientId: client.id,
      type: AlertType.SELLTHROUGH_70,
      productName: "Signature Abaya",
      variantInfo: "S / Black",
      message: "Signature Abaya (S / Black) has reached 94% sell-through. Only 3 units left.",
      read: false,
    },
    {
      clientId: client.id,
      type: AlertType.SELLTHROUGH_70,
      productName: "Signature Abaya",
      variantInfo: "M / Black",
      message: "Signature Abaya (M / Black) has reached 95% sell-through. Only 4 units left.",
      read: false,
    },
    {
      clientId: client.id,
      type: AlertType.SELLTHROUGH_50,
      productName: "Floral Maxi Dress",
      variantInfo: "S / Pink Floral",
      message: "Floral Maxi Dress (S / Pink Floral) has reached 87% sell-through. Only 12 units left.",
      read: true,
    },
  ];

  for (const alert of alertsData) {
    await prisma.alert.create({ data: alert });
  }
  console.log("✅ Alerts created:", alertsData.length);

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📧 Login credentials:");
  console.log("   Admin: admin@growthOS.com / admin123");
  console.log("   Client: client@pinkrose.com / client123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
