import "server-only";

/** Cache TTL for ticker intel (ms). */
export const TICKER_INTEL_TTL_MS = 15 * 60 * 1000;

/** Cache TTL for market digest (ms). */
export const DIGEST_TTL_MS = 30 * 60 * 1000;

/** Alert cooldown — don't re-fire same rule within this window. */
export const INTEL_ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export type IntelDataProviderId =
  | "yahoo"
  | "alpaca_news"
  | "alpaca_corp"
  | "cnbc"
  | "reddit"
  | "x_fintwit"
  | "sec_edgar";

export interface IntelProviderStatus {
  id: IntelDataProviderId;
  label: string;
  available: boolean;
  detail: string;
}

export function isIntelStale(updatedAt: string | null | undefined, ttlMs: number): boolean {
  if (!updatedAt) return true;
  const age = Date.now() - Date.parse(updatedAt);
  return !Number.isFinite(age) || age > ttlMs;
}
