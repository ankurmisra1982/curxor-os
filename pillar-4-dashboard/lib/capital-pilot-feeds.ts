import "server-only";

import { fetchSecEdgarFilings, fetchSecForm4Filings } from "./capital-sec-edgar";
import { fetchQuiverCongressFeed, isQuiverConfigured } from "./capital-quiver-feeds";
import type { CapitalPilot, PilotHolding } from "./capital-queue-types";
import { PILOT_CATALOG } from "./capital-pilot-catalog";
import { ensureCapitalQueue, writeCapitalFilePartial } from "./capital-store";

const HF_CIK_QUERIES = ["BRK", "ARK", "BlackRock", "Vanguard", "Citadel"];

function weightsFromCounts(counts: Map<string, number>, max = 8): PilotHolding[] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, max);
  const total = sorted.reduce((s, [, c]) => s + c, 0) || 1;
  const holdings = sorted.map(([symbol, c]) => ({
    symbol,
    weightPct: Math.round((c / total) * 100),
  }));
  const sum = holdings.reduce((s, h) => s + h.weightPct, 0);
  if (holdings.length && sum !== 100) {
    holdings[0]!.weightPct += 100 - sum;
  }
  return holdings.length ? holdings : [{ symbol: "SPY", weightPct: 100 }];
}

export async function buildCongressDisclosureHoldings(): Promise<{
  holdings: PilotHolding[];
  feedSource: CapitalPilot["feedSource"];
  feedNote: string;
  disclosureLagDays: number | null;
  recentDisclosures: CapitalPilot["recentDisclosures"];
}> {
  if (isQuiverConfigured()) {
    const quiver = await fetchQuiverCongressFeed();
    if (quiver.source === "quiver" && quiver.trades.length > 0) {
      return {
        holdings: quiver.holdings,
        feedSource: "live_quiver",
        feedNote: quiver.note,
        disclosureLagDays: quiver.avgDisclosureLagDays,
        recentDisclosures: quiver.trades.map((t) => ({
          ticker: t.ticker,
          tradedAt: t.tradedAt,
          filedAt: t.filedAt,
          lagDays: t.lagDays,
          politician: t.politician,
        })),
      };
    }
  }

  const items = await fetchSecForm4Filings();
  const counts = new Map<string, number>();
  for (const item of items) {
    const match = item.title.match(/\b([A-Z]{1,5})\b/g);
    if (!match) continue;
    for (const sym of match) {
      if (sym.length >= 2 && sym.length <= 5 && !["SEC", "FORM"].includes(sym)) {
        counts.set(sym, (counts.get(sym) ?? 0) + 1);
      }
    }
  }
  const fromNews = await fetchSecForm4Filings("NVDA");
  for (const n of fromNews) {
    const tickers = n.excerpt.match(/\b[A-Z]{2,5}\b/g) ?? [];
    for (const sym of tickers.slice(0, 1)) {
      counts.set(sym, (counts.get(sym) ?? 0) + 2);
    }
  }
  return {
    holdings: weightsFromCounts(counts),
    feedSource: "live_sec",
    feedNote: `Live SEC Form 4 aggregation · ${counts.size} names`,
    disclosureLagDays: 45,
    recentDisclosures: [],
  };
}

export async function build13FStyleHoldings(): Promise<PilotHolding[]> {
  const counts = new Map<string, number>();
  const batches = await Promise.all([
    fetchSecEdgarFilings("13F"),
    ...HF_CIK_QUERIES.map((q) => fetchSecEdgarFilings(q)),
  ]);
  for (const batch of batches) {
    for (const item of batch) {
      const title = item.title.toUpperCase();
      for (const sym of ["NVDA", "MSFT", "AAPL", "AMZN", "META", "GOOGL", "SPY", "QQQ", "AVGO", "TSLA"]) {
        if (title.includes(sym) || item.excerpt.toUpperCase().includes(sym)) {
          counts.set(sym, (counts.get(sym) ?? 0) + 1);
        }
      }
    }
  }
  if (counts.size === 0) {
    return PILOT_CATALOG.find((p) => p.id === "PILOT-HF-QUANT")!.holdings.filter((h) => h.symbol !== "CASH");
  }
  return weightsFromCounts(counts);
}

export async function refreshLivePilotFeeds(): Promise<{ updated: string[]; pilots: CapitalPilot[] }> {
  const [congress, hfHoldings] = await Promise.all([buildCongressDisclosureHoldings(), build13FStyleHoldings()]);
  const now = new Date().toISOString();
  const file = await ensureCapitalQueue();
  const catalog = [...PILOT_CATALOG];
  const updated: string[] = [];

  const patchPilot = (
    id: string,
    holdings: PilotHolding[],
    note: string,
    feedSource: CapitalPilot["feedSource"],
    disclosureLagDays: number | null,
    recentDisclosures: CapitalPilot["recentDisclosures"],
  ) => {
    const base = catalog.find((p) => p.id === id);
    if (!base) return;
    const row: CapitalPilot = {
      ...base,
      holdings,
      updatedAt: now,
      feedSource,
      lastFeedAt: now,
      feedNote: note,
      disclosureLagDays,
      recentDisclosures,
    };
    updated.push(id);
    const idx = file.pilots.findIndex((p) => p.id === id);
    if (idx >= 0) file.pilots[idx] = row;
    else file.pilots.push(row);
  };

  patchPilot(
    "PILOT-CONGRESS-TRACKER",
    congress.holdings,
    congress.feedNote,
    congress.feedSource,
    congress.disclosureLagDays,
    congress.recentDisclosures,
  );
  patchPilot(
    "PILOT-HF-QUANT",
    hfHoldings,
    `Live 13F/8-K signal basket · ${hfHoldings.length} names`,
    "live_sec",
    null,
    [],
  );

  await writeCapitalFilePartial(file);
  const { mergePilotCatalog } = await import("./capital-pilot-catalog");
  return { updated, pilots: mergePilotCatalog(file.pilots) };
}

export async function getQuiverFeedStatus(): Promise<{
  configured: boolean;
  source: string;
  note: string;
}> {
  const configured = isQuiverConfigured();
  if (!configured) {
    return { configured: false, source: "sec_fallback", note: "QUIVER_API_KEY not set — using SEC Form 4 fallback" };
  }
  const feed = await fetchQuiverCongressFeed();
  return {
    configured: true,
    source: feed.source,
    note: feed.note,
  };
}
