export type SpreadSource = "demo" | "shopify" | "ebay" | "printify";

export interface SkuSpreadRow {
  sku: string;
  label: string;
  channelBuy: string;
  channelSell: string;
  buyPrice: number;
  sellPrice: number;
  marginPct: number;
  alert: boolean;
  source?: SpreadSource;
}

export const SHOP_ROADMAP_WAVES = [
  {
    wave: "Wave 1 · Shopify read",
    status: "now" as const,
    items: ["eno2 commerce.shopify.catalog.sync", "Margin desk from unit cost + price", "Connect strip gated on receipt"],
  },
  {
    wave: "Wave 3 · eBay fulfillment",
    status: "now" as const,
    items: ["eno2 commerce.ebay.fulfillment.sync", "Pipeline tab from Sell Fulfillment API", "Flips & collectibles persona"],
  },
  {
    wave: "Wave 5 · Printify cost pull",
    status: "now" as const,
    items: ["eno2 commerce.printify.catalog.sync", "Production cost vs retail variant", "Fulfillment tab connect strip"],
  },
  {
    wave: "Wave 2 · Multi-channel write",
    status: "next" as const,
    items: ["Shopify inventory adjust", "Printify order create", "Margin alert rules"],
  },
  {
    wave: "Wave 3 · Fulfillment",
    status: "later" as const,
    items: ["Claw pick verification", "Ship bin bridge", "Multi-lane orchestration"],
  },
] as const;

export function buildDemoSkuSpreads(storeName: string): SkuSpreadRow[] {
  const tag = storeName.slice(0, 12);
  return [
    {
      sku: "GEAR-KIT-A",
      label: "Claw starter kit",
      channelBuy: "Wholesale lot",
      channelSell: "Marketplace A",
      buyPrice: 24.5,
      sellPrice: 31.2,
      marginPct: 21.4,
      alert: true,
    },
    {
      sku: "CLAW-PRIZE-03",
      label: "Prize bundle",
      channelBuy: "Liquidator",
      channelSell: "Marketplace B",
      buyPrice: 8.0,
      sellPrice: 11.4,
      marginPct: 29.8,
      alert: true,
    },
    {
      sku: "ROBOTAXI-MAT",
      label: "Desk mat",
      channelBuy: "Supplier CSV",
      channelSell: "Own storefront",
      buyPrice: 12.0,
      sellPrice: 14.1,
      marginPct: 14.9,
      alert: false,
    },
    {
      sku: "NEW-SKU",
      label: `Watch · ${tag}`,
      channelBuy: "Scan pending",
      channelSell: "—",
      buyPrice: 0,
      sellPrice: 0,
      marginPct: 0,
      alert: false,
    },
  ];
}

export function formatMarginPct(pct: number): string {
  if (pct <= 0) return "—";
  return `${pct.toFixed(1)}%`;
}
