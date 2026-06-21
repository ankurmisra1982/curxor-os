export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { readAppFreState } from "@/lib/app-fre-state";
import { evaluateIntelAlerts } from "@/lib/capital-intel-alerts";
import { listIntelAlertRules } from "@/lib/capital-intel-store";
import { autoApprovalSummary } from "@/lib/capital-auto-approval";
import { fetchPfmSnapshot } from "@/lib/capital-pfm-store";
import { getPlaidStatus } from "@/lib/capital-plaid-pfm";
import { getQuiverFeedStatus } from "@/lib/capital-pilot-feeds";
import { computePortfolioHealth } from "@/lib/capital-portfolio-health";
import {
  buildMarketDigest,
  buildTickerIntel,
  getCachedDigest,
  getCachedTickerIntel,
  listIntelProviderStatus,
} from "@/lib/capital-ticker-intel";
import { ensureCapitalQueue, fetchCapitalStatus } from "@/lib/capital-store";
import { previewTrade } from "@/lib/capital-trade-executor";

const AGENT_TOOLS = [
  { id: "get_ticker_intel", params: ["ticker"], description: "Fundamentals, news, chatter, smart take" },
  { id: "get_market_digest", params: [], description: "Watchlist digest across sources" },
  { id: "get_desk_status", params: [], description: "Portfolio, rules, pilots summary" },
  { id: "list_intel_alerts", params: [], description: "Active intel alert rules" },
  { id: "get_pfm_snapshot", params: [], description: "Cash flow, net worth, spending categories, wealth goals" },
  { id: "get_portfolio_health", params: [], description: "Concentration, sector mix, rebalance hints" },
  { id: "preview_trade", params: ["ticker", "qty", "actionTrade"], description: "Order preview with risk note and auto-approve eligibility" },
  { id: "get_auto_approval_policy", params: [], description: "Auto-approval stack policy summary" },
  { id: "get_quiver_status", params: [], description: "Congressional feed provider status (Quiver vs SEC fallback)" },
  { id: "get_plaid_status", params: [], description: "PFM bank link status (Plaid read-only)" },
] as const;

/** Agent-facing read tools for Capital Claw intel & desk state (Era-style scoped API). */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const tool = url.searchParams.get("tool") ?? "catalog";

  if (tool === "catalog") {
    const providers = await listIntelProviderStatus();
    return Response.json({
      ok: true,
      version: 2,
      tools: AGENT_TOOLS,
      providers,
    });
  }

  if (tool === "get_ticker_intel") {
    const ticker = url.searchParams.get("ticker")?.trim().toUpperCase();
    if (!ticker) return Response.json({ ok: false, error: "ticker required" }, { status: 400 });
    const refresh = url.searchParams.get("refresh") === "1";
    const intel = refresh ? await buildTickerIntel(ticker) : (await getCachedTickerIntel(ticker)) ?? (await buildTickerIntel(ticker));
    return Response.json({ ok: true, intel });
  }

  if (tool === "get_market_digest") {
    const refresh = url.searchParams.get("refresh") === "1";
    if (!refresh) {
      const cached = await getCachedDigest();
      if (cached) return Response.json({ ok: true, digest: cached, cached: true });
    }
    const fre = await readAppFreState("my-capital");
    const watchlist = Array.isArray(fre.config.seedWatchlist)
      ? fre.config.seedWatchlist.filter((x): x is string => typeof x === "string")
      : ["NVDA", "SPY", "BTC-USD"];
    const digest = await buildMarketDigest(watchlist);
    return Response.json({ ok: true, digest, cached: false });
  }

  if (tool === "get_desk_status") {
    const status = await fetchCapitalStatus();
    return Response.json({
      ok: true,
      summary: {
        portfolioValue: status.portfolioValue,
        buyingPower: status.buyingPower,
        dailyPnlPct: status.dailyPnlPct,
        armedRules: status.stats.armedRules,
        watchlist: status.watchlist,
        tradingPaused: status.tradingPaused,
        autonomousMode: status.permissions.autonomousMode,
        autoApproval: autoApprovalSummary(status.autoApproval),
      },
    });
  }

  if (tool === "list_intel_alerts") {
    const alerts = await listIntelAlertRules();
    return Response.json({ ok: true, alerts });
  }

  if (tool === "get_pfm_snapshot") {
    const snapshot = await fetchPfmSnapshot();
    return Response.json({ ok: true, pfm: snapshot });
  }

  if (tool === "get_portfolio_health") {
    const status = await fetchCapitalStatus();
    const health = computePortfolioHealth(status.positions, status.portfolioValue);
    return Response.json({ ok: true, health });
  }

  if (tool === "preview_trade") {
    const ticker = url.searchParams.get("ticker")?.trim().toUpperCase();
    const qty = Number.parseFloat(url.searchParams.get("qty") ?? "1");
    const actionTrade = (url.searchParams.get("actionTrade") ?? "buy") as "buy" | "sell";
    if (!ticker) return Response.json({ ok: false, error: "ticker required" }, { status: 400 });
    const out = await previewTrade({ ticker, qty: Number.isFinite(qty) ? qty : 1, action: actionTrade });
    return Response.json(out);
  }

  if (tool === "get_auto_approval_policy") {
    const file = await ensureCapitalQueue();
    return Response.json({
      ok: true,
      policy: file.autoApproval,
      summary: autoApprovalSummary(file.autoApproval),
    });
  }

  if (tool === "get_quiver_status") {
    const quiver = await getQuiverFeedStatus();
    return Response.json({ ok: true, quiver });
  }

  if (tool === "get_plaid_status") {
    const plaid = await getPlaidStatus();
    return Response.json({ ok: true, plaid });
  }

  return Response.json({ ok: false, error: "Unknown tool" }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { action?: string; ticker?: string; qty?: number; actionTrade?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "research_ticker" && body.ticker?.trim()) {
    const intel = await buildTickerIntel(body.ticker);
    return Response.json({ ok: true, intel });
  }

  if (body.action === "evaluate_alerts") {
    const out = await evaluateIntelAlerts();
    return Response.json({ ok: true, ...out });
  }

  if (body.action === "preview_trade" && body.ticker?.trim()) {
    const out = await previewTrade({
      ticker: body.ticker,
      qty: typeof body.qty === "number" ? body.qty : 1,
      action: (body.actionTrade as "buy" | "sell" | undefined) ?? "buy",
    });
    return Response.json(out);
  }

  if (body.action === "pfm_refresh") {
    const snapshot = await fetchPfmSnapshot();
    return Response.json({ ok: true, pfm: snapshot });
  }

  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
