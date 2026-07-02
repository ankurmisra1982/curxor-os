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
    name: "Outreach Claw",
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
      "Humanoid home hub — teach house rules, pass knowledge, and relate before your robot arrives. More robot types later.",
  },
  {
    id: "robotaxi-fleet-manager",
    name: "Swarm Claw",
    href: "/robotaxi",
    short: "SWARM",
    description:
      "Orchestrate digital Claws today — preview path to operating many Tesla Robotaxis as an autonomous fleet from sovereign metal.",
  },
  {
    id: "claw-cafe",
    name: "Claw Cafe",
    href: "/claw-cafe",
    short: "CAFE",
    description:
      "Patron Hall — pixel room, ascension, handshakes, and cross-Claw celebrations. Always on; Engage inbox lives under Creator.",
  },
  {
    id: "my-vital",
    name: "Vital Claw",
    href: "/my-vital",
    short: "VIT",
    description:
      "Longevity desk — wearables, labs, expert Q&A preview (Sinclair, Blueprint), and a personalized health protocol on your metal.",
  },
  {
    id: "my-family",
    name: "Kin",
    href: "/my-family",
    short: "KIN",
    description:
      "Kin — your household on the box. Always-on mapper for profiles, scopes, and devices so Signal, Vital, and every Claw know who is who.",
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
