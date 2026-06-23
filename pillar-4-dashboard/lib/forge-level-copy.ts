import type { GrowthLevel } from "./os-growth-level";

import type { ForgeWorkspaceTab } from "./forge-level-gates";

/** Forge persona labels — creation maturity, not operator skill. */
export const FORGE_GROWTH_LABELS: Record<GrowthLevel, string> = {
  L1: "Sketcher",
  L2: "Builder",
  L3: "Smith",
  L4: "Fabricator",
  L5: "Foundry",
};

const TAB_LABELS: Record<ForgeWorkspaceTab, string> = {
  mint: "Mint",
  fleet: "Fleet",
  stacks: "Stacks",
  templates: "Templates",
  import: "Import",
  ops: "Ops",
};

export function forgePersonaLabel(level: GrowthLevel): string {
  return FORGE_GROWTH_LABELS[level];
}

export function forgeTabLabel(tab: ForgeWorkspaceTab): string {
  return TAB_LABELS[tab];
}

const TAB_SUBTITLES: Record<ForgeWorkspaceTab, string> = {
  mint: "Describe intent · choose connection mode · provision",
  fleet: "Unified registry — engine profiles and forged desks",
  stacks: "UMA budget tiers and model recommendations",
  templates: "Framework packs — quick mint with seeded SOUL",
  import: "JSON bundle upload — island or framework adopt",
  ops: "Foundry health — inference, fleet counts, export",
};

const SECTION_SUBTITLES: Partial<Record<string, string>> = {
  intent: "Multimodal chat grounds the wizard before you mint",
  fleet: "Set active engine profile · open forged desks",
  stacks: "Local LLM catalog — economy to performance",
  templates: "Clone Work, Creator, Capital, or kiosk skeletons",
  import: "Offline bundle round-trip — export from Fleet or Ops",
  "go-live": "Demo-ready checklist — no cloud rent required",
  ops: "Fleet operator view — governance scaffold",
};

export function forgeTabSubtitle(tab: ForgeWorkspaceTab): string {
  return TAB_SUBTITLES[tab];
}

export function forgeSectionSubtitle(sectionId: string): string | undefined {
  return SECTION_SUBTITLES[sectionId];
}
