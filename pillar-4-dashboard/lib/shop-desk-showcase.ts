import type {
  EbayBridgeStatus,
  PrintifyBridgeStatus,
  ShopifyBridgeStatus,
  ShopDashboardBootstrap,
} from "./shop-dashboard-types";
import type { SkuSpreadRow } from "./shop-margin-watch";

export type ShopDeskShowcaseMode = "empty" | "partial" | "live";

export interface ShopChannelDeskCell {
  id: "shopify" | "ebay" | "printify";
  label: string;
  role: string;
  connected: boolean;
  detail: string | null;
  lastSyncAt: string | null;
}

export interface ShopDeskShowcase {
  mode: ShopDeskShowcaseMode;
  connectedChannelCount: number;
  totalChannels: number;
  spreadCount: number;
  liveSpreadCount: number;
  pipelineOrderCount: number;
  channels: ShopChannelDeskCell[];
  headline: string;
  subline: string;
}

const CHANNEL_META = [
  { id: "shopify" as const, label: "Shopify", role: "Storefront · unit cost + price" },
  { id: "ebay" as const, label: "eBay", role: "Fulfillment · pipeline ingest" },
  { id: "printify" as const, label: "Printify", role: "POD · production vs retail" },
];

export function buildShopDeskShowcase(input: {
  shopify: ShopifyBridgeStatus;
  ebay: EbayBridgeStatus;
  printify: PrintifyBridgeStatus;
  spreads: SkuSpreadRow[];
  pipelineOrderCount: number;
  storeName: string;
}): ShopDeskShowcase {
  const { shopify, ebay, printify, spreads, pipelineOrderCount, storeName } = input;

  const channels: ShopChannelDeskCell[] = [
    {
      id: "shopify",
      label: CHANNEL_META[0]!.label,
      role: CHANNEL_META[0]!.role,
      connected: shopify.connected,
      detail: shopify.shopDomain,
      lastSyncAt: shopify.lastSyncAt,
    },
    {
      id: "ebay",
      label: CHANNEL_META[1]!.label,
      role: CHANNEL_META[1]!.role,
      connected: ebay.connected,
      detail: ebay.environment ? `${ebay.environment} · ${ebay.pipelineOrderCount} orders` : null,
      lastSyncAt: ebay.lastSyncAt,
    },
    {
      id: "printify",
      label: CHANNEL_META[2]!.label,
      role: CHANNEL_META[2]!.role,
      connected: printify.connected,
      detail: printify.shopTitle ?? printify.shopId,
      lastSyncAt: printify.lastSyncAt,
    },
  ];

  const connectedChannelCount = channels.filter((c) => c.connected).length;
  const liveSpreadCount = spreads.filter((s) => s.source && s.source !== "demo").length;

  let mode: ShopDeskShowcaseMode = "empty";
  if (connectedChannelCount >= 3) mode = "live";
  else if (connectedChannelCount > 0) mode = "partial";

  const headline =
    mode === "live"
      ? "Live multi-channel arbitrage desk"
      : mode === "partial"
        ? "Multi-channel desk · partial sync"
        : "Multi-channel desk · preview";

  const subline =
    mode === "live"
      ? `${storeName} · ${connectedChannelCount} channels receipt-validated via eno2 · ${liveSpreadCount} live margin rows · ${pipelineOrderCount} pipeline orders. Preview module — production egress stays on your appliance.`
      : mode === "partial"
        ? `${connectedChannelCount} of 3 channels synced — connect and sync remaining strips to complete the live desk preview.`
        : `Connect Shopify, eBay, and Printify on your appliance, or run Activate desk preview to showcase the sovereign margin desk.`;

  return {
    mode,
    connectedChannelCount,
    totalChannels: 3,
    spreadCount: spreads.length,
    liveSpreadCount,
    pipelineOrderCount,
    channels,
    headline,
    subline,
  };
}

export function pickDeskShowcaseFields(
  boot: ShopDashboardBootstrap,
): ShopDeskShowcase {
  return buildShopDeskShowcase({
    shopify: boot.shopify,
    ebay: boot.ebay,
    printify: boot.printify,
    spreads: boot.spreads,
    pipelineOrderCount: boot.pipelineOrders.length,
    storeName: boot.storeName,
  });
}
