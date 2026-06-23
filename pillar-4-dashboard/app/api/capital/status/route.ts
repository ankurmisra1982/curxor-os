export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { parseDigitalReceipt } from "@/lib/digital-protocol";
import { buildCapitalGoLiveReport, runCapitalBootstrap } from "@/lib/capital-go-live";
import { buildCapitalGrowthProfile } from "@/lib/capital-growth";
import { readUserSettings } from "@/lib/user-settings";
import { grantAutonomousPermission, setTradingViewSecret } from "@/lib/capital-permissions";
import { confirmLiveMoney, isCapitalLiveEnvEnabled } from "@/lib/capital-live-gate";
import { readAppFreState, writeAppFreState } from "@/lib/app-fre-state";
import { handleCapitalTradeReceipt } from "@/lib/capital-receipt-handler";
import { evaluateArmedRules, refreshQuotesAndMovers, runRuleBacktest } from "@/lib/capital-rule-engine";
import {
  emitPilotSignal,
  initialPilotSync,
  listPilotsFromStore,
  setSubscriptionState,
  subscribeToPilot,
  syncPilotSubscriptions,
  unsubscribePilot,
  updatePilotAllocation,
} from "@/lib/capital-pilot-engine";
import {
  createRule,
  deleteRule,
  ensureCapitalQueue,
  fetchCapitalStatus,
  listFailedTrades,
  setRuleState,
  setTradingPaused,
  writeCapitalFilePartial,
} from "@/lib/capital-store";
import { executeCapitalTrade, previewTrade, submitTradeToBridge } from "@/lib/capital-trade-executor";
import type { AutonomousMode, RuleState, TradeAction } from "@/lib/capital-queue-types";

