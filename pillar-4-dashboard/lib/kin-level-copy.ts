import type { GrowthLevel } from "./os-growth-level";

export interface KinLevelCopy {
  headline: string;
  subtitle: string;
}

export const KIN_LEVEL_COPY: Record<GrowthLevel, KinLevelCopy> = {
  L1: {
    headline: "One home, many identities",
    subtitle:
      "Add yourself, your partner, and your kids — Optimus and Vital will personalize per person, not per box.",
  },
  L2: {
    headline: "Each person, their own context",
    subtitle:
      "Handles and devices bind to a profile so the mesh knows who is who — the foundation for guest-aware hardware and per-member health.",
  },
  L3: {
    headline: "Claws share household context",
    subtitle:
      "See which Claws read family scope — Signal for Optimus tone, Vital for health routing, Work for scheduling.",
  },
  L4: {
    headline: "Household steward",
    subtitle: "Scopes, child profiles, and defaults — who shares health, work, or finance with which Claw.",
  },
  L5: {
    headline: "Multigenerational household",
    subtitle: "Elder delegation and guest-aware physical interactions when Optimus family mode ships.",
  },
};

export function kinLevelCopy(growth: GrowthLevel): KinLevelCopy {
  return KIN_LEVEL_COPY[growth];
}
