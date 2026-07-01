import "server-only";

import { buildOsApprovalInbox } from "./os-approval-inbox";
import { ensureCapitalQueue } from "./capital-store";
import { listApprovalQueue } from "./content-approval-service";
import type { OotbAppId } from "./ootb-apps";
import { stripUniversalFromSelected } from "./ol1-layer";

export type TeamClawState = "idle" | "running" | "awaiting" | "paused";

export interface TeamStatusRow {
  appId: OotbAppId;
  label: string;
  state: TeamClawState;
  detail?: string;
}

const LABEL: Partial<Record<OotbAppId, string>> = {
  "my-capital": "Capital",
  "my-content-creator": "Creator",
  "my-work": "Outreach",
  "my-shop": "Arbitrage",
  "robotaxi-fleet-manager": "Swarm",
  "my-vital": "Vital",
  "claw-forge": "Forge",
};

export async function buildTeamStatus(selectedApps: OotbAppId[]): Promise<TeamStatusRow[]> {
  const operate = stripUniversalFromSelected(selectedApps);
  const [inbox, capital, creator] = await Promise.all([
    buildOsApprovalInbox(48),
    ensureCapitalQueue().catch(() => null),
    listApprovalQueue().catch(() => ({ posts: [], replies: [] })),
  ]);

  const approvalCounts = new Map<OotbAppId, number>();
  for (const item of inbox.items) {
    approvalCounts.set(item.appId, (approvalCounts.get(item.appId) ?? 0) + 1);
  }

  const capitalPending =
    capital?.trades.filter((t) => t.status === "pending_approval").length ?? 0;
  if (capitalPending > 0) {
    approvalCounts.set("my-capital", (approvalCounts.get("my-capital") ?? 0) + capitalPending);
  }

  const creatorPending = (creator.posts?.length ?? 0) + (creator.replies?.length ?? 0);
  if (creatorPending > 0) {
    approvalCounts.set("my-content-creator", (approvalCounts.get("my-content-creator") ?? 0) + creatorPending);
  }

  const rows: TeamStatusRow[] = [];
  const ids = new Set<OotbAppId>([...operate, "claw-forge"]);

  for (const appId of ids) {
    const awaiting = (approvalCounts.get(appId) ?? 0) > 0;
    const paused = appId === "my-capital" && capital?.tradingPaused === true;
    rows.push({
      appId,
      label: LABEL[appId] ?? appId,
      state: paused ? "paused" : awaiting ? "awaiting" : "idle",
      detail: awaiting ? `${approvalCounts.get(appId)} need you` : paused ? "Trading paused" : undefined,
    });
  }

  return rows.sort((a, b) => {
    const rank = (s: TeamClawState) => (s === "awaiting" ? 0 : s === "paused" ? 1 : 2);
    return rank(a.state) - rank(b.state) || a.label.localeCompare(b.label);
  });
}
