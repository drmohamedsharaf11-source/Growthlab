import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { syncMetaCreatives } from "@/lib/meta";
import { syncTikTokCreatives } from "@/lib/tiktok";
import { syncShopifyData } from "@/lib/shopify";
import { sendWeeklyReport } from "@/lib/email";
import { getPeriodDateRange, formatPeriodLabel } from "@/lib/reports";

export async function GET(request: NextRequest) {
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
          take: 5,
        },
      },
    });

    const dateRange = getPeriodDateRange("WEEKLY");
    const results = [];

    for (const client of activeClients) {
      try {
        // Sync all platforms
        if (client.metaAccountId && client.metaAccessToken) {
          const metaAccount = client.adAccounts.find((a) => a.platform === "META");
          if (metaAccount) {
            const creatives = await syncMetaCreatives(client.metaAccountId, client.metaAccessToken, dateRange);
            for (const creative of creatives) {
              await prisma.creative.create({ data: { ...creative, adAccountId: metaAccount.id, date: new Date() } });
            }
          }
        }

        if (client.tiktokAccountId && client.tiktokAccessToken) {
          const tiktokAccount = client.adAccounts.find((a) => a.platform === "TIKTOK");
          if (tiktokAccount) {
            const creatives = await syncTikTokCreatives(client.tiktokAccountId, client.tiktokAccessToken, dateRange);
            for (const creative of creatives) {
              await prisma.creative.create({ data: { ...creative, adAccountId: tiktokAccount.id, date: new Date() } });
            }
          }
        }

        if (client.shopifyDomain && client.shopifyToken) {
          await syncShopifyData(client.shopifyDomain, client.shopifyToken, dateRange);
        }

        const weeklyCreatives = await prisma.creative.findMany({
          where: { adAccount: { clientId: client.id }, date: { gte: dateRange.start, lte: dateRange.end } },
          orderBy: { roas: "desc" },
        });

        const totalRevenue = weeklyCreatives.reduce((s, c) => s + c.revenue, 0);
        const adSpend = weeklyCreatives.reduce((s, c) => s + c.spend, 0);
        const roas = adSpend > 0 ? totalRevenue / adSpend : 0;
        const purchases = weeklyCreatives.reduce((s, c) => s + c.purchases, 0);

        if (client.reportFrequency.includes("WEEKLY")) {
          await sendWeeklyReport(
            { ...client, alerts: [], adAccounts: [] },
            {
              totalRevenue,
              adSpend,
              roas,
              purchases,
              topCreatives: weeklyCreatives.slice(0, 3).map((c) => ({ ...c })),
              topProducts: client.products.map((p) => ({ ...p, variants: [] })),
              period: formatPeriodLabel(dateRange),
            }
          );
        }

        results.push({ clientId: client.id, name: client.name, status: "success" });
      } catch (err) {
        results.push({ clientId: client.id, name: client.name, status: "error", error: err instanceof Error ? err.message : "Unknown" });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error("Weekly cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
