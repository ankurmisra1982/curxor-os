import type { ContextualAdSlot } from "./capital-pfm-types";

/** Placeholder contextual ad slots — disabled by default; enable per placement in roadmap v4. */
export function defaultContextualAdSlots(): ContextualAdSlot[] {
  return [
    {
      id: "ad-hysa",
      placement: "pfm_overview",
      sponsor: "Marcus by Goldman Sachs",
      headline: "Earn more on idle cash",
      body: "High-yield savings accounts can boost your emergency fund yield while staying FDIC-insured.",
      ctaLabel: "Compare rates",
      ctaUrl: null,
      disclosure: "Sponsored · Capital Claw does not receive compensation in demo mode",
      enabled: false,
    },
    {
      id: "ad-robo",
      placement: "wealth_plan",
      sponsor: "Betterment",
      headline: "Automate goal-based investing",
      body: "Set a target date and let recurring contributions work toward your down payment or retirement.",
      ctaLabel: "Learn more",
      ctaUrl: null,
      disclosure: "Sponsored · Ads are contextual to your goals and never influence trade execution",
      enabled: false,
    },
    {
      id: "ad-cashback",
      placement: "suggestions",
      sponsor: "Chase Sapphire",
      headline: "Optimize dining spend",
      body: "Your dining category is up 18% MoM — a 3× dining card could offset $40/mo at your current pace.",
      ctaLabel: "See offer",
      ctaUrl: null,
      disclosure: "Sponsored · Suggestions remain independent of ad placement",
      enabled: false,
    },
  ];
}

export function activeAdsForPlacement(
  slots: ContextualAdSlot[],
  placement: ContextualAdSlot["placement"],
): ContextualAdSlot[] {
  return slots.filter((s) => s.placement === placement && s.enabled);
}
