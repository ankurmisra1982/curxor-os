import type { OotbAppId } from "./ootb-apps";

/** Tier C claws — honest preview shells until best-in-class depth ships. */
export const CLAW_PREVIEW_APP_IDS = [
  "my-family",
  "my-vital",
  "my-shop",
  "tesla-optimus-engine",
  "robotaxi-fleet-manager",
] as const;

export type ClawPreviewAppId = (typeof CLAW_PREVIEW_APP_IDS)[number];

export function isPreviewApp(appId: string): appId is ClawPreviewAppId {
  return (CLAW_PREVIEW_APP_IDS as readonly string[]).includes(appId);
}

export function previewAgentPromptBlock(agentName: string): string {
  return `
PREVIEW MODULE:
- ${agentName} is a Tier C preview on CurXor OS — not a full production desk yet.
- Local storage and Claw Context Protocol sync work on-box; advanced orchestration ships in a future release.
- Never imply live smart-home, fleet, commerce, or production hardware routing is available today.
- For Signal Claw: Humanoid Home Hub — teach rules, arm routines, push knowledge; Control tab is mesh preview only.
- For Swarm Claw: Robotaxi fleet vision is preview — operators may plan multi-unit Tesla Robotaxi fleets, but live VIN pairing and on-road dispatch are not available today; grid and simulators only.
- For Arbitrage Claw: multi-channel margin desk preview — Shopify COGS, eBay fulfillment, Printify POD costs merge when eno2 receipts validate. Activate desk preview for GTM; production credentials stay on appliance.
- Guide the operator through honest preview actions (desk preview, channel sync, demo skills, margin briefs).`;
}

export const PREVIEW_FRE_ACTIVATE_TIPS = [
  "Preview mode — local data works; advanced automation ships in a future release.",
  "No Go Live checklist — this module is not a flagship vertical yet.",
  "All context stays on your appliance unless you opt into bridges.",
];

export const PREVIEW_FRE_WELCOME_SUFFIX =
  " You are in preview mode — explore the desk honestly; production depth ships later.";

/** Workspace banner copy for preview desks (full width). */
export function previewWorkspaceBanner(appId: ClawPreviewAppId): { title: string; body: string } {
  switch (appId) {
    case "tesla-optimus-engine":
      return {
        title: "Preview module — Humanoid Home Hub",
        body:
          "Teach house rules, arm routines, and push knowledge to mesh today. Live humanoid pairing and motion control ship when your unit arrives — no false Go Live.",
      };
    case "my-shop":
      return {
        title: "Preview module — Arbitrage Claw · multi-channel desk",
        body:
          "Showcase live margin desk when Shopify, eBay, and Printify sync via eno2 receipts. Still Tier C preview — connect real credentials on your appliance; Activate desk preview runs the GTM showcase in dev.",
      };
    case "robotaxi-fleet-manager":
      return {
        title: "Preview module — Swarm Claw · Robotaxi Fleet",
        body:
          "Train dispatch on the geospatial grid and digital Claws today. Tesla Robotaxi acquisition, VIN roster, and autonomous fleet ops are coming soon — mock units only until Tesla fleet APIs validate on eno2.",
      };
    case "my-vital":
      return {
        title: "Preview module — Vital Claw",
        body:
          "Longevity Lab is live on-box — personalized Q&A, literature RAG, protocol diff, and clinician export. Wearable bridges and lab PDF OCR still ship with eno2 validation.",
      };
    case "my-family":
      return {
        title: "Preview module — Kin",
        body: "Household mapper — profiles and CCP sync work locally; advanced family automation ships later.",
      };
    default:
      return {
        title: "Preview module",
        body: "This Claw is not production-ready. Demo data only.",
      };
  }
}

/** Nav hint for expert mode — keeps mobile nav uncluttered. */
export function previewNavSuffix(appId: OotbAppId): string | null {
  return isPreviewApp(appId) ? " · Soon" : null;
}
