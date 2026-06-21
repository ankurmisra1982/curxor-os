import "server-only";

import { randomUUID } from "node:crypto";

import { publishAppContext } from "./claw-context-service";
import type { CapitalIntelSnapshot, TickerIntel } from "./capital-intel-types";

export async function publishTickerIntelMesh(intel: TickerIntel): Promise<void> {
  await publishAppContext("my-capital", "finance", `intel.ticker.${intel.symbol}`, {
    symbol: intel.symbol,
    name: intel.fundamentals.name,
    price: intel.fundamentals.price,
    changePct1d: intel.fundamentals.changePct1d,
    marketCap: intel.fundamentals.marketCap,
    sentiment: intel.sentiment,
    smartTake: intel.smartTake,
    citations: intel.citations ?? [],
    updatedAt: intel.updatedAt,
  });
}

export async function publishDigestMesh(digest: CapitalIntelSnapshot): Promise<void> {
  await publishAppContext("my-capital", "finance", "intel.digest", {
    headlineCount: digest.digest.length,
    featuredTickers: digest.featuredTickers,
    topHeadlines: digest.digest.slice(0, 6).map((d) => ({
      headline: d.headline,
      source: d.source,
      tickers: d.tickers,
      sentiment: d.sentiment,
    })),
    updatedAt: digest.updatedAt,
  });
}

export function intelAlertId(): string {
  return `IAL-${randomUUID().slice(0, 8).toUpperCase()}`;
}
