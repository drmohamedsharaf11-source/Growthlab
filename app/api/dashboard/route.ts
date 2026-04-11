import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPeriodDateRange, getPreviousPeriodDateRange } from "@/lib/reports";
import { Period } from "@/types";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "WEEKLY") as Period;
  const clientId = searchParams.get("clientId");

  // Determine which client to fetch
  let targetClientId: string | null = null;
  if (session.user.role === Role.ADMIN) {
    targetClientId = clientId;
  } else {
    targetClientId = session.user.clientId;
  }

  if (!targetClientId) {
    return NextResponse.json({ error: "No client selected" }, { status: 400 });
  }

  const dateRange = getPeriodDateRange(period);
  const prevDateRange = getPreviousPeriodDateRange(period);

  try {
    const [currentCreatives, prevCreatives, products, alerts] = await Promise.all([
      prisma.creative.findMany({
        where: {
          adAccount: { clientId: targetClientId },
          date: { gte: dateRange.start, lte: dateRange.end },
        },
        orderBy: { roas: "desc" },
      }),
      prisma.creative.findMany({
        where: {
          adAccount: { clientId: targetClientId },
          date: { gte: prevDateRange.start, lte: prevDateRange.end },
        },
      }),
      prisma.product.findMany({
        where: { clientId: targetClientId },
        include: { variants: true },
        orderBy: { totalSold: "desc" },
      }),
      prisma.alert.findMany({
        where: { clientId: targetClientId, read: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // KPI calculations
    const totalRevenue = currentCreatives.reduce((s, c) => s + c.revenue, 0);
    const adSpend = currentCreatives.reduce((s, c) => s + c.spend, 0);
    const roas = adSpend > 0 ? totalRevenue / adSpend : 0;
    const purchases = currentCreatives.reduce((s, c) => s + c.purchases, 0);
    const impressions = currentCreatives.reduce((s, c) => s + c.impressions, 0);
    const conversionRate = impressions > 0 ? (purchases / impressions) * 100 : 0;

    const prevRevenue = prevCreatives.reduce((s, c) => s + c.revenue, 0);
    const prevSpend = prevCreatives.reduce((s, c) => s + c.spend, 0);
    const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
    const prevPurchases = prevCreatives.reduce((s, c) => s + c.purchases, 0);
    const prevImpressions = prevCreatives.reduce((s, c) => s + c.impressions, 0);
    const prevConversionRate = prevImpressions > 0 ? (prevPurchases / prevImpressions) * 100 : 0;

    const calcDelta = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

    // Revenue chart data: group by date
    const chartMap = new Map<string, { revenue: number; adSpend: number }>();
    for (const creative of currentCreatives) {
      const dateKey = creative.date.toISOString().split("T")[0];
      if (!chartMap.has(dateKey)) chartMap.set(dateKey, { revenue: 0, adSpend: 0 });
      const d = chartMap.get(dateKey)!;
      d.revenue += creative.revenue;
      d.adSpend += creative.spend;
    }
    const revenueChart = Array.from(chartMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // ROAS by platform
    const platformMap = new Map<string, { revenue: number; spend: number }>();
    for (const creative of currentCreatives) {
      const p = creative.platform;
      if (!platformMap.has(p)) platformMap.set(p, { revenue: 0, spend: 0 });
      const d = platformMap.get(p)!;
      d.revenue += creative.revenue;
      d.spend += creative.spend;
    }
    const roasByPlatform = Array.from(platformMap.entries()).map(([platform, d]) => ({
      platform,
      roas: d.spend > 0 ? d.revenue / d.spend : 0,
    }));

    return NextResponse.json({
      kpis: {
        totalRevenue,
        adSpend,
        roas,
        conversionRate,
        revenueDelta: calcDelta(totalRevenue, prevRevenue),
        adSpendDelta: calcDelta(adSpend, prevSpend),
        roasDelta: calcDelta(roas, prevRoas),
        conversionDelta: calcDelta(conversionRate, prevConversionRate),
      },
      revenueChart,
      roasByPlatform,
      topCreatives: currentCreatives.slice(0, 5),
      products,
      alerts,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
