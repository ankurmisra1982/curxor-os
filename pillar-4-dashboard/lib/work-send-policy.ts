import "server-only";

import { readAppFreState } from "./app-fre-state";
import { loadDigitalEnv } from "./digital-env";
import type { OutboundSend, WorkQueueFile } from "./work-queue-types";

export type AutoSendPolicy = "immediate" | "deferred";

export interface WorkSendPolicy {
  dailySendLimit: number;
  sendStaggerMinutes: number;
  warmupMode: boolean;
  warmupDailyCap: number;
  effectiveDailyLimit: number;
}

const DEFAULT_POLICY: WorkSendPolicy = {
  dailySendLimit: 50,
  sendStaggerMinutes: 5,
  warmupMode: false,
  warmupDailyCap: 15,
  effectiveDailyLimit: 50,
};

export async function readWorkSendPolicy(): Promise<WorkSendPolicy> {
  const fre = await readAppFreState("my-work");
  const dailyRaw = fre.config.dailySendLimit;
  const staggerRaw = fre.config.sendStaggerMinutes;
  const warmupMode = fre.config.warmupMode === true || fre.config.warmupMode === "true";
  const warmupCapRaw = fre.config.warmupDailyCap;
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
  const warmupDailyCap =
    typeof warmupCapRaw === "number"
      ? warmupCapRaw
      : typeof warmupCapRaw === "string"
        ? Number.parseInt(warmupCapRaw, 10)
        : 15;
  const baseDaily = Number.isFinite(daily) && daily > 0 ? daily : DEFAULT_POLICY.dailySendLimit;
  const cap = Number.isFinite(warmupDailyCap) && warmupDailyCap > 0 ? warmupDailyCap : 15;
  return {
    dailySendLimit: baseDaily,
    sendStaggerMinutes:
      Number.isFinite(stagger) && stagger >= 0 ? stagger : DEFAULT_POLICY.sendStaggerMinutes,
    warmupMode,
    warmupDailyCap: cap,
    effectiveDailyLimit: warmupMode ? Math.min(baseDaily, cap) : baseDaily,
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
  const limit = policy.effectiveDailyLimit ?? policy.dailySendLimit;
  if (today >= limit) {
    return {
      ok: false,
      reason: policy.warmupMode
        ? `Warmup daily cap reached (${limit}/day)`
        : `Daily send limit reached (${limit}/day)`,
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

/** Default false in demo/no SMTP; true when SMTP live unless FRE explicitly sets autoSendOnActivate. */
export async function resolveAutoSendOnActivate(bridgeConfigured?: boolean): Promise<boolean> {
  const fre = await readAppFreState("my-work");
  const raw = fre.config.autoSendOnActivate;
  if (raw === false || raw === "false") return false;
  if (raw === true || raw === "true") return true;
  const bridge = bridgeConfigured ?? (await (async () => {
    const env = await loadDigitalEnv();
    return Boolean(env.SMTP_HOST?.trim() && env.SMTP_FROM?.trim());
  })());
  return bridge;
}

export async function readAutoSendOnActivateFre(): Promise<boolean | null> {
  const fre = await readAppFreState("my-work");
  const raw = fre.config.autoSendOnActivate;
  if (raw === true || raw === "true") return true;
  if (raw === false || raw === "false") return false;
  return null;
}
