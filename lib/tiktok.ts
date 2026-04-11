import { CreativeData, DateRange } from "@/types";
import { Platform } from "@prisma/client";

const TIKTOK_API_VERSION = "v1.3";
const TIKTOK_BASE_URL = `https://business-api.tiktok.com/open_api/${TIKTOK_API_VERSION}`;

interface TikTokInsightData {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  spend: string;
  purchase: string;
  value: string;
  ctr: string;
  cpa: string;
  impressions: string;
}

interface TikTokCreative {
  ad_id: string;
  ad_name: string;
  image_ids?: string[];
  video_id?: string;
  thumbnail_url?: string;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function getCampaigns(
  accountId: string,
  accessToken: string
): Promise<Array<{ campaign_id: string; campaign_name: string; status: string }>> {
  const url = `${TIKTOK_BASE_URL}/campaign/get/`;
  const params = new URLSearchParams({
    advertiser_id: accountId,
    fields: JSON.stringify(["campaign_id", "campaign_name", "status"]),
  });

  const response = await fetch(`${url}?${params}`, {
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TikTok Campaigns API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.list || [];
}

export async function getAdInsights(
  accountId: string,
  accessToken: string,
  dateRange: DateRange
): Promise<TikTokInsightData[]> {
  const url = `${TIKTOK_BASE_URL}/report/integrated/get/`;

  const body = {
    advertiser_id: accountId,
    report_type: "BASIC",
    data_level: "AUCTION_AD",
    dimensions: ["ad_id"],
    metrics: [
      "spend",
      "purchase",
      "value",
      "ctr",
      "cpa",
      "impressions",
      "ad_name",
      "campaign_name",
    ],
    start_date: formatDate(dateRange.start),
    end_date: formatDate(dateRange.end),
    page_size: 100,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`TikTok Insights API error: ${response.status}`);
  }

  const data = await response.json();
  const list = data.data?.list || [];
  return list.map((item: { dimensions: { ad_id: string }; metrics: TikTokInsightData }) => ({
    ad_id: item.dimensions?.ad_id,
    ...item.metrics,
  }));
}

export async function getAdCreatives(
  accountId: string,
  accessToken: string
): Promise<TikTokCreative[]> {
  const url = `${TIKTOK_BASE_URL}/ad/get/`;
  const params = new URLSearchParams({
    advertiser_id: accountId,
    fields: JSON.stringify(["ad_id", "ad_name", "image_ids", "video_id"]),
  });

  const response = await fetch(`${url}?${params}`, {
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TikTok Creatives API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.list || [];
}

export async function syncTikTokCreatives(
  accountId: string,
  accessToken: string,
  dateRange: DateRange
): Promise<Omit<CreativeData, "id" | "date">[]> {
  const [insights, creatives] = await Promise.all([
    getAdInsights(accountId, accessToken, dateRange),
    getAdCreatives(accountId, accessToken),
  ]);

  const creativeMap = new Map<string, TikTokCreative>();
  for (const creative of creatives) {
    creativeMap.set(creative.ad_id, creative);
  }

  return insights.map((insight) => {
    const creative = creativeMap.get(insight.ad_id);
    const thumbnailUrl = creative?.thumbnail_url || null;

    const spend = parseFloat(insight.spend) || 0;
    const revenue = parseFloat(insight.value) || 0;
    const roas = spend > 0 ? revenue / spend : 0;
    const purchases = parseInt(insight.purchase) || 0;
    const ctr = parseFloat(insight.ctr) || 0;
    const cpa = parseFloat(insight.cpa) || 0;
    const impressions = parseInt(insight.impressions) || 0;
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

    return {
      name: insight.ad_name,
      campaignName: insight.campaign_name || null,
      thumbnailUrl,
      platform: Platform.TIKTOK,
      spend,
      revenue,
      roas,
      purchases,
      ctr,
      cpa,
      impressions,
      roi,
    };
  });
}
