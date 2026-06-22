import "server-only";

import { readAppFreState } from "./app-fre-state";
import type { OutboundSend, WorkQueueFile } from "./work-queue-types";

export interface WorkSendPolicy {
  dailySendLimit: number;
  sendStaggerMinutes: number;
}

const DEFAULT_POLICY: WorkSendPolicy = {
  dailySendLimit: 50,
  sendStaggerMinutes: 5,
};

export async function readWorkSendPolicy(): Promise<WorkSendPolicy> {
  const fre = await readAppFreState("my-work");
  const dailyRaw = fre.config.dailySendLimit;
  const staggerRaw = fre.config.sendStaggerMinutes;
  const daily =
    typeof dailyRaw === "number"
      ? dailyRaw
      : typeof dailyRaw === "string"
        ? Number.parseInt(dailyRaw, 10)
        : DEFAULT_POLICY.dailySendLimit;
  const stagger =
    typeof staggerRaw === "number"
      ? staggerRaw
      : typeof staggerRaw === "string"
        ? Number.parseInt(staggerRaw, 10)
        : DEFAULT_POLICY.sendStaggerMinutes;
  return {
    dailySendLimit: Number.isFinite(daily) && daily > 0 ? daily : DEFAULT_POLICY.dailySendLimit,
    sendStaggerMinutes:
      Number.isFinite(stagger) && stagger >= 0 ? stagger : DEFAULT_POLICY.sendStaggerMinutes,
  };
}

function startOfLocalDayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function countSendsToday(sends: OutboundSend[]): number {
  const start = startOfLocalDayMs();
  return sends.filter(
    (s) => (s.status === "sent" || s.status === "simulated") && s.sentAt && Date.parse(s.sentAt) >= start,
  ).length;
}

export function lastSentAtMs(sends: OutboundSend[]): number | null {
  let latest: number | null = null;
  for (const s of sends) {
    if ((s.status !== "sent" && s.status !== "simulated") || !s.sentAt) continue;
    const t = Date.parse(s.sentAt);
    if (latest === null || t > latest) latest = t;
  }
  return latest;
}

export function evaluateSendPolicy(
  file: WorkQueueFile,
  policy: WorkSendPolicy,
): { ok: true } | { ok: false; reason: string; retryAfter: string | null } {
  const today = countSendsToday(file.sends);
  if (today >= policy.dailySendLimit) {
    return {
      ok: false,
      reason: `Daily send limit reached (${policy.dailySendLimit}/day)`,
      retryAfter: null,
    };
  }

  const last = lastSentAtMs(file.sends);
  if (last !== null && policy.sendStaggerMinutes > 0) {
    const waitMs = policy.sendStaggerMinutes * 60_000 - (Date.now() - last);
    if (waitMs > 0) {
      return {
        ok: false,
        reason: `Stagger active — wait ${Math.ceil(waitMs / 60_000)} min between sends`,
        retryAfter: new Date(Date.now() + waitMs).toISOString(),
      };
    }
  }

  return { ok: true };
}
