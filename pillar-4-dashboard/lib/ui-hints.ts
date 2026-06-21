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
    body: "Pick a Claw below or ask your agent in plain language. Add or remove Claws anytime in Settings — local inference is the default.",
  },
  [SETTINGS_PATH]: {
    id: "settings-intro",
    title: "Your preferences, your rules",
    body: "Add or remove Claws anytime, connect a frontier LLM with your API key or OAuth sign-in (OpenAI), and tune theme and display mode.",
  },
  "/claw-forge": {
    id: "forge-intro",
    title: "Create a new digital employee",
    body: "Describe what you want in the chat, then tap Forge Claw when you're ready. Prefer GPT or Claude for planning? Connect them in Settings → Intelligence.",
  },
  "/my-capital": {
    id: "capital-intro",
    title: "Paper trading first",
    body: "Portfolio loads from your FRE watchlist — live when Alpaca paper creds are in digital.env. Optional frontier models for planning: Settings → Intelligence (API key or OAuth). Trades egress only through eno2.",
  },
  "/my-content": {
    id: "content-intro",
    title: "Draft before you publish",
    body: "Use Draft Post for local LLM copy. Publish sends intent to the bridge — your LLM never touches the internet unless you opt into frontier chat in Settings.",
  },
  "/my-work": {
    id: "work-intro",
    title: "Your outreach desk",
    body: "Tap a task to focus it. Ask the agent to prioritize your day or tap a skill button. Change enabled Claws in Settings anytime.",
  },
  "/my-shop": {
    id: "shop-intro",
    title: "Order pipeline",
    body: "Select an order row, then use skills to advance stages. Physical picks publish to your claw mesh when connected.",
  },
  "/optimus": {
    id: "signal-intro",
    title: "Optimus + signals",
    body: "Signal Claw drives Optimus hardware and ingests feeds. It subscribes to the Claw Context mesh — health, work, and family from Vital and Kin Claws.",
  },
  "/my-vital": {
    id: "vital-intro",
    title: "Longevity desk",
    body: "Connect wearables and health apps via bridges. Vital Claw builds your protocol and publishes health context to Optimus and Kin Claw.",
  },
  "/my-family": {
    id: "family-intro",
    title: "Household hub",
    body: "Add family members, bind devices, and set personalities. Kin Claw syncs profiles to every subscribed Claw on the mesh.",
  },
  "/robotaxi": {
    id: "swarm-intro",
    title: "Fleet overview",
    body: "Select a unit in the grid before assigning routes. Dispatch policy stays local on the appliance.",
  },
  "/claw-cafe": {
    id: "engage-intro",
    title: "Engagement lanes",
    body: "Pick a lane and use Drop Claw to queue the next reply. Great for demos and community threads.",
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
