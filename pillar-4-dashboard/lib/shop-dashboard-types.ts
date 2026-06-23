import type { ShopDeskShowcase } from "./shop-desk-showcase";
import type { ShopGrowthProfile } from "./shop-growth";
import type { SkuSpreadRow, SpreadSource } from "./shop-margin-watch";

export type ShopPipelineStage = "INGEST" | "SORT" | "PICK" | "SHIP";

export interface ShopPipelineOrder {
  id: string;
  sku: string;
  stage: ShopPipelineStage;
  eta: string;
  source: string;
}

export interface ShopifyBridgeStatus {
  configured: boolean;
  connected: boolean;
  shopDomain: string | null;
  lastSyncAt: string | null;
  lastReceiptId: string | null;
  lastSyncOk: boolean | null;
  spreadSource: SpreadSource;
}

export interface EbayBridgeStatus {
  configured: boolean;
  connected: boolean;
  environment: "production" | "sandbox" | null;
  lastSyncAt: string | null;
  lastReceiptId: string | null;
  lastSyncOk: boolean | null;
  orderSource: string;
  pipelineOrderCount: number;
}

export interface PrintifyBridgeStatus {
  configured: boolean;
  connected: boolean;
  shopId: string | null;
  shopTitle: string | null;
  lastSyncAt: string | null;
  lastReceiptId: string | null;
  lastSyncOk: boolean | null;
  spreadSource: SpreadSource;
}

export interface ShopDashboardBootstrap {
  ok: true;
  growthProfile: ShopGrowthProfile;
  spreads: SkuSpreadRow[];
  previewMode: true;
  storeName: string;
  spreadSources: SpreadSource[];
  pipelineOrders: ShopPipelineOrder[];
  deskShowcase: ShopDeskShowcase;
  shopify: ShopifyBridgeStatus;
  ebay: EbayBridgeStatus;
  printify: PrintifyBridgeStatus;
}
