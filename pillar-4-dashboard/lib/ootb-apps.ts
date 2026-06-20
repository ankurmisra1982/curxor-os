export const OOTB_APPS = [
  {
    id: "my-work",
    name: "My Work",
    description:
      "Your personal command center for daily tasks, notes, and local AI assistance — all on your appliance.",
  },
  {
    id: "my-shop",
    name: "My Shop",
    description:
      "Run a small storefront or inventory desk with offline tools for orders, stock, and customer pickup.",
  },
  {
    id: "tesla-optimus-engine",
    name: "Tesla Optimus Engine",
    description:
      "Humanoid motion planning and safety orchestration for Optimus-class units on your local mesh.",
  },
  {
    id: "robotaxi-fleet-manager",
    name: "Robotaxi Fleet Manager",
    description:
      "See every vehicle at a glance, assign routes, and monitor fleet health without leaving the building.",
  },
  {
    id: "claw-cafe",
    name: "Claw Cafe",
    description:
      "A playful claw-bot kiosk experience — grab prizes, run demos, and delight guests at events.",
  },
  {
    id: "my-content-creator",
    name: "My Content Creator",
    description:
      "Manage social channels, headless video pipelines, and post queues — drafted and scheduled on your appliance.",
  },
  {
    id: "my-capital",
    name: "My Capital",
    description:
      "Build flexible investment rules for stocks and crypto, monitor portfolios, and run automated strategies locally.",
  },
  {
    id: "claw-forge",
    name: "Claw Forge",
    description:
      "Design new claw bots in natural language — describe goals, attach photos, or pull live vision, then deploy locally.",
  },
] as const;

export type OotbAppId = (typeof OOTB_APPS)[number]["id"];

export function isValidAppId(id: string): id is OotbAppId {
  return OOTB_APPS.some((app) => app.id === id);
}
