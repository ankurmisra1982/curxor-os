import { HOME_PATH, SETTINGS_PATH } from "./ui-categories";

export interface ContextHint {
  id: string;
  title: string;
  body: string;
}

export const ROUTE_HINTS: Record<string, ContextHint> = {
  [HOME_PATH]: {
    id: "home-welcome",
    title: "Welcome to your appliance",
    body: "Pick a Claw below or ask your agent in plain language. Add or remove Claws anytime in Settings — local AI is the default.",
  },
  [SETTINGS_PATH]: {
    id: "settings-intro",
    title: "Your preferences, your rules",
    body: "Add or remove Claws anytime, optionally connect cloud AI with your API key or sign-in, and tune theme and display mode.",
  },
  "/claw-forge": {
    id: "forge-intro",
    title: "Create a new digital employee",
    body: "Describe what you want in the chat, then tap Forge Claw when you're ready. Prefer GPT or Claude for planning? Connect them in Settings → Intelligence.",
  },
  "/my-capital": {
    id: "capital-intro",
    title: "Paper trading first",
    body: "Research any ticker for price + headlines (Beginner). Standard unlocks charts, WSB chatter, and the market digest. Trades only leave this box when you connect a broker.",
  },
  "/my-content": {
    id: "content-intro",
    title: "Draft before you publish",
    body: "Use Draft Post for local AI copy. Publish goes through your connected social accounts — the AI on this box never posts directly unless you connect a platform.",
  },
  "/my-work": {
    id: "work-intro",
    title: "Your outreach desk",
    body: "Tap a task to focus it. Ask the agent to prioritize your day or tap a skill button. Change enabled Claws in Settings anytime.",
  },
  "/my-shop": {
    id: "shop-intro",
    title: "Arbitrage preview",
    body: "Tier C preview — roadmap and demo ingest at Scout level. Pipeline and margin watch unlock at Flipper+. No live storefront APIs.",
  },
  "/optimus": {
    id: "signal-intro",
    title: "Humanoid Home Hub (preview)",
    body: "Teach your future humanoid — house rules, Kin context, routines, and neural link readiness. Control tab previews motor mesh when hardware pairs.",
  },
  "/my-vital": {
    id: "vital-intro",
    title: "Longevity desk",
    body: "Ask about aging science in the Lab tab. Connect wearables, build your protocol, and share health context with Optimus and Kin — all on your appliance.",
  },
  "/my-family": {
    id: "family-intro",
    title: "Household identity layer",
    body: "Add your partner and kids — Kin gives Optimus guest-aware tone and Vital per-member health context. Preview today; full routing ships with Signal and Vital depth.",
  },
  "/robotaxi": {
    id: "swarm-intro",
    title: "Fleet overview",
    body: "Select a unit in the grid before assigning routes. Dispatch policy stays local on the appliance.",
  },
  "/claw-cafe": {
    id: "cafe-intro",
    title: "Patron Hall",
    body: "Play runs lane kiosk demos. Ascension mirrors cross-Claw events in the pixel room.",
  },
  "/setup": {
    id: "setup-intro",
    title: "First-time setup",
    body: "Three quick steps — we check the box, you pick Claws, then we configure. You can change everything later in Settings.",
  },
};

export function hintForPath(pathname: string): ContextHint | null {
  if (ROUTE_HINTS[pathname]) return ROUTE_HINTS[pathname];
  const base = pathname.split("/").slice(0, 2).join("/") || pathname;
  return ROUTE_HINTS[base] ?? null;
}
