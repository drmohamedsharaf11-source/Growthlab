import { CreativeData, DateRange } from "@/types";
import { Platform } from "@prisma/client";

const META_API_VERSION = "v19.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaAdInsight {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  spend: string;
  purchase_roas: Array<{ action_type: string; value: string }>;
  actions: Array<{ action_type: string; value: string }>;
  ctr: string;
  cpc: string;
  impressions: string;
}

interface MetaCreative {
  id: string;
  name: string;
  thumbnail_url?: string;
  image_url?: string;
}

interface MetaAd {
  id: string;
  name: string;
  creative?: MetaCreative;
  campaign?: { name: string };
}

function formatDateRange(dateRange: DateRange) {
  const format = (d: Date) => d.toISOString().split("T")[0];
  return {
    since: format(dateRange.start),
    until: format(dateRange.end),
  };
}

export async function getCampaigns(
  accountId: string,
  accessToken: string
): Promise<Array<{ id: string; name: string; status: string }>> {
  const url = `${META_BASE_URL}/${accountId}/campaigns`;
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,status,objective",
    limit: "100",
  });

  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error(`Meta API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function getAdInsights(
  accountId: string,
  accessToken: string,
  dateRange: DateRange
): Promise<MetaAdInsight[]> {
  const url = `${META_BASE_URL}/${accountId}/insights`;
  const { since, until } = formatDateRange(dateRange);

  const params = new URLSearchParams({
    access_token: accessToken,
    level: "ad",
    fields: "ad_id,ad_name,campaign_name,spend,purchase_roas,actions,ctr,cpc,impressions",
    time_range: JSON.stringify({ since, until }),
    limit: "100",
  });

  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error(`Meta Insights API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function getAdCreatives(
  accountId: string,
  accessToken: string
): Promise<MetaAd[]> {
  const url = `${META_BASE_URL}/${accountId}/ads`;
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,creative{id,name,thumbnail_url,image_url},campaign{name}",
    limit: "100",
  });

  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error(`Meta Ads API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function syncMetaCreatives(
  accountId: string,
  accessToken: string,
  dateRange: DateRange
): Promise<Omit<CreativeData, "id" | "date">[]> {
  const [insights, ads] = await Promise.all([
    getAdInsights(accountId, accessToken, dateRange),
    getAdCreatives(accountId, accessToken),
  ]);

  // Create a map of ad creatives for quick lookup
  const adMap = new Map<string, MetaAd>();
  for (const ad of ads) {
    adMap.set(ad.id, ad);
  }

  return insights.map((insight) => {
    const ad = adMap.get(insight.ad_id);
    const thumbnailUrl =
      ad?.creative?.thumbnail_url || ad?.creative?.image_url || null;

    const spend = parseFloat(insight.spend) || 0;
    const roasValue = insight.purchase_roas?.[0]?.value
      ? parseFloat(insight.purchase_roas[0].value)
      : 0;
    const revenue = spend * roasValue;

    const purchases =
      parseInt(
        insight.actions?.find((a) => a.action_type === "purchase")?.value || "0"
      ) || 0;

    const ctr = parseFloat(insight.ctr) || 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const impressions = parseInt(insight.impressions) || 0;
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

    return {
      name: insight.ad_name,
      campaignName: insight.campaign_name || ad?.campaign?.name || null,
      thumbnailUrl,
      platform: Platform.META,
      spend,
      revenue,
      roas: roasValue,
      purchases,
      ctr,
      cpa,
      impressions,
      roi,
    };
  });
}
