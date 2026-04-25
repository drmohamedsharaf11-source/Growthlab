import { Role, Platform, ClientStatus, AlertType } from "@prisma/client";

export type { Role, Platform, ClientStatus, AlertType };

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId?: string | null;
}

export interface KPIData {
  totalRevenue: number;
  adSpend: number;
  roas: number;
  conversionRate: number;
  revenueDelta: number;
  adSpendDelta: number;
  roasDelta: number;
  conversionDelta: number;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  adSpend: number;
}

export interface ROASDataPoint {
  platform: string;
  roas: number;
  color: string;
}

export interface CreativeData {
  id: string;
  name: string;
  campaignName: string | null;
  thumbnailUrl: string | null;
  platform: Platform;
  spend: number;
  revenue: number;
  roas: number;
  purchases: number;
  ctr: number;
  cpa: number;
  impressions: number;
  roi: number;
  date: Date;
}

export interface ProductData {
  id: string;
  shopifyId: string;
  name: string;
  totalSold: number;
  revenue: number;
  variants: VariantData[];
}

export interface VariantData {
  id: string;
  productId: string;
  shopifyId: string;
  size: string | null;
  color: string | null;
  sold: number;
  stockLeft: number;
  initialStock: number;
  revenue: number;
  sellThrough?: number;
}

export interface AlertData {
  id: string;
  clientId: string;
  type: AlertType;
  productName: string;
  variantInfo: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface ClientData {
  id: string;
  name: string;
  shopifyDomain: string | null;
  shopifyToken?: string | null;
  shopifyConnected?: boolean;
  lastShopifySyncAt?: string | Date | null;
  metaAccountId: string | null;
  metaAccessToken: string | null;
  tiktokAccountId: string | null;
  tiktokAccessToken: string | null;
  reportFrequency: string;
  status: ClientStatus;
  createdAt: Date;
  users?: UserData[];
  products?: ProductData[];
  adAccounts?: AdAccountData[];
  alerts?: AlertData[];
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId: string | null;
  createdAt: Date;
}

export interface AdAccountData {
  id: string;
  clientId: string;
  platform: Platform;
  accountId: string;
  creatives?: CreativeData[];
}

export type Period = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MetaInsight {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  spend: string;
  purchase_roas: Array<{ action_type: string; value: string }>;
  actions: Array<{ action_type: string; value: string }>;
  ctr: string;
  cpc: string;
  impressions: string;
  thumbnail_url?: string;
}

export interface TikTokInsight {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  spend: string;
  roas: string;
  purchase: string;
  ctr: string;
  cpa: string;
  impressions: string;
  image_ids?: string[];
}

export interface ShopifyOrder {
  id: string;
  line_items: ShopifyLineItem[];
  created_at: string;
  financial_status: string;
}

export interface ShopifyLineItem {
  id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  price: string;
  title: string;
  variant_title: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: string;
  title: string;
  option1: string | null;
  option2: string | null;
  inventory_quantity: number;
}

export interface RestockRatio {
  size: string;
  percentage: number;
  sold: number;
  ratio: number;
  restockUnits: number;
}

export type SortField = "roas" | "spend" | "revenue" | "roi" | "purchases";