export async function GET(): Promise<Response> {
  const status = await fetchCapitalStatus({ sync: false });
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    action?: string;
    ruleId?: string;
    tradeId?: string;
    name?: string;
    asset?: string;
    condition?: string;
    conditionType?: string;
    conditionParams?: Record<string, number | string>;
    qty?: number;
    note?: string;
    takeProfitPct?: number;
    stopLossPct?: number;
    state?: string;
    actionTrade?: string;
    ticker?: string;
    paused?: boolean;
    receipt?: Record<string, unknown>;
    autonomousMode?: AutonomousMode;
    pilotId?: string;
    subscriptionId?: string;
    allocationUsd?: number;
    brokerId?: string;
    pilotQty?: number;
    dropPct?: number;
    autoApproval?: Partial<import("@/lib/capital-auto-approval-types").AutoApprovalPolicy>;
    previewQty?: number;
    confirm?: boolean;
    agentKillSwitch?: boolean;
    enabled?: boolean;
    limit?: number;
    secret?: string | null;
    mode?: string;
    kind?: string;
    targetWeight?: number;
    driftThresholdPct?: number;
    query?: string;
    description?: string;
    defaultAsset?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "";

  try {
    switch (action) {
      case "bootstrap":
      case "dashboard_bootstrap": {
        await ensureCapitalQueue();
        const boot = await runCapitalBootstrap();
        const [status, goLive, settings, fre] = await Promise.all([
          fetchCapitalStatus(),
          buildCapitalGoLiveReport(),
          readUserSettings(),
          readAppFreState("my-capital"),
        ]);
        const growthProfile = buildCapitalGrowthProfile(
          fre.config,
          settings.appearance.experienceLevel,
          settings.appearance.capitalGrowthLevel ?? null,
        );
        return Response.json({ ok: true, ...boot, status, goLive, growthProfile });
      }

      case "go_live": {
        const goLive = await buildCapitalGoLiveReport();
        return Response.json({ ok: true, goLive, status: await fetchCapitalStatus() });
      }

      case "run_demo_tour": {
        const { runCapitalDemoTour } = await import("@/lib/capital-demo-tour");
        const tour = await runCapitalDemoTour();
        return Response.json({ ...tour, status: await fetchCapitalStatus() });
      }

      case "describe_rule": {
        const description = typeof body.description === "string" ? body.description.trim() : "";
        if (!description) {
          return Response.json({ ok: false, error: "description required" }, { status: 400 });
        }
        const { parseDescribeRule } = await import("@/lib/capital-nl-rule-parser");
        const fallbackAsset =
          typeof body.defaultAsset === "string" ? body.defaultAsset.trim().toUpperCase() : "SPY";
        const parsed = parseDescribeRule(description, fallbackAsset);
        if (!parsed) {
          return Response.json({ ok: false, error: "Could not parse strategy description" }, { status: 400 });
        }
        const rule = await createRule({
          name: parsed.name,
          asset: parsed.asset,
          conditionType: parsed.conditionType,
          conditionParams: parsed.conditionParams,
          action: parsed.action,
          qty: parsed.qty,
          note: parsed.note,
          takeProfitPct: parsed.takeProfitPct,
          stopLossPct: parsed.stopLossPct,
        });
        const backtested = await runRuleBacktest(rule.id);
        return Response.json({ ok: true, rule: backtested ?? rule, parsed, status: await fetchCapitalStatus() });
      }

      case "create_rule": {
        if (!body.name?.trim() || !body.asset?.trim()) {
          return Response.json({ ok: false, error: "name and asset required" }, { status: 400 });
        }
        const rule = await createRule({
          name: body.name,
          asset: body.asset,
          condition: body.condition,
          conditionType: body.conditionType as import("@/lib/capital-queue-types").ConditionType | undefined,
          conditionParams:
            body.conditionParams && typeof body.conditionParams === "object"
              ? (body.conditionParams as Record<string, number | string>)
              : undefined,
          action: body.actionTrade as TradeAction | undefined,
          qty: body.qty,
          note: body.note,
          takeProfitPct: typeof body.takeProfitPct === "number" ? body.takeProfitPct : undefined,
          stopLossPct: typeof body.stopLossPct === "number" ? body.stopLossPct : undefined,
          brokerId: body.brokerId as import("@/lib/capital-queue-types").BrokerId | undefined,
          kind: body.kind as import("@/lib/capital-queue-types").RuleKind | undefined,
          targetWeight: typeof body.targetWeight === "number" ? body.targetWeight : undefined,
          driftThresholdPct: typeof body.driftThresholdPct === "number" ? body.driftThresholdPct : undefined,
        });
        const backtested = await runRuleBacktest(rule.id);
        return Response.json({ ok: true, rule: backtested ?? rule, status: await fetchCapitalStatus() });
      }

      case "arm_rule": {
        if (!body.ruleId) return Response.json({ ok: false, error: "ruleId required" }, { status: 400 });
        const rule = await setRuleState(body.ruleId, "ARMED");
        if (!rule) return Response.json({ ok: false, error: "Rule not found" }, { status: 404 });
        const { emitCapitalXpEvent } = await import("@/lib/capital-xp-events");
        void emitCapitalXpEvent("rule_armed", { ruleId: rule.id, asset: rule.asset });
        return Response.json({ ok: true, rule, status: await fetchCapitalStatus() });
      }

      case "pause_rule": {
        if (!body.ruleId) return Response.json({ ok: false, error: "ruleId required" }, { status: 400 });
        const rule = await setRuleState(body.ruleId, "PAUSED");
        return Response.json({ ok: true, rule, status: await fetchCapitalStatus() });
      }

      case "toggle_rule": {
        if (!body.ruleId) return Response.json({ ok: false, error: "ruleId required" }, { status: 400 });
        const file = await ensureCapitalQueue();
        const current = file.rules.find((r) => r.id === body.ruleId);
        if (!current) return Response.json({ ok: false, error: "Rule not found" }, { status: 404 });
        const next: RuleState = current.state === "ARMED" ? "PAUSED" : "ARMED";
        const rule = await setRuleState(body.ruleId, next);
        if (!rule) return Response.json({ ok: false, error: "Rule not found" }, { status: 404 });
        if (next === "ARMED") {
          const { emitCapitalXpEvent } = await import("@/lib/capital-xp-events");
          void emitCapitalXpEvent("rule_armed", { ruleId: rule.id, asset: rule.asset });
        }
        return Response.json({ ok: true, rule, status: await fetchCapitalStatus() });
      }

      case "delete_rule": {
        if (!body.ruleId) return Response.json({ ok: false, error: "ruleId required" }, { status: 400 });
        const deleted = await deleteRule(body.ruleId);
        return Response.json({ ok: deleted, status: await fetchCapitalStatus() });
      }

      case "execute_trade": {
        const result = await executeCapitalTrade({
          ruleId: body.ruleId,
          ticker: body.ticker,
          qty: body.qty,
          action: body.actionTrade as TradeAction | undefined,
          source: "manual",
        });
        return Response.json({ ...result, status: await fetchCapitalStatus() });
      }

      case "execute_now": {
        const file = await ensureCapitalQueue();
        const ruleId = body.ruleId ?? file.rules.find((r) => r.state === "ARMED")?.id;
        if (!ruleId) {
          return Response.json(
            { ok: false, error: "No armed rule — arm a rule or run demo tour first" },
            { status: 400 },
          );
        }
        const result = await executeCapitalTrade({
          ruleId,
          source: "manual",
        });
        const goLive = await buildCapitalGoLiveReport();
        return Response.json({ ...result, goLive, status: await fetchCapitalStatus() });
      }

      case "submit_trade": {
        if (!body.tradeId) return Response.json({ ok: false, error: "tradeId required" }, { status: 400 });
        const result = await submitTradeToBridge(body.tradeId);
        return Response.json({ ...result, status: await fetchCapitalStatus() });
      }

      case "set_trading_paused": {
        await setTradingPaused(body.paused === true);
        return Response.json({ ok: true, status: await fetchCapitalStatus() });
      }

      case "set_autonomous_mode": {
        if (!body.autonomousMode) {
          return Response.json({ ok: false, error: "autonomousMode required" }, { status: 400 });
        }
        const permissions = await grantAutonomousPermission(body.autonomousMode);
        return Response.json({ ok: true, permissions, status: await fetchCapitalStatus() });
      }

      case "evaluate_rules": {
        const result = await evaluateArmedRules();
        return Response.json({ ok: true, ...result, status: await fetchCapitalStatus() });
      }

      case "refresh_quotes": {
        await refreshQuotesAndMovers();
        return Response.json({ ok: true, status: await fetchCapitalStatus() });
      }

      case "backtest_rule": {
        if (!body.ruleId) return Response.json({ ok: false, error: "ruleId required" }, { status: 400 });
        const rule = await runRuleBacktest(body.ruleId);
        return Response.json({ ok: Boolean(rule), rule, status: await fetchCapitalStatus() });
      }

      case "list_pilots": {
        const pilots = await listPilotsFromStore();
        return Response.json({ ok: true, pilots, status: await fetchCapitalStatus() });
      }

      case "refresh_pilot_feeds": {
        const { refreshLivePilotFeeds } = await import("@/lib/capital-pilot-feeds");
        const out = await refreshLivePilotFeeds();
        return Response.json({ ok: true, ...out, status: await fetchCapitalStatus() });
      }

      case "set_active_broker": {
        if (!body.brokerId) {
          return Response.json({ ok: false, error: "brokerId required" }, { status: 400 });
        }
        const file = await ensureCapitalQueue();
        file.permissions = {
          ...file.permissions,
          activeBrokerId: body.brokerId as import("@/lib/capital-queue-types").BrokerId,
        };
        await writeCapitalFilePartial(file);
        return Response.json({ ok: true, permissions: file.permissions, status: await fetchCapitalStatus() });
      }

      case "subscribe_pilot": {
        if (!body.pilotId || !body.allocationUsd) {
          return Response.json({ ok: false, error: "pilotId and allocationUsd required" }, { status: 400 });
        }
        const result = await subscribeToPilot({
          pilotId: body.pilotId,
          allocationUsd: body.allocationUsd,
          brokerId: body.brokerId as import("@/lib/capital-queue-types").BrokerId | undefined,
        });
        return Response.json({ ...result, status: await fetchCapitalStatus() });
      }

      case "unsubscribe_pilot": {
        if (!body.subscriptionId) {
          return Response.json({ ok: false, error: "subscriptionId required" }, { status: 400 });
        }
        const ok = await unsubscribePilot(body.subscriptionId);
        return Response.json({ ok, status: await fetchCapitalStatus() });
      }

      case "pause_subscription": {
        if (!body.subscriptionId) {
          return Response.json({ ok: false, error: "subscriptionId required" }, { status: 400 });
        }
        const sub = await setSubscriptionState(body.subscriptionId, "paused");
        return Response.json({ ok: Boolean(sub), subscription: sub, status: await fetchCapitalStatus() });
      }

      case "resume_subscription": {
        if (!body.subscriptionId) {
          return Response.json({ ok: false, error: "subscriptionId required" }, { status: 400 });
        }
        const sub = await setSubscriptionState(body.subscriptionId, "active");
        return Response.json({ ok: Boolean(sub), subscription: sub, status: await fetchCapitalStatus() });
      }

      case "update_allocation": {
        if (!body.subscriptionId || !body.allocationUsd) {
          return Response.json({ ok: false, error: "subscriptionId and allocationUsd required" }, { status: 400 });
        }
        const sub = await updatePilotAllocation(body.subscriptionId, body.allocationUsd);
        return Response.json({ ok: Boolean(sub), subscription: sub, status: await fetchCapitalStatus() });
      }

      case "sync_pilot_subscription": {
        if (!body.subscriptionId) {
          return Response.json({ ok: false, error: "subscriptionId required" }, { status: 400 });
        }
        const out = await initialPilotSync(body.subscriptionId);
        return Response.json({ ok: true, ...out, status: await fetchCapitalStatus() });
      }

      case "sync_pilot_subscriptions": {
        const out = await syncPilotSubscriptions();
        return Response.json({ ok: true, ...out, status: await fetchCapitalStatus() });
      }

      case "emit_pilot_signal": {
        if (!body.pilotId || !body.ticker || !body.pilotQty) {
          return Response.json({ ok: false, error: "pilotId, ticker, pilotQty required" }, { status: 400 });
        }
        const result = await emitPilotSignal({
          pilotId: body.pilotId,
          ticker: body.ticker,
          action: (body.actionTrade as TradeAction | undefined) ?? "buy",
          pilotQty: body.pilotQty,
        });
        return Response.json({ ...result, status: await fetchCapitalStatus() });
      }

      case "recovery_list": {
        const failed = await listFailedTrades();
        return Response.json({ ok: true, failed, status: await fetchCapitalStatus() });
      }

      case "recovery_retry": {
        if (!body.tradeId) return Response.json({ ok: false, error: "tradeId required" }, { status: 400 });
        const result = await submitTradeToBridge(body.tradeId);
        return Response.json({ ...result, status: await fetchCapitalStatus() });
      }

      case "receipt": {
        const receipt = body.receipt ? parseDigitalReceipt(JSON.stringify(body.receipt)) : null;
        if (receipt) await handleCapitalTradeReceipt(receipt);
        return Response.json({ ok: true, status: await fetchCapitalStatus() });
      }

      case "evaluate_intel_alerts": {
        const { evaluateIntelAlerts } = await import("@/lib/capital-intel-alerts");
        const out = await evaluateIntelAlerts();
        return Response.json({ ok: true, ...out, status: await fetchCapitalStatus() });
      }

      case "add_to_watchlist": {
        if (!body.ticker?.trim()) {
          return Response.json({ ok: false, error: "ticker required" }, { status: 400 });
        }
        const { addTickerToWatchlist } = await import("@/lib/capital-watchlist");
        const watchlist = await addTickerToWatchlist(body.ticker);
        return Response.json({ ok: true, watchlist, status: await fetchCapitalStatus() });
      }

      case "create_dip_rule": {
        if (!body.ticker?.trim()) {
          return Response.json({ ok: false, error: "ticker required" }, { status: 400 });
        }
        const { buildTickerIntel } = await import("@/lib/capital-ticker-intel");
        const { createDipRuleFromIntel } = await import("@/lib/capital-intel-actions");
        const intel = await buildTickerIntel(body.ticker);
        const dropPct = typeof body.dropPct === "number" ? body.dropPct : 5;
        const rule = await createDipRuleFromIntel(intel, dropPct, body.qty ?? 1);
        return Response.json({ ok: true, rule, intel, status: await fetchCapitalStatus() });
      }

      case "create_rule_from_thesis": {
        if (!body.ticker?.trim()) {
          return Response.json({ ok: false, error: "ticker required" }, { status: 400 });
        }
        const { buildTickerIntel, getCachedTickerIntel } = await import("@/lib/capital-ticker-intel");
        const { createRuleFromIntelThesis } = await import("@/lib/capital-intel-actions");
        const intel =
          (await getCachedTickerIntel(body.ticker, { allowStale: true })) ??
          (await buildTickerIntel(body.ticker));
        const rule = await createRuleFromIntelThesis(intel);
        return Response.json({ ok: true, rule, intel, status: await fetchCapitalStatus() });
      }

      case "set_auto_approval": {
        const file = await ensureCapitalQueue();
        if (body.autoApproval && typeof body.autoApproval === "object") {
          file.autoApproval = { ...file.autoApproval, ...body.autoApproval };
          await writeCapitalFilePartial(file);
        }
        return Response.json({ ok: true, autoApproval: file.autoApproval, status: await fetchCapitalStatus() });
      }

      case "preview_trade": {
        if (!body.ticker?.trim()) {
          return Response.json({ ok: false, error: "ticker required" }, { status: 400 });
        }
        const result = await previewTrade({
          ticker: body.ticker,
          qty: typeof body.previewQty === "number" ? body.previewQty : body.qty ?? 1,
          action: (body.actionTrade as TradeAction | undefined) ?? "buy",
          brokerId: body.brokerId as import("@/lib/capital-queue-types").BrokerId | undefined,
        });
        return Response.json({ ...result, status: await fetchCapitalStatus({ sync: false }) });
      }

      case "agent_execute_trade": {
        if (!body.ticker?.trim()) {
          return Response.json({ ok: false, error: "ticker required" }, { status: 400 });
        }
        const { agentExecuteTrade } = await import("@/lib/capital-agent-executor");
        const result = await agentExecuteTrade({
          ticker: body.ticker,
          qty: typeof body.qty === "number" ? body.qty : 1,
          action: (body.actionTrade as TradeAction | undefined) ?? "buy",
          ruleId: body.ruleId,
          confirm: body.confirm === true,
          source: "claw",
        });
        return Response.json({ ...result, status: await fetchCapitalStatus() });
      }

      case "agent_audit_list": {
        const { listAgentAudit } = await import("@/lib/capital-agent-audit");
        const limit = typeof body.limit === "number" ? body.limit : 25;
        return Response.json({ ok: true, audit: await listAgentAudit(limit), status: await fetchCapitalStatus() });
      }

      case "set_agent_kill_switch": {
        const { setAgentKillSwitch } = await import("@/lib/capital-agent-audit");
        const enabled = body.agentKillSwitch === true || body.enabled === true;
        await setAgentKillSwitch(enabled);
        const file = await ensureCapitalQueue();
        return Response.json({
          ok: true,
          agentKillSwitch: file.autoApproval.agentKillSwitch,
          status: await fetchCapitalStatus(),
        });
      }

      case "confirm_live_money": {
        const result = await confirmLiveMoney();
        return Response.json({ ...result, status: await fetchCapitalStatus(), goLive: await buildCapitalGoLiveReport() });
      }

      case "set_trading_mode": {
        const nextMode = body.mode?.trim();
        if (!nextMode) {
          return Response.json({ ok: false, error: "mode required" }, { status: 400 });
        }
        if (nextMode === "live") {
          if (!(await isCapitalLiveEnvEnabled())) {
            return Response.json(
              { ok: false, error: "CURXOR_CAPITAL_LIVE_ENABLED not set in digital.env" },
              { status: 403 },
            );
          }
          const file = await ensureCapitalQueue();
          if (!file.permissions.liveMoneyConfirmedAt) {
            return Response.json({ ok: false, error: "Confirm live money before switching mode" }, { status: 403 });
          }
        }
        const fre = await readAppFreState("my-capital");
        await writeAppFreState("my-capital", {
          ...fre,
          config: { ...fre.config, tradingMode: nextMode },
        });
        return Response.json({
          ok: true,
          tradingMode: nextMode,
          status: await fetchCapitalStatus(),
          goLive: await buildCapitalGoLiveReport(),
        });
      }

      case "set_tv_secret": {
        await setTradingViewSecret(body.secret?.trim() ? body.secret.trim() : null);
        return Response.json({ ok: true, status: await fetchCapitalStatus() });
      }

      case "test_tv_webhook": {
        const file = await ensureCapitalQueue();
        const envSecret = process.env.CURXOR_CAPITAL_TV_SECRET?.trim() ?? "";
        const storeSecret = file.permissions.tradingviewWebhookSecret?.trim() ?? "";
        const secret = storeSecret || envSecret;
        if (!secret) {
          return Response.json({ ok: false, error: "TradingView webhook secret not configured" }, { status: 503 });
        }
        const ticker = (body.ticker ?? "SPY").trim().toUpperCase();
        const actionTrade = body.actionTrade?.toLowerCase() === "sell" ? "sell" : "buy";
        const origin = new URL(request.url).origin;
        const ping = await fetch(`${origin}/api/capital/tradingview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-curxor-tv-secret": secret,
          },
          body: JSON.stringify({ ticker, action: actionTrade, qty: body.qty ?? 1, alert_id: "desk-test" }),
        });
        const json = (await ping.json()) as { ok?: boolean; ack?: boolean; error?: string };
        return Response.json({
          ok: ping.ok && json.ok === true,
          ack: json.ack === true,
          error: json.error,
          status: await fetchCapitalStatus(),
        });
      }

      case "analytics": {
        const status = await fetchCapitalStatus();
        const {
          buildCapitalTradeAnalytics,
          buildRuleScorecards,
          buildPortfolioBenchmark,
        } = await import("@/lib/capital-analytics");
        const spyDaily =
          status.movers.find((m) => m.symbol === "SPY")?.changePct1d ??
          status.movers.find((m) => m.symbol.startsWith("SPY"))?.changePct1d ??
          null;
        return Response.json({
          ok: true,
          analytics: buildCapitalTradeAnalytics(status.trades, status.dailyPnlPct),
          scorecards: buildRuleScorecards(status.rules, status.trades),
          benchmark: buildPortfolioBenchmark(status.trades, status.positions, status.dailyPnlPct, spyDaily),
          status,
        });
      }

      case "walk_forward_backtest": {
        if (!body.ruleId) return Response.json({ ok: false, error: "ruleId required" }, { status: 400 });
        const file = await ensureCapitalQueue();
        const rule = file.rules.find((r) => r.id === body.ruleId);
        if (!rule) return Response.json({ ok: false, error: "Rule not found" }, { status: 404 });
        const { walkForwardBacktest } = await import("@/lib/capital-walk-forward");
        const wf = await walkForwardBacktest(rule);
        return Response.json({ ok: true, walkForward: wf, status: await fetchCapitalStatus() });
      }

      case "nl_portfolio_query": {
        if (!body.query?.trim()) return Response.json({ ok: false, error: "query required" }, { status: 400 });
        const status = await fetchCapitalStatus();
        const { answerPortfolioQuery } = await import("@/lib/capital-nl-query");
        const result = answerPortfolioQuery(body.query, status);
        return Response.json({ ok: true, ...result, status });
      }

      case "desk_health_alerts": {
        const { evaluateDeskHealthAlerts } = await import("@/lib/capital-desk-alerts");
        const out = await evaluateDeskHealthAlerts();
        return Response.json({ ok: true, ...out, status: await fetchCapitalStatus() });
      }

      case "handoff_to_swarm": {
        const payload = body as {
          title?: string;
          detail?: string;
          targetCell?: string;
          ticker?: string;
        };
        const { handoffToSwarm } = await import("@/lib/swarm-handoff");
        const result = await handoffToSwarm({
          source: "my-capital",
          title: payload.title ?? `${payload.ticker ?? "Capital"} desk sweep`,
          detail: payload.detail ?? "Capital Claw handoff to Swarm fleet",
          targetCell: payload.targetCell as import("@/lib/swarm-fleet").SwarmGridCell | undefined,
          priority: "high",
        });
        if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
        return Response.json({ ...result, status: await fetchCapitalStatus() });
      }

      case "approval_callback_demo": {
        const { approvePendingCapitalTrade } = await import("@/lib/capital-approval-telegram");
        const status = await fetchCapitalStatus();
        const pending = status.trades.find((t) => t.status === "pending_approval");
        if (!pending) {
          return Response.json({ ok: true, demoLogged: false, detail: "no pending approval" });
        }
        const result = await approvePendingCapitalTrade(pending.id, "api");
        return Response.json({
          ok: true,
          demoLogged: result.ok,
          tradeId: pending.id,
          tradeStatus: result.trade?.status,
          status: await fetchCapitalStatus(),
        });
      }

      default:
        return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
