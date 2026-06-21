import type { OotbAppId } from "../ootb-apps";

/** Shared slash-command routing for Telegram, Slack, and similar gateways. */
const ROUTE_MAP: Record<string, OotbAppId> = {
  capital: "my-capital",
  vital: "my-vital",
  kin: "my-family",
  family: "my-family",
  outreach: "my-work",
  work: "my-work",
  creator: "my-content-creator",
  content: "my-content-creator",
  optimus: "tesla-optimus-engine",
  signal: "tesla-optimus-engine",
  forge: "claw-forge",
  home: "my-capital",
};

const HELP_TEXT =
  "CurXor Channel Gateway — commands: /vital, /capital, /kin, /outreach, /optimus, /forge. Send any message after a command to chat with that Claw.";

export function channelHelpText(): string {
  return HELP_TEXT;
}

function stripBotMention(text: string): string {
  return text.replace(/^<@[^>]+>\s*/, "").trim();
}

export function parseChannelCommand(raw: string): { appId: OotbAppId | null; message: string } {
  const trimmed = stripBotMention(raw.trim());
  const m = trimmed.match(/^\/(\w+)\s*(.*)$/s);
  if (!m) return { appId: null, message: trimmed };
  const cmd = m[1]!.toLowerCase();
  const rest = m[2]?.trim() ?? "";
  if (cmd === "start" || cmd === "help") {
    return { appId: null, message: HELP_TEXT };
  }
  const appId = ROUTE_MAP[cmd] ?? null;
  return { appId, message: rest || (appId ? `Switched to ${cmd} Claw. How can I help?` : trimmed) };
}

/** @deprecated use parseChannelCommand */
export function parseTelegramCommand(text: string): { appId: OotbAppId | null; message: string } {
  return parseChannelCommand(text);
}
