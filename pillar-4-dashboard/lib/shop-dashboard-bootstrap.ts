import "server-only";

import { isEbayConfigured, readEbayLink } from "./commerce-ebay-store";
import { isPrintifyConfigured, readPrintifyLink } from "./commerce-printify-store";
import { isShopifyConfigured, readShopifyLink } from "./commerce-shopify-store";
import { buildShopDeskShowcase } from "./shop-desk-showcase";
import { buildDemoSkuSpreads } from "./shop-margin-watch";
import { channelConnected, readShopSync } from "./shop-sync-store";
import { buildShopGrowthProfile } from "./shop-growth";
import { readAppFreState } from "./app-fre-state";
import { readUserSettings } from "./user-settings";
import type { ShopDashboardBootstrap, ShopPipelineOrder } from "./shop-dashboard-types";
import type { SpreadSource } from "./shop-margin-watch";

export type {
  ShopDashboardBootstrap,
  ShopifyBridgeStatus,
  EbayBridgeStatus,
  PrintifyBridgeStatus,
} from "./shop-dashboard-types";

const DEMO_PIPELINE: ShopPipelineOrder[] = [
  { id: "ORD-1042", sku: "GEAR-KIT-A", stage: "INGEST", eta: "12s", source: "demo" },
  { id: "ORD-1043", sku: "CLAW-PRIZE-03", stage: "SORT", eta: "4s", source: "demo" },
  { id: "ORD-1044", sku: "ROBOTAXI-MAT", stage: "PICK", eta: "18s", source: "demo" },
];

export async function buildShopDashboardBootstrap(): Promise<ShopDashboardBootstrap> {
  const [fre, settings, shopifyLink, ebayLink, printifyLink, shopSync] = await Promise.all([
    readAppFreState("my-shop"),
    readUserSettings(),
    readShopifyLink(),
    readEbayLink(),
    readPrintifyLink(),
    readShopSync(),
  ]);

  const storeName =
    typeof fre.config.storeName === "string" && fre.config.storeName.trim()
      ? fre.config.storeName.trim()
      : "Arbitrage Desk";

  const growthProfile = buildShopGrowthProfile(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.shopGrowthLevel ?? null,
  );

  const shopifySlice = shopSync?.channels.shopify;
  const ebaySlice = shopSync?.channels.ebay;
  const printifySlice = shopSync?.channels.printify;

  const shopifyConnected = shopifySlice ? channelConnected(shopifySlice) : false;
  const ebayConnected = ebaySlice ? channelConnected(ebaySlice) : false;
  const printifyConnected = printifySlice ? channelConnected(printifySlice) : false;

  const hasLiveSpreads = (shopSync?.mergedSpreads.length ?? 0) > 0;
  const spreads = hasLiveSpreads ? shopSync!.mergedSpreads : buildDemoSkuSpreads(storeName);

  const spreadSources: SpreadSource[] = [];
  if (shopifyConnected) spreadSources.push("shopify");
  if (ebayConnected && (ebaySlice?.spreads.length ?? 0) > 0) spreadSources.push("ebay");
  if (printifyConnected) spreadSources.push("printify");
  if (spreadSources.length === 0) spreadSources.push("demo");

  const pipelineOrders =
    ebayConnected && (ebaySlice?.pipelineOrders.length ?? 0) > 0
      ? ebaySlice!.pipelineOrders
      : DEMO_PIPELINE;

  const [shopifyConfigured, ebayConfigured, printifyConfigured] = await Promise.all([
    isShopifyConfigured(),
    isEbayConfigured(),
    isPrintifyConfigured(),
  ]);

  const shopify: ShopDashboardBootstrap["shopify"] = {
    configured: shopifyConfigured,
    connected: shopifyConnected,
    shopDomain: shopifyLink?.shopDomain ?? shopifySlice?.label ?? null,
    lastSyncAt: shopifyLink?.lastSyncAt ?? shopifySlice?.syncedAt ?? null,
    lastReceiptId: shopifyLink?.lastReceiptId ?? shopifySlice?.receiptId ?? null,
    lastSyncOk: shopifyLink?.lastSyncOk ?? null,
    spreadSource: shopifyConnected ? "shopify" : "demo",
  };

  const ebay: ShopDashboardBootstrap["ebay"] = {
    configured: ebayConfigured,
    connected: ebayConnected,
    environment: ebayLink?.environment ?? (ebaySlice?.label as "production" | "sandbox" | null) ?? null,
    lastSyncAt: ebayLink?.lastSyncAt ?? ebaySlice?.syncedAt ?? null,
    lastReceiptId: ebayLink?.lastReceiptId ?? ebaySlice?.receiptId ?? null,
    lastSyncOk: ebayLink?.lastSyncOk ?? null,
    orderSource: ebayConnected ? "ebay" : "demo",
    pipelineOrderCount: pipelineOrders.length,
  };

  const printify: ShopDashboardBootstrap["printify"] = {
    configured: printifyConfigured,
    connected: printifyConnected,
    shopId: printifyLink?.shopId ?? printifySlice?.label ?? null,
    shopTitle: printifyLink?.shopTitle ?? null,
    lastSyncAt: printifyLink?.lastSyncAt ?? printifySlice?.syncedAt ?? null,
    lastReceiptId: printifyLink?.lastReceiptId ?? printifySlice?.receiptId ?? null,
    lastSyncOk: printifyLink?.lastSyncOk ?? null,
    spreadSource: printifyConnected ? "printify" : "demo",
  };

  const deskShowcase = buildShopDeskShowcase({
    shopify,
    ebay,
    printify,
    spreads,
    pipelineOrderCount: pipelineOrders.length,
    storeName,
  });

  return {
    ok: true,
    growthProfile,
    spreads,
    previewMode: true,
    storeName,
    spreadSources,
    pipelineOrders,
    deskShowcase,
    shopify,
    ebay,
    printify,
  };
}
