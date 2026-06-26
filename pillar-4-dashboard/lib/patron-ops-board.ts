import "server-only";

import { listChannelSessions } from "./agent-runtime/channel-store";
import type { ChannelType } from "./agent-runtime/channel-types";
import { buildOsApprovalInbox } from "./os-approval-inbox";
import { listEngageSuggestions } from "./content-engage-bridge";
import { getOotbApp } from "./ootb-apps";
import type { PatronOpsBoard, PatronOpsColumn, PatronOpsItem } from "./patron-ops-board-types";

export type { PatronOpsBoard, PatronOpsColumn, PatronOpsItem } from "./patron-ops-board-types";
export { patronOpsColumnLabel, PATRON_OPS_COLUMN_ORDER } from "./patron-ops-board-types";

const CHANNEL_LABEL: Record<ChannelType, string> = {
  telegram: "Telegram",
  slack: "Slack",
  whatsapp: "WhatsApp",
  imessage: "iMessage",
  webchat: "Dashboard",
};

export async function buildPatronOpsBoard(): Promise<PatronOpsBoard> {
  const [approvals, sessions, engagePending] = await Promise.all([
    buildOsApprovalInbox(20),
    listChannelSessions(),
    listEngageSuggestions(true),
  ]);

  const columns: Record<PatronOpsColumn, PatronOpsItem[]> = {
    needs_you: [],
    in_progress: [],
    waiting_confirm: [],
    closed: [],
  };

  for (const item of approvals.items) {
    const app = getOotbApp(item.appId);
    columns.waiting_confirm.push({
      id: `approval:${item.id}`,
      column: "waiting_confirm",
      title: item.label,
      detail: item.detail,
      href: item.href,
      clawShort: app.short,
      at: item.at,
    });
  }

  for (const suggestion of engagePending.slice(0, 6)) {
    columns.needs_you.push({
      id: `engage:${suggestion.id}`,
      column: "needs_you",
      title: `Engage · ${suggestion.platform ?? suggestion.channel}`,
      detail: suggestion.text.slice(0, 120) || "Reply suggestion pending",
      href: "/claw-cafe",
      clawShort: "ENG",
      at: suggestion.createdAt,
    });
  }

  const rankedSessions = sessions
    .filter((s) => s.id !== "webchat:patron:main")
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  for (const session of rankedSessions.slice(0, 8)) {
    const app = getOotbApp(session.appId);
    const isExternal = session.channel !== "webchat";
    const channelLabel = CHANNEL_LABEL[session.channel] ?? session.channel;
    columns[isExternal ? "needs_you" : "in_progress"].push({
      id: `session:${session.id}`,
      column: isExternal ? "needs_you" : "in_progress",
      title: session.lastPreview?.slice(0, 72) || `${app.name} thread`,
      detail: `${channelLabel} · ${app.name}`,
      href: routeForApp(session.appId),
      clawShort: app.short,
      at: session.updatedAt,
    });
  }

  if (columns.needs_you.length === 0 && columns.waiting_confirm.length === 0) {
    columns.needs_you.push({
      id: "stub:clear",
      column: "needs_you",
      title: "Queue clear",
      detail: "No urgent items — ask Patron for a brief or open a Claw desk.",
      href: null,
      clawShort: null,
      at: new Date().toISOString(),
    });
  }

  columns.closed.push({
    id: "stub:closed",
    column: "closed",
    title: "Recent completions",
    detail: "Closed items will appear here as MA-COS matures (CH3+).",
    href: null,
    clawShort: null,
    at: new Date().toISOString(),
  });

  const topActions = [...columns.needs_you, ...columns.waiting_confirm]
    .filter((i) => !i.id.startsWith("stub:"))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 3);

  return {
    columns,
    topActions,
    stats: {
      pendingApprovals: approvals.total,
      channelSessions: sessions.length,
      engagePending: engagePending.length,
    },
  };
}

function routeForApp(appId: string): string {
  const routes: Record<string, string> = {
    "my-capital": "/my-capital",
    "my-vital": "/my-vital",
    "my-family": "/my-family",
    "my-work": "/my-work",
    "my-content-creator": "/my-content",
    "my-shop": "/my-shop",
    "tesla-optimus-engine": "/optimus",
    "robotaxi-fleet-manager": "/robotaxi",
    "claw-cafe": "/claw-cafe",
    "claw-forge": "/claw-forge",
  };
  return routes[appId] ?? "/home";
}
