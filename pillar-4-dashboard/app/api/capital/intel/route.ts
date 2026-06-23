export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { readAppFreState } from "@/lib/app-fre-state";
import { buildAlphaFeed, buildPilotLeaderboard } from "@/lib/capital-alpha-feed";
import { createDipRuleFromIntel, createRuleFromIntelThesis } from "@/lib/capital-intel-actions";
import { evaluateIntelAlerts } from "@/lib/capital-intel-alerts";
import {
  addThesisEntry,
  deleteIntelAlertRule,
  getAlertPreferences,
  listIntelAlertRules,
  listThesisEntries,
  readIntelCache,
  setAlertPreferences,
  upsertIntelAlertRule,
} from "@/lib/capital-intel-store";
import type { IntelAlertKind } from "@/lib/capital-intel-types";
import { ensureCapitalQueue } from "@/lib/capital-store";
import {
  buildMarketDigest,
  buildTickerIntel,
  getCachedDigest,
  getCachedTickerIntel,
  listIntelProviderStatus,
} from "@/lib/capital-ticker-intel";
import { addTickerToWatchlist } from "@/lib/capital-watchlist";

async function watchlistFromFre(): Promise<string[]> {
  const fre = await readAppFreState("my-capital");
  const wl = fre.config.seedWatchlist;
  return Array.isArray(wl) ? wl.filter((x): x is string => typeof x === "string") : ["NVDA", "SPY", "BTC-USD"];
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const ticker = url.searchParams.get("ticker")?.trim().toUpperCase();
  const refresh = url.searchParams.get("refresh") === "1";
  const meta = url.searchParams.get("meta") === "1";

  if (meta) {
    const [providers, alerts, preferences] = await Promise.all([
      listIntelProviderStatus(),
      listIntelAlertRules(),
      getAlertPreferences(),
    ]);
    return Response.json({ ok: true, providers, alerts, preferences });
  }

  if (ticker) {
    if (!refresh) {
      const cached = await getCachedTickerIntel(ticker);
      if (cached) return Response.json({ ok: true, intel: cached, cached: true });
    }
    try {
      const intel = await buildTickerIntel(ticker);
      return Response.json({ ok: true, intel, cached: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lookup failed";
      return Response.json({ ok: false, error: message }, { status: 400 });
    }
  }

  if (!refresh) {
    const digest = await getCachedDigest();
    if (digest) return Response.json({ ok: true, digest, cached: true });
  }

  const watchlist = await watchlistFromFre();
  const built = await buildMarketDigest(watchlist);
  return Response.json({ ok: true, digest: built, cached: false });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    action?: string;
    ticker?: string;
    symbol?: string;
    kind?: IntelAlertKind;
    keyword?: string;
    thresholdPct?: number;
    minNotionalUsd?: number;
    alertId?: string;
    dropPct?: number;
    qty?: number;
    body?: string;
    source?: string;
    linkedTradeId?: string;
    linkedRuleId?: string;
    preferences?: Record<string, unknown>;
    window?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const sym = (body.ticker ?? body.symbol)?.trim().toUpperCase();

  if (body.action === "ticker_lookup" && sym) {
    const intel = await buildTickerIntel(sym);
    return Response.json({ ok: true, intel });
  }

  if (body.action === "refresh_digest") {
    const watchlist = await watchlistFromFre();
    const digest = await buildMarketDigest(watchlist);
    return Response.json({ ok: true, digest });
  }

  if (body.action === "evaluate_alerts") {
    const out = await evaluateIntelAlerts();
    return Response.json({ ok: true, ...out });
  }

  if (body.action === "add_alert" && sym && body.kind) {
    const alert = await upsertIntelAlertRule({
      symbol: sym,
      kind: body.kind,
      keyword: body.keyword,
      thresholdPct: body.thresholdPct,
      minNotionalUsd: body.minNotionalUsd,
      enabled: true,
    });
    return Response.json({ ok: true, alert });
  }

  if (body.action === "delete_alert" && body.alertId) {
    const ok = await deleteIntelAlertRule(body.alertId);
    return Response.json({ ok });
  }

  if (body.action === "list_alerts") {
    const alerts = await listIntelAlertRules();
    const cache = await readIntelCache();
    return Response.json({ ok: true, alerts, fires: cache.alertFires.slice(-20) });
  }

  if (body.action === "add_to_watchlist" && sym) {
    const watchlist = await addTickerToWatchlist(sym);
    return Response.json({ ok: true, watchlist });
  }

  if (body.action === "create_dip_rule" && sym) {
    const intel = await buildTickerIntel(sym);
    const rule = await createDipRuleFromIntel(intel, body.dropPct ?? 5, body.qty ?? 1);
    return Response.json({ ok: true, rule, intel });
  }

  if (body.action === "create_rule_from_thesis" && sym) {
    const intel = await getCachedTickerIntel(sym, { allowStale: true }) ?? (await buildTickerIntel(sym));
    const rule = await createRuleFromIntelThesis(intel);
    return Response.json({ ok: true, rule, intel });
  }

  if (body.action === "alpha_feed") {
    const prefs = await getAlertPreferences();
    const feed = await buildAlphaFeed({ moverSpikePct: prefs.moverSpikePct });
    return Response.json({ ok: true, feed, preferences: prefs });
  }

  if (body.action === "pilot_leaderboard") {
    const file = await ensureCapitalQueue();
    const win = (body.window === "w1" || body.window === "m3" || body.window === "y1" ? body.window : "m1") as
      | "w1"
      | "m1"
      | "m3"
      | "y1";
    const subscribed = file.subscriptions.filter((s) => s.state === "active").map((s) => s.pilotId);
    const rows = buildPilotLeaderboard(file.pilots, subscribed, win);
    return Response.json({ ok: true, rows, window: win });
  }

  if (body.action === "list_thesis") {
    const entries = await listThesisEntries(sym);
    return Response.json({ ok: true, entries });
  }

  if (body.action === "add_thesis" && sym && body.body?.trim()) {
    const entry = await addThesisEntry({
      symbol: sym,
      body: body.body,
      source: (body.source as "manual" | "trade" | "rule" | "pilot" | "intel" | undefined) ?? "manual",
      linkedTradeId: body.linkedTradeId ?? null,
      linkedRuleId: body.linkedRuleId ?? null,
    });
    return Response.json({ ok: true, entry });
  }

  if (body.action === "set_alert_preferences" && body.preferences) {
    const preferences = await setAlertPreferences(body.preferences as Parameters<typeof setAlertPreferences>[0]);
    return Response.json({ ok: true, preferences });
  }

  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
