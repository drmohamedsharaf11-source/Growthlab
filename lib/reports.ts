import prisma from "./prisma";
import { Period, DateRange, KPIData } from "@/types";

export function getPeriodDateRange(period: Period): DateRange {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);

  switch (period) {
    case "DAILY":
      start.setHours(0, 0, 0, 0);
      break;
    case "WEEKLY":
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "BIWEEKLY":
      start.setDate(now.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      break;
    case "MONTHLY":
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}

export function getPreviousPeriodDateRange(period: Period): DateRange {
  const current = getPeriodDateRange(period);
  const duration = current.end.getTime() - current.start.getTime();

  return {
    start: new Date(current.start.getTime() - duration),
    end: new Date(current.end.getTime() - duration),
  };
}

export async function getClientKPIs(
  clientId: string,
  dateRange: DateRange,
  prevDateRange: DateRange
): Promise<KPIData> {
  const [currentCreatives, prevCreatives, products] = await Promise.all([
    prisma.creative.findMany({
      where: {
        adAccount: { clientId },
        date: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    prisma.creative.findMany({
      where: {
        adAccount: { clientId },
        date: { gte: prevDateRange.start, lte: prevDateRange.end },
      },
    }),
    prisma.product.findMany({
      where: { clientId },
    }),
  ]);

  // Current period metrics
  const totalRevenue = currentCreatives.reduce((sum, c) => sum + c.revenue, 0);
  const adSpend = currentCreatives.reduce((sum, c) => sum + c.spend, 0);
  const roas = adSpend > 0 ? totalRevenue / adSpend : 0;
  const purchases = currentCreatives.reduce((sum, c) => sum + c.purchases, 0);
  const impressions = currentCreatives.reduce((sum, c) => sum + c.impressions, 0);
  const conversionRate = impressions > 0 ? (purchases / impressions) * 100 : 0;

  // Previous period metrics
  const prevRevenue = prevCreatives.reduce((sum, c) => sum + c.revenue, 0);
  const prevSpend = prevCreatives.reduce((sum, c) => sum + c.spend, 0);
  const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
  const prevPurchases = prevCreatives.reduce((sum, c) => sum + c.purchases, 0);
  const prevImpressions = prevCreatives.reduce((sum, c) => sum + c.impressions, 0);
  const prevConversionRate = prevImpressions > 0 ? (prevPurchases / prevImpressions) * 100 : 0;

  const calcDelta = (current: number, prev: number): number => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  return {
    totalRevenue,
    adSpend,
    roas,
    conversionRate,
    revenueDelta: calcDelta(totalRevenue, prevRevenue),
    adSpendDelta: calcDelta(adSpend, prevSpend),
    roasDelta: calcDelta(roas, prevRoas),
    conversionDelta: calcDelta(conversionRate, prevConversionRate),
  };
}

export async function getRevenueChartData(
  clientId: string,
  dateRange: DateRange
): Promise<Array<{ date: string; revenue: number; adSpend: number }>> {
  const creatives = await prisma.creative.findMany({
    where: {
      adAccount: { clientId },
      date: { gte: dateRange.start, lte: dateRange.end },
    },
    orderBy: { date: "asc" },
  });

  // Group by date
  const byDate = new Map<string, { revenue: number; adSpend: number }>();

  for (const creative of creatives) {
    const dateKey = creative.date.toISOString().split("T")[0];
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { revenue: 0, adSpend: 0 });
    }
    const data = byDate.get(dateKey)!;
    data.revenue += creative.revenue;
    data.adSpend += creative.spend;
  }

  return Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));
}

export async function getROASByPlatform(
  clientId: string,
  dateRange: DateRange
): Promise<Array<{ platform: string; roas: number }>> {
  const creatives = await prisma.creative.findMany({
    where: {
      adAccount: { clientId },
      date: { gte: dateRange.start, lte: dateRange.end },
    },
  });

  const byPlatform = new Map<string, { revenue: number; spend: number }>();

  for (const creative of creatives) {
    const platform = creative.platform;
    if (!byPlatform.has(platform)) {
      byPlatform.set(platform, { revenue: 0, spend: 0 });
    }
    const data = byPlatform.get(platform)!;
    data.revenue += creative.revenue;
    data.spend += creative.spend;
  }

  return Array.from(byPlatform.entries()).map(([platform, data]) => ({
    platform,
    roas: data.spend > 0 ? data.revenue / data.spend : 0,
  }));
}

export function formatPeriodLabel(dateRange: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = dateRange.start.toLocaleDateString("en-US", opts);
  const end = dateRange.end.toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}
