import "server-only";

import { buildOsApprovalInbox } from "./os-approval-inbox";
import type { OsApprovalItem } from "./os-approval-inbox-types";
import { readOsEventLog } from "./os-event-log-store";
import type { OsEventKind, OsEventRecord } from "./os-event-bus-types";
import { readUserSettings, updateUserSettings } from "./user-settings";
import type { ActivityFeedRow, ActivityFeedTier } from "./activity-feed-types";
import {
  ACTIVITY_FEED_WINDOW_MS,
  hydrateActivityFromQueues,
  mergeActivityRows,
} from "./activity-feed-hydrate";

const APP_LABEL: Record<OsApprovalItem["appId"], string> = {
  "my-capital": "CAPITAL",
  "my-work": "OUTREACH",
  "my-content-creator": "CREATOR",
};

const KIND_SUMMARY: Record<OsApprovalItem["kind"], string> = {
  trade: "Trade awaiting your approval",
  send: "Outbound send awaiting approval",
  post: "Post awaiting publish approval",
  reply: "Reply awaiting approval",
};

function isSince(iso: string, sinceMs: number | null): boolean {
  if (sinceMs == null) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t > sinceMs;
}

function approvalRow(item: OsApprovalItem, sinceMs: number | null): ActivityFeedRow {
  return {
    id: `approval:${item.appId}:${item.id}`,
    timestamp: item.at,
    claw: APP_LABEL[item.appId],
    summary: `${item.label} — ${KIND_SUMMARY[item.kind]}`,
    tier: "approval",
    href: item.href,
    evidence: item.detail,
    sinceLastVisit: isSince(item.at, sinceMs),
  };
}

function eventTier(event: OsEventKind): ActivityFeedTier {
  if (event === "go_live.failed" || event === "eno2.down") return "error";
  if (event === "forge.claw_minted") return "success";
  if (event === "ota.available") return "info";
  return "system";
}

function narrateEvent(record: OsEventRecord): { claw: string; summary: string; evidence?: string } {
  const p = record.payload;
  switch (record.event) {
    case "forge.claw_minted":
      return {
        claw: "FORGE",
        summary: `Minted ${typeof p.name === "string" ? p.name : "a new Claw"}`,
        evidence: typeof p.slug === "string" ? p.slug : undefined,
      };
    case "go_live.failed":
      return {
        claw: typeof p.appId === "string" ? String(p.appId).toUpperCase() : "SYSTEM",
        summary: "Go Live checklist blocked — review desk before outbound",
        evidence: typeof p.reason === "string" ? p.reason : undefined,
      };
    case "ota.available":
      return {
        claw: "SYSTEM",
        summary: "OS update available — review in Health when ready",
        evidence: typeof p.version === "string" ? p.version : undefined,
      };
    case "eno2.down":
      return {
        claw: "SYSTEM",
        summary: "Egress paused — outbound bridges on hold; cognition stays local",
        evidence: typeof p.reason === "string" ? p.reason : undefined,
      };
    case "claw.skill_completed":
      return {
        claw:
          typeof p.appId === "string"
            ? p.appId === "my-capital"
              ? "CAPITAL"
              : p.appId === "my-work"
                ? "OUTREACH"
                : p.appId === "my-content-creator"
                  ? "CREATOR"
                  : String(p.appId).replace("my-", "").toUpperCase()
            : "CLAW",
        summary: typeof p.summary === "string" ? p.summary : "Skill completed on your metal",
        evidence: typeof p.evidence === "string" ? p.evidence : typeof p.skillId === "string" ? p.skillId : undefined,
      };
    case "claw.approval_required":
      return {
        claw: typeof p.appId === "string" ? String(p.appId).replace("my-", "").toUpperCase() : "CLAW",
        summary: typeof p.summary === "string" ? p.summary : "Action needs your approval",
        evidence: typeof p.detail === "string" ? p.detail : undefined,
      };
    case "scheduler.heartbeat":
      return {
        claw: "SYSTEM",
        summary: typeof p.summary === "string" ? p.summary : "Scheduler heartbeat — team still running",
      };
    case "bridge.receipt":
      return {
        claw: typeof p.appId === "string" ? String(p.appId).replace("my-", "").toUpperCase() : "BRIDGE",
        summary: typeof p.summary === "string" ? p.summary : "Bridge receipt logged on eno2",
        evidence: typeof p.receiptId === "string" ? p.receiptId : undefined,
      };
    default:
      return { claw: "SYSTEM", summary: record.event };
  }
}

function eventRow(record: OsEventRecord, sinceMs: number | null): ActivityFeedRow {
  const { claw, summary, evidence } = narrateEvent(record);
  return {
    id: record.id,
    timestamp: record.timestamp,
    claw,
    summary,
    tier: eventTier(record.event),
    evidence,
    sinceLastVisit: isSince(record.timestamp, sinceMs),
  };
}

export async function buildActivityFeed(limit = 40): Promise<{
  homeLastVisitedAt: string | null;
  attention: ActivityFeedRow[];
  items: ActivityFeedRow[];
}> {
  const settings = await readUserSettings();
  const homeLastVisitedAt = settings.flightCommand?.homeLastVisitedAt ?? null;
  const sinceMs = homeLastVisitedAt ? Date.parse(homeLastVisitedAt) : null;

  const [inbox, events] = await Promise.all([buildOsApprovalInbox(24), readOsEventLog(80)]);

  const attention = inbox.items.map((item) => approvalRow(item, sinceMs));
  const eventItems = events
    .map((record) => eventRow(record, sinceMs))
    .reverse();
  const hydrated = await hydrateActivityFromQueues(sinceMs, ACTIVITY_FEED_WINDOW_MS);
  const items = mergeActivityRows(eventItems, hydrated, limit);

  return { homeLastVisitedAt, attention, items };
}

export async function markHomeVisited(): Promise<string> {
  const homeLastVisitedAt = new Date().toISOString();
  await updateUserSettings({
    flightCommand: { homeLastVisitedAt },
  });
  return homeLastVisitedAt;
}
