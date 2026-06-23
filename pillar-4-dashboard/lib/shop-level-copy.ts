import type { GrowthLevel } from "./os-growth-level";
import { growthLabel } from "./os-growth-level";

const TERMS: Record<GrowthLevel, Record<string, string>> = {
  L1: {
    deskSubtitle: "Preview · learn spreads before any live bridge",
    pipelineLabel: "Demo pipeline",
    marginLabel: "Spread watchlist",
    ordersMetric: "Demo orders",
  },
  L2: {
    deskSubtitle: "Margin watch · demo fulfillment canvas",
    pipelineLabel: "Fulfillment pipeline",
    marginLabel: "SKU spread desk",
    ordersMetric: "Orders today",
  },
  L3: {
    deskSubtitle: "Operator desk · pick/pack/ship preview",
    pipelineLabel: "Fulfillment pipeline",
    marginLabel: "Margin alerts",
    ordersMetric: "Orders today",
  },
  L4: {
    deskSubtitle: "Multi-channel ops · mesh bridge preview",
    pipelineLabel: "Fulfillment pipeline",
    marginLabel: "Channel spread matrix",
    ordersMetric: "Orders today",
  },
  L5: {
    deskSubtitle: "Desk lead · policy and audit preview",
    pipelineLabel: "Fulfillment pipeline",
    marginLabel: "Spread intelligence",
    ordersMetric: "Orders today",
  },
};

export function shopTerm(growthLevel: GrowthLevel, key: string): string {
  return TERMS[growthLevel][key] ?? key;
}

export function shopLevelCopy(growthLevel: GrowthLevel): { label: string; subtitle: string } {
  return {
    label: growthLabel("my-shop", growthLevel),
    subtitle: shopTerm(growthLevel, "deskSubtitle"),
  };
}
