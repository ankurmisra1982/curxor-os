export type CommerceBridgeBuildStatus = "done" | "in_progress" | "planned";

export interface CommerceBridgeBuildStep {
  step: number;
  title: string;
  channel: string;
  status: CommerceBridgeBuildStatus;
  tools: string[];
  summary: string;
}

/** eno2 commerce bridge build order — Wave 1 Shopify read shipped in software. */
export const COMMERCE_BRIDGE_ROADMAP: CommerceBridgeBuildStep[] = [
  {
    step: 0,
    title: "Preview desk",
    channel: "local",
    status: "done",
    tools: [],
    summary: "Demo spreads + honest Coming Soon shell.",
  },
  {
    step: 1,
    title: "Shopify read",
    channel: "shopify",
    status: "done",
    tools: [
      "commerce.shopify.products.list",
      "commerce.shopify.orders.list",
      "commerce.shopify.catalog.sync",
    ],
    summary: "GraphQL Admin read — products, unit cost, recent orders via eno2.",
  },
  {
    step: 2,
    title: "Shopify write",
    channel: "shopify",
    status: "planned",
    tools: ["commerce.shopify.inventory.adjust"],
    summary: "Inventory adjustments after validated read path.",
  },
  {
    step: 3,
    title: "eBay fulfillment read",
    channel: "ebay",
    status: "done",
    tools: ["commerce.ebay.orders.list", "commerce.ebay.fulfillment.sync"],
    summary: "Fulfillment API ingest for flips and collectibles — pipeline + margin spreads.",
  },
  {
    step: 4,
    title: "Printify cost pull",
    channel: "printify",
    status: "done",
    tools: ["commerce.printify.products.list", "commerce.printify.catalog.sync"],
    summary: "POD production cost + retail variant price for margin desk.",
  },
];

export const SHOPIFY_COMMERCE_TOOLS = {
  productsList: "commerce.shopify.products.list",
  ordersList: "commerce.shopify.orders.list",
  catalogSync: "commerce.shopify.catalog.sync",
} as const;

export const EBAY_COMMERCE_TOOLS = {
  ordersList: "commerce.ebay.orders.list",
  fulfillmentSync: "commerce.ebay.fulfillment.sync",
} as const;

export const PRINTIFY_COMMERCE_TOOLS = {
  productsList: "commerce.printify.products.list",
  catalogSync: "commerce.printify.catalog.sync",
} as const;

export function currentCommerceBuildStep(): CommerceBridgeBuildStep {
  return COMMERCE_BRIDGE_ROADMAP.find((s) => s.status === "in_progress") ?? COMMERCE_BRIDGE_ROADMAP[0]!;
}
