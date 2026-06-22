export const OOTB_APPS = [
  {
    id: "claw-forge",
    name: "The Forge",
    href: "/claw-forge",
    short: "FORGE",
    description:
      "Prompt the local LLM to forge a custom Claw for your niche hustle — wire it to eno2 and deploy in one session.",
  },
  {
    id: "my-capital",
    name: "Capital Claw",
    href: "/my-capital",
    short: "CAP",
    description:
      "Algorithmic trading, crypto sniping, and automated portfolio rebalancing — your alpha stays on bare metal.",
  },
  {
    id: "my-content-creator",
    name: "Creator Claw",
    href: "/my-content",
    short: "CRE",
    description:
      "Draft, adapt, and publish across social channels — video pipelines, engage inbox, calendar, and digital bridges on eno2 with zero API rent.",
  },
  {
    id: "my-work",
    name: "Work Claw",
    href: "/my-work",
    short: "OUT",
    description:
      "Lead scraping, personalized cold email sequencing, and CRM follow-ups — outbound that never sleeps.",
  },
  {
    id: "my-shop",
    name: "Arbitrage Claw",
    href: "/my-shop",
    short: "ARB",
    description:
      "E-commerce price scraping, margin alerts, and automated dropshipping fulfillment — find spread, act instantly.",
  },
  {
    id: "tesla-optimus-engine",
    name: "Signal Claw",
    href: "/optimus",
    short: "SIG",
    description:
      "Ingest market feeds, social mentions, and news triggers — spin up agents the moment alpha appears.",
  },
  {
    id: "robotaxi-fleet-manager",
    name: "Swarm Claw",
    href: "/robotaxi",
    short: "SWARM",
    description:
      "Orchestrate dozens of Claws in parallel — assign workloads, monitor uptime, and scale your digital workforce.",
  },
  {
    id: "claw-cafe",
    name: "Engage Claw",
    href: "/claw-cafe",
    short: "ENG",
    description:
      "Auto-replies, DM triage, and community thread engagement on X and LinkedIn — grow audience while you sleep.",
  },
  {
    id: "my-vital",
    name: "Vital Claw",
    href: "/my-vital",
    short: "VIT",
    description:
      "Longevity desk — wearable vitals, medical reports, diet and health app sync, and a personalized health protocol on your metal.",
  },
  {
    id: "my-family",
    name: "Kin Claw",
    href: "/my-family",
    short: "KIN",
    description:
      "Family profiles — each member's devices, personality, and preferences sync through the Claw Context mesh.",
  },
] as const;

export type OotbAppId = (typeof OOTB_APPS)[number]["id"];

export type OotbApp = (typeof OOTB_APPS)[number];

export function isValidAppId(id: string): id is OotbAppId {
  return OOTB_APPS.some((app) => app.id === id);
}

export function getOotbApp(appId: OotbAppId): OotbApp {
  const app = OOTB_APPS.find((a) => a.id === appId);
  if (!app) throw new Error(`Unknown OOTB app: ${appId}`);
  return app;
}

export const APP_ROUTES = OOTB_APPS.map(({ id, href, name, short }) => ({
  id,
  href,
  name,
  short,
}));

export type AppRouteId = OotbAppId;
