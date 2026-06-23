import "server-only";

import type { AlphaFeedItem, PilotLeaderboardRow, PilotLeaderboardWindow } from "./capital-alpha-types";
import { readIntelCache } from "./capital-intel-store";
import { ensureCapitalQueue } from "./capital-store";
import type { CapitalPilot, CapitalTrade, PilotSignal, WatchlistMover } from "./capital-queue-types";

function tradeTitle(t: CapitalTrade): string {
  const side = t.action.toUpperCase();
  const st = t.status.replace(/_/g, " ");
  return `${side} ${t.qty} ${t.ticker} · ${st}`;
}

function tradeBody(t: CapitalTrade): string {
  const parts: string[] = [];
  if (t.filledPrice != null) parts.push(`@ $${t.filledPrice.toFixed(2)}`);
  if (t.source) parts.push(`source ${t.source}`);
  if (t.approvalNote) parts.push(t.approvalNote);
  return parts.join(" · ") || "Desk execution";
}

function moverItems(movers: WatchlistMover[], spikePct: number): AlphaFeedItem[] {
  return movers
    .filter((m) => m.changePct1d != null && Math.abs(m.changePct1d) >= spikePct)
    .map((m) => ({
      id: `mover-${m.symbol}`,
      kind: "mover_spike" as const,
      symbol: m.symbol,
      title: `${m.symbol} ${m.changePct1d! >= 0 ? "+" : ""}${m.changePct1d!.toFixed(1)}% today`,
      body: m.price != null ? `Last $${m.price.toFixed(2)}` : "Watchlist mover",
      at: new Date().toISOString(),
      meta: { changePct1d: m.changePct1d },
    }));
}

function pilotSignalItems(signals: PilotSignal[], pilots: CapitalPilot[]): AlphaFeedItem[] {
  const byId = new Map(pilots.map((p) => [p.id, p]));
  return signals.slice(0, 12).map((s) => {
    const pilot = byId.get(s.pilotId);
    return {
      id: `psig-${s.id}`,
      kind: "pilot_signal" as const,
      symbol: s.ticker,
      title: `${pilot?.name ?? s.pilotId} · ${s.action.toUpperCase()} ${s.ticker}`,
      body:
        s.pilotNotionalUsd != null
          ? `Pilot notional ~$${s.pilotNotionalUsd.toLocaleString()} · copied ${s.copiedCount}x`
          : `Pilot qty ${s.pilotQty} · copied ${s.copiedCount}x`,
      at: s.emittedAt,
      meta: { pilotId: s.pilotId },
    };
  });
}

function disclosureItems(pilots: CapitalPilot[]): AlphaFeedItem[] {
  const items: AlphaFeedItem[] = [];
  for (const p of pilots) {
    for (const d of p.recentDisclosures ?? []) {
      items.push({
        id: `disc-${p.id}-${d.ticker}-${d.filedAt}`,
        kind: "pilot_disclosure",
        symbol: d.ticker,
        title: `${d.politician} · ${d.ticker}`,
        body: `${p.name} feed · ${d.lagDays}d disclosure lag`,
        at: d.filedAt,
        meta: { pilotId: p.id, lagDays: d.lagDays },
      });
    }
  }
  return items;
}

export async function buildAlphaFeed(options?: { moverSpikePct?: number; limit?: number }): Promise<AlphaFeedItem[]> {
  const spikePct = options?.moverSpikePct ?? 3;
  const limit = options?.limit ?? 40;

  const [file, intel] = await Promise.all([ensureCapitalQueue(), readIntelCache()]);

  const items: AlphaFeedItem[] = [];

  for (const t of file.trades.slice(0, 20)) {
    const kind = t.status === "pending_approval" ? ("trade_pending" as const) : ("trade_fill" as const);
    if (!["filled", "simulated", "pending_approval", "submitted", "queued"].includes(t.status)) continue;
    items.push({
      id: `trade-${t.id}`,
      kind,
      symbol: t.ticker,
      title: tradeTitle(t),
      body: tradeBody(t),
      at: t.filledAt ?? t.submittedAt ?? t.createdAt,
      meta: { tradeId: t.id, status: t.status },
    });
  }

  for (const r of file.rules.filter((x) => x.state === "ARMED")) {
    items.push({
      id: `rule-${r.id}`,
      kind: "rule_armed",
      symbol: r.asset,
      title: `Armed · ${r.name}`,
      body: r.note || `${r.conditionType} → ${r.action}`,
      at: r.updatedAt,
      meta: { ruleId: r.id },
    });
  }

  items.push(...pilotSignalItems(file.pilotSignals, file.pilots));
  items.push(...disclosureItems(file.pilots));
  items.push(...moverItems(file.movers, spikePct));

  for (const fire of intel.alertFires.slice(-10)) {
    items.push({
      id: `alert-${fire.id}`,
      kind: "intel_alert",
      symbol: fire.symbol,
      title: `Intel alert · ${fire.symbol}`,
      body: fire.message,
      at: fire.firedAt,
      meta: { ruleId: fire.ruleId },
    });
  }

  for (const th of intel.thesisEntries.slice(0, 15)) {
    items.push({
      id: `thesis-${th.id}`,
      kind: "thesis",
      symbol: th.symbol,
      title: `Thesis · ${th.symbol}`,
      body: th.body.slice(0, 200),
      at: th.createdAt,
      meta: { thesisId: th.id, source: th.source },
    });
  }

  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return items.slice(0, limit);
}

export function buildPilotLeaderboard(
  pilots: CapitalPilot[],
  subscribedPilotIds: string[],
  window: PilotLeaderboardWindow = "m1",
): PilotLeaderboardRow[] {
  return [...pilots]
    .map((p) => ({
      pilotId: p.id,
      name: p.name,
      author: p.author,
      category: p.category,
      returnPct: p.performance[window],
      featured: p.featured,
      subscribed: subscribedPilotIds.includes(p.id),
    }))
    .sort((a, b) => b.returnPct - a.returnPct);
}
