import "server-only";

import type { AgentChatTurn } from "./app-agent-types";
import {
  appendSessionTurn,
  getChannelSession,
  getOrCreateSession,
} from "./agent-runtime/channel-store";
import type { OotbAppId } from "./ootb-apps";

export const PATRON_SESSION_ID = "webchat:patron:main";
export const PATRON_EXTERNAL_CHAT_ID = "patron:main";

export async function ensurePatronSession(routeAppId?: OotbAppId | null) {
  return getOrCreateSession("webchat", PATRON_EXTERNAL_CHAT_ID, routeAppId ?? "my-capital");
}

export async function readPatronHistory(maxTurns = 40): Promise<AgentChatTurn[]> {
  const session = await getChannelSession(PATRON_SESSION_ID);
  if (!session?.history?.length) return [];
  return session.history.slice(-maxTurns);
}

export async function appendPatronTurn(turn: AgentChatTurn, maxHistory = 40) {
  await ensurePatronSession();
  return appendSessionTurn(PATRON_SESSION_ID, turn, maxHistory);
}
