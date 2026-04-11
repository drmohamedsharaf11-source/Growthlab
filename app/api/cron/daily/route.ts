import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { syncMetaCreatives } from "@/lib/meta";
import { syncTikTokCreatives } from "@/lib/tiktok";
import { syncShopifyData } from "@/lib/shopify";
import { computeSellThrough } from "@/lib/sellthrough";
import { sendDailyReport } from "@/lib/email";
import { getPeriodDateRange, formatPeriodLabel } from "@/lib/reports";
import { AlertType } from "@prisma/client";

export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeClients = await prisma.client.findMany({
      where: { status: "ACTIVE" },
      include: {
        adAccounts: true,
        users: { select: { id: true, name: true, email: true, role: true, clientId: true, createdAt: true } },
        products: {
          include: { variants: true },
          orderBy: { totalSold: "desc" },
          take: 4,
        },
      },
    });

    const dateRange = getPeriodDateRange("DAILY");
    const results = [];

    for (const client of activeClients) {
      try {
        // Sync Meta
        if (client.metaAccountId && client.metaAccessToken) {
          const metaAccount = client.adAccounts.find((a) => a.platform === "META");
          if (metaAccount) {
            const creatives = await syncMetaCreatives(
              client.metaAccountId,
              client.metaAccessToken,
              dateRange
            );
            for (const creative of creatives) {
              await prisma.creative.create({
                data: { ...creative, adAccountId: metaAccount.id, date: new Date() },
              });
            }
          }
        }

        // Sync TikTok
        if (client.tiktokAccountId && client.tiktokAccessToken) {
          const tiktokAccount = client.adAccounts.find((a) => a.platform === "TIKTOK");
          if (tiktokAccount) {
            const creatives = await syncTikTokCreatives(
              client.tiktokAccountId,
              client.tiktokAccessToken,
              dateRange
            );
            for (const creative of creatives) {
              await prisma.creative.create({
                data: { ...creative, adAccountId: tiktokAccount.id, date: new Date() },
              });
            }
          }
        }

        // Sync Shopify
        if (client.shopifyDomain && client.shopifyToken) {
          await syncShopifyData(client.shopifyDomain, client.shopifyToken, dateRange);
        }

        // Run alert checks
        for (const product of client.products) {
          for (const variant of product.variants) {
            const sellThrough = computeSellThrough(variant);
            const variantInfo = [variant.size, variant.color].filter(Boolean).join(" / ");

            if (variant.stockLeft === 0) {
              const exists = await prisma.alert.findFirst({
                where: { clientId: client.id, type: AlertType.OUT_OF_STOCK, productName: product.name, variantInfo, read: false },
              });
              if (!exists) {
                await prisma.alert.create({
                  data: {
                    clientId: client.id,
                    type: AlertType.OUT_OF_STOCK,
                    productName: product.name,
                    variantInfo,
                    message: `${product.name} (${variantInfo}) is OUT OF STOCK.`,
                  },
                });
              }
            } else if (sellThrough >= 70) {
              const exists = await prisma.alert.findFirst({
                where: { clientId: client.id, type: AlertType.SELLTHROUGH_70, productName: product.name, variantInfo, read: false },
              });
              if (!exists) {
                await prisma.alert.create({
                  data: {
                    clientId: client.id,
                    type: AlertType.SELLTHROUGH_70,
                    productName: product.name,
                    variantInfo,
                    message: `${product.name} (${variantInfo}) has reached ${sellThrough.toFixed(0)}% sell-through. Only ${variant.stockLeft} units left.`,
                  },
                });
              }
            }
          }
        }

        // Get today's data for email
        const todayCreatives = await prisma.creative.findMany({
          where: { adAccount: { clientId: client.id }, date: { gte: dateRange.start, lte: dateRange.end } },
          orderBy: { roas: "desc" },
        });

        const totalRevenue = todayCreatives.reduce((s, c) => s + c.revenue, 0);
        const adSpend = todayCreatives.reduce((s, c) => s + c.spend, 0);
        const roas = adSpend > 0 ? totalRevenue / adSpend : 0;
        const purchases = todayCreatives.reduce((s, c) => s + c.purchases, 0);

        // Send daily report email
        if (client.reportFrequency.includes("DAILY")) {
          await sendDailyReport(
            { ...client, alerts: [], adAccounts: [] },
            {
              totalRevenue,
              adSpend,
              roas,
              purchases,
              topCreatives: todayCreatives.slice(0, 3).map((c) => ({ ...c, date: c.date })),
              topProducts: client.products.map((p) => ({ ...p, variants: [] })),
              period: formatPeriodLabel(dateRange),
            }
          );
        }

        results.push({ clientId: client.id, name: client.name, status: "success" });
      } catch (err) {
        results.push({
          clientId: client.id,
          name: client.name,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error("Daily cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
