import "server-only";

import { ensureCapitalQueue } from "./capital-store";
import { ensureContentQueue } from "./content-queue-store";
import type { ActivityFeedRow } from "./activity-feed-types";
import { ensureWorkQueue } from "./work-store";

export const ACTIVITY_FEED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isSince(iso: string, sinceMs: number | null): boolean {
  if (sinceMs == null) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t > sinceMs;
}

function withinWindow(iso: string, windowMs: number): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t >= Date.now() - windowMs;
}

/** Backfill feed rows from desk queue files (UX-2b-ii — existing box data). */
export async function hydrateActivityFromQueues(
  homeSinceMs: number | null,
  windowMs = ACTIVITY_FEED_WINDOW_MS,
): Promise<ActivityFeedRow[]> {
  const [capital, work, content] = await Promise.all([
    ensureCapitalQueue(),
    ensureWorkQueue(),
    ensureContentQueue(),
  ]);

  const rows: ActivityFeedRow[] = [];

  for (const trade of capital.trades) {
    if (trade.status !== "simulated" && trade.status !== "filled" && trade.status !== "submitted") {
      continue;
    }
    const timestamp = trade.filledAt ?? trade.submittedAt ?? trade.createdAt;
    if (!withinWindow(timestamp, windowMs)) continue;
    const mode =
      trade.status === "simulated"
        ? "practice fill"
        : trade.status === "filled"
          ? "filled"
          : "submitted";
    rows.push({
      id: `hydrate:capital:${trade.id}`,
      timestamp,
      claw: "CAPITAL",
      summary: `${trade.action.toUpperCase()} ${trade.qty} ${trade.ticker} · ${mode}`,
      tier: "success",
      href: "/my-capital",
      evidence: trade.id,
      sinceLastVisit: isSince(timestamp, homeSinceMs),
    });
  }

  for (const rule of capital.rules) {
    if (rule.state !== "ARMED") continue;
    const timestamp = rule.updatedAt ?? rule.createdAt;
    if (!withinWindow(timestamp, windowMs)) continue;
    rows.push({
      id: `hydrate:capital:rule:${rule.id}`,
      timestamp,
      claw: "CAPITAL",
      summary: `Rule armed · ${rule.asset} (${rule.name})`,
      tier: "system",
      href: "/my-capital",
      evidence: rule.id,
      sinceLastVisit: isSince(timestamp, homeSinceMs),
    });
  }

  for (const send of work.sends) {
    if (send.status !== "simulated" && send.status !== "sent") continue;
    const timestamp = send.sentAt ?? send.createdAt;
    if (!timestamp || !withinWindow(timestamp, windowMs)) continue;
    rows.push({
      id: `hydrate:work:${send.id}`,
      timestamp,
      claw: "OUTREACH",
      summary:
        send.status === "simulated"
          ? `Simulated send · ${send.subject.slice(0, 64) || send.to}`
          : `Sent · ${send.subject.slice(0, 64) || send.to}`,
      tier: "success",
      href: "/my-work",
      evidence: send.id,
      sinceLastVisit: isSince(timestamp, homeSinceMs),
    });
  }

  for (const post of content.posts) {
    if (post.stage === "PUBLISHED" && post.publishedAt && withinWindow(post.publishedAt, windowMs)) {
      rows.push({
        id: `hydrate:creator:pub:${post.id}`,
        timestamp: post.publishedAt,
        claw: "CREATOR",
        summary: `Published · ${post.platform} · ${post.channel}`,
        tier: "success",
        href: "/my-content",
        evidence: post.id,
        sinceLastVisit: isSince(post.publishedAt, homeSinceMs),
      });
      continue;
    }
    if (post.stage === "SCHEDULED" && post.scheduledAt && withinWindow(post.updatedAt, windowMs)) {
      rows.push({
        id: `hydrate:creator:sched:${post.id}`,
        timestamp: post.updatedAt,
        claw: "CREATOR",
        summary: `Scheduled · ${post.platform} · ${post.channel}`,
        tier: "system",
        href: "/my-content",
        evidence: post.id,
        sinceLastVisit: isSince(post.updatedAt, homeSinceMs),
      });
    }
  }

  rows.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return rows;
}

export function mergeActivityRows(
  eventItems: ActivityFeedRow[],
  hydrated: ActivityFeedRow[],
  limit: number,
): ActivityFeedRow[] {
  const eventEvidence = new Set(
    eventItems.map((row) => row.evidence).filter((value): value is string => Boolean(value)),
  );
  const merged = [
    ...eventItems,
    ...hydrated.filter(
      (row) =>
        !eventEvidence.has(row.evidence ?? "") &&
        !eventItems.some((existing) => existing.id === row.id),
    ),
  ];
  merged.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return merged.slice(0, limit);
}
