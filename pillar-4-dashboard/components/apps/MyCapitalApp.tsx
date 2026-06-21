"use client";

import { useCallback, useEffect, useState } from "react";

import { AppMetric } from "@/components/app-shared/AppLayout";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ExperienceLevelBadge } from "@/components/experience/ExperienceLevelBadge";
import { DigitalReceiptPanel } from "@/components/digital/DigitalReceiptPanel";
import { CapitalAutoApprovalPanel } from "@/components/apps/capital/CapitalAutoApprovalPanel";
import { CapitalAgentTradingPanel } from "@/components/apps/capital/CapitalAgentTradingPanel";
import { CapitalGoLivePanel, type CapitalGoLiveReportRow } from "@/components/apps/capital/CapitalGoLivePanel";
import { CapitalIntelAlertsPanel } from "@/components/apps/capital/CapitalIntelAlertsPanel";
import { CapitalPfmPanel } from "@/components/apps/capital/CapitalPfmPanel";
import { CapitalPlaidLinkSection } from "@/components/apps/capital/CapitalPlaidLinkSection";
import { CapitalPortfolioHealthPanel } from "@/components/apps/capital/CapitalPortfolioHealthPanel";
import { CapitalMarketDigestPanel } from "@/components/apps/capital/CapitalMarketDigestPanel";
import { CapitalPendingTradesBanner } from "@/components/apps/capital/CapitalPendingTradesBanner";
import { CapitalMoversPanel } from "@/components/apps/capital/CapitalMoversPanel";
import { CapitalPilotMarketplacePanel } from "@/components/apps/capital/CapitalPilotMarketplacePanel";
import { CapitalSubscriptionsPanel } from "@/components/apps/capital/CapitalSubscriptionsPanel";
import { CapitalBrokersPanel, CapitalPermissionsPanel } from "@/components/apps/capital/CapitalPermissionsPanel";
import { CapitalRecoveryPanel } from "@/components/apps/capital/CapitalRecoveryPanel";
import { CapitalRulesPanel } from "@/components/apps/capital/CapitalRulesPanel";
import { CapitalRecentTradesStrip } from "@/components/apps/capital/CapitalRecentTradesStrip";
import { CapitalTradeDecisionPanel } from "@/components/apps/capital/CapitalTradeDecisionPanel";
import { CapitalTradeLogPanel } from "@/components/apps/capital/CapitalTradeLogPanel";
import { CapitalTickerIntelPanel } from "@/components/apps/capital/CapitalTickerIntelPanel";
import { CapitalWatchlistIntelStrip } from "@/components/apps/capital/CapitalWatchlistIntelStrip";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { defaultAutoApprovalPolicy } from "@/lib/capital-auto-approval-types";
import type { FinancialSuggestion } from "@/lib/capital-pfm-types";
import type { CapitalQueueStatus, CapitalTrade } from "@/lib/capital-queue-types";
import { getOotbApp } from "@/lib/ootb-apps";
import { useDigitalStream } from "@/hooks/useDigitalStream";
import { useMotorStream } from "@/hooks/useMotorStream";
import { formatTradeReceipt } from "@/lib/digital-protocol";
import { formatAgentPhaseMessage, formatTradeOutcomeMessage } from "@/lib/capital-trade-feedback";

async function postCapital(body: Record<string, unknown>) {
  const res = await fetch("/api/capital/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    ok: boolean;
    status?: CapitalQueueStatus;
    goLive?: CapitalGoLiveReportRow;
    failed?: CapitalTrade[];
    error?: string;
  };
  if (!res.ok && !json.error) {
    return { ...json, ok: false, error: `Request failed (${res.status})` };
  }
  return json;
}

function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function MyCapitalApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { command, connected } = useMotorStream();
  const digital = useDigitalStream("capital.execute_trade");
  const { level } = useExperienceLevel();
  const mode = typeof config.tradingMode === "string" ? config.tradingMode : "paper";
  const risk = typeof config.riskProfile === "string" ? config.riskProfile : "balanced";

  const [status, setStatus] = useState<CapitalQueueStatus | null>(null);
  const [goLive, setGoLive] = useState<CapitalGoLiveReportRow | null>(null);
  const [failedTrades, setFailedTrades] = useState<CapitalTrade[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState("RULE-01");
  const [researchTicker, setResearchTicker] = useState<string | null>(null);
  const [activeIntelSymbol, setActiveIntelSymbol] = useState<string | null>(null);
  const [signal, setSignal] = useState("Syncing capital desk…");
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [demoTourRunning, setDemoTourRunning] = useState(false);

  const applyStatus = useCallback((next: CapitalQueueStatus) => {
    setStatus(next);
    setSelectedRuleId((prev) => {
      if (!prev && next.rules[0]) return next.rules[0].id;
      if (next.rules[0] && !next.rules.some((r) => r.id === prev)) return next.rules[0].id;
      return prev;
    });
  }, []);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/capital/status", { cache: "no-store" });
    if (!res.ok) {
      setSignal(`Status sync failed (${res.status})`);
      return;
    }
    const data = (await res.json()) as CapitalQueueStatus;
    applyStatus(data);
    setSignal(`Updated ${new Date(data.updatedAt).toLocaleTimeString()}`);
  }, [applyStatus]);

  const loadBootstrap = useCallback(async () => {
    const json = await postCapital({ action: "dashboard_bootstrap" });
    if (json.status) applyStatus(json.status);
    if (json.goLive) setGoLive(json.goLive);
  }, [applyStatus]);

  const loadRecovery = useCallback(async () => {
    const json = await postCapital({ action: "recovery_list" });
    if (json.failed) setFailedTrades(json.failed);
    if (json.status) applyStatus(json.status);
  }, [applyStatus]);

  useEffect(() => {
    void loadBootstrap();
    void loadRecovery();
    const id = setInterval(() => void loadStatus(), 30_000);
    return () => clearInterval(id);
  }, [loadBootstrap, loadRecovery, loadStatus]);

  useEffect(() => {
    const rule = status?.rules.find((r) => r.id === selectedRuleId);
    if (!rule) return;
    updateWorkspaceContext({
      selectedRuleId: rule.id,
      selectedAsset: rule.asset,
      selectedRuleName: rule.name,
    });
  }, [selectedRuleId, status, updateWorkspaceContext]);

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;

    /** Already executed server-side in skill-executors — refresh desk only (avoid double trades). */
    const serverExecuted = new Set([
      "execute_trade",
      "sync_pilots",
      "create_rule_from_thesis",
      "subscribe_pilot",
      "research_ticker",
    ]);

    void (async () => {
      if (serverExecuted.has(lastSkillId)) {
        const res = await fetch("/api/capital/status", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as CapitalQueueStatus;
          applyStatus(data);
          if (lastSkillId === "execute_trade") {
            setSignal(formatTradeOutcomeMessage(data.trades[0]));
          } else if (lastSkillId === "sync_pilots") {
            setSignal("Pilot sync complete");
          } else if (lastSkillId === "create_rule_from_thesis") {
            setSignal("Rule created from thesis");
          } else if (lastSkillId === "subscribe_pilot") {
            setSignal("Pilot subscribed");
          } else if (lastSkillId === "research_ticker") {
            const sym =
              data.rules.find((r) => r.id === selectedRuleId)?.asset ?? data.watchlist[0] ?? "SPY";
            setResearchTicker(sym);
            setSignal(`Researching ${sym}`);
          }
        }
        return;
      }

      if (lastSkillId === "arm_rule") {
        const json = await postCapital({ action: "arm_rule", ruleId: selectedRuleId });
        if (json.status) applyStatus(json.status);
        setSignal(`${selectedRuleId} armed`);
      }
      if (lastSkillId === "create_rule") {
        const json = await postCapital({
          action: "create_rule",
          name: "Agent rule",
          asset: status?.watchlist[0] ?? "SPY",
        });
        if (json.status) applyStatus(json.status);
        setSignal("Rule created");
      }
      if (lastSkillId === "rebalance") {
        setSignal(`Rebalance simulated · ${new Date().toLocaleTimeString()}`);
      }
    })();
  }, [skillTick, lastSkillId, selectedRuleId, status, applyStatus]);

  useEffect(() => {
    if (!digital.latest) return;
    void postCapital({
      action: "receipt",
      receipt: digital.latest,
    }).then((json) => {
      if (json.status) applyStatus(json.status);
    });
  }, [digital.latest, applyStatus]);

  const openResearch = useCallback(
    (sym: string) => {
      setResearchTicker(sym);
      setActiveIntelSymbol(sym);
      updateWorkspaceContext({ selectedAsset: sym });
    },
    [updateWorkspaceContext],
  );

  const action = async (body: Record<string, unknown>) => {
    const json = await postCapital(body);
    if (json.status) applyStatus(json.status);
    if (json.error) setSignal(json.error);
    return json;
  };

  const portfolioHealth = status?.portfolioHealth ?? {
    score: 70,
    label: "healthy" as const,
    concentrationPct: 0,
    topHoldings: [],
    sectorNotes: [],
    suggestions: [],
  };

  const handlePfmSuggestion = useCallback(
    (suggestion: FinancialSuggestion) => {
      const payload = suggestion.actionPayload ?? {};
      if (suggestion.actionType === "create_dip_rule") {
        void action({
          action: "create_dip_rule",
          ticker: String(payload.ticker ?? "SPY"),
          dropPct: typeof payload.dropPct === "number" ? payload.dropPct : 5,
        }).then(() => setSignal(`PFM · dip rule for ${payload.ticker ?? "SPY"}`));
      } else if (suggestion.actionType === "add_watchlist") {
        void action({ action: "add_to_watchlist", ticker: String(payload.ticker ?? "SPY") }).then(() =>
          setSignal(`${payload.ticker ?? "SPY"} added from PFM`),
        );
      } else if (suggestion.actionType === "subscribe_pilot") {
        void action({
          action: "subscribe_pilot",
          pilotId: String(payload.pilotId ?? status?.pilots[0]?.id ?? "PILOT-NDAQ10"),
          allocationUsd: typeof payload.allocationUsd === "number" ? payload.allocationUsd : 1000,
        }).then(() => setSignal("Pilot subscribed from PFM suggestion"));
      } else if (suggestion.actionType === "set_goal_contribution" && payload.goalId) {
        void fetch("/api/capital/pfm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_goal",
            goalId: payload.goalId,
            monthlyContributionUsd:
              typeof payload.monthlyContributionUsd === "number" ? payload.monthlyContributionUsd : undefined,
          }),
        }).then(() => setSignal("Wealth goal updated"));
      }
    },
    [status?.pilots, action],
  );

  const pendingTrades = (status?.trades ?? []).filter((t) => t.status === "pending_approval");

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("my-capital").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Capital Claw Desk</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          {risk} risk · {mode}
          {mode === "live" && status?.source === "alpaca"
            ? " · Alpaca live"
            : status?.source === "alpaca"
              ? " · Alpaca paper"
              : " · demo · simulated fills OK"}{" "}
          · {signal}
          <ExperienceLevelBadge />
        </p>
      </header>

      <CapitalPendingTradesBanner
        trades={status?.trades ?? []}
        onApprove={(tradeId) =>
          void action({ action: "submit_trade", tradeId }).then((j) =>
            setSignal(
              formatTradeOutcomeMessage(
                (j as { trade?: CapitalTrade }).trade,
                typeof j.error === "string" ? j.error : null,
              ),
            ),
          )
        }
        onApproveAll={() => {
          void (async () => {
            for (const t of pendingTrades) {
              await action({ action: "submit_trade", tradeId: t.id });
            }
          })();
        }}
        onViewTradeLog={() =>
          document.getElementById("capital-trade-log")?.scrollIntoView({ behavior: "smooth" })
        }
      />

      {level !== "beginner" ? (
        <CapitalWatchlistIntelStrip
          watchlist={status?.watchlist ?? ["NVDA", "SPY", "BTC-USD"]}
          onTickerClick={openResearch}
        />
      ) : null}

      {level === "beginner" ? (
        <ExperienceAppSection appId="my-capital" sectionId="recent-trades" minLevel="beginner" title="Recent trades" subtitle="Last 5 executions · upgrade to Standard for full log">
          <CapitalRecentTradesStrip trades={status?.trades ?? []} />
        </ExperienceAppSection>
      ) : null}

      {level === "beginner" || (goLive && !goLive.ready) ? (
        <ExperienceAppSection appId="my-capital" sectionId="go-live" minLevel="beginner" title="Go Live" subtitle="Demo mode OK without broker keys · paper checklist when you connect Alpaca">
          <CapitalGoLivePanel
            report={goLive}
            demoTourRunning={demoTourRunning}
            onRunDemoTour={() => {
              setDemoTourRunning(true);
              void action({ action: "run_demo_tour" })
                .then((j) => {
                  const t = j as { ok?: boolean; tradeId?: string; error?: string };
                  if (j.status) applyStatus(j.status as CapitalQueueStatus);
                  if (t.tradeId) setSelectedTradeId(t.tradeId);
                  setSignal(t.ok ? "Demo tour complete · simulated fill" : t.error ?? "Demo tour failed");
                })
                .finally(() => setDemoTourRunning(false));
            }}
            onRefresh={() => void postCapital({ action: "go_live" }).then((j) => j.goLive && setGoLive(j.goLive))}
          />
        </ExperienceAppSection>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <AppMetric label="Portfolio" value={formatUsd(status?.portfolioValue ?? null)} unit={status?.portfolioLabel ?? "—"} highlight />
        <AppMetric label="Buying power" value={formatUsd(status?.buyingPower ?? null)} unit={status?.currency ?? "USD"} />
        <AppMetric label="Armed rules" value={String(status?.stats.armedRules ?? "—")} unit="active" />
        <AppMetric
          label="Daily P&L"
          value={status?.dailyPnlPct != null ? `${status.dailyPnlPct.toFixed(2)}%` : "—"}
          unit={status?.tradingPaused ? "paused" : "live"}
        />
      </div>

      <ExperienceAppSection appId="my-capital" sectionId="research" minLevel="beginner" title="Ticker research" subtitle="Price · smart take · headlines — chart & chatter unlock in Standard">
        <CapitalTickerIntelPanel
          watchlist={status?.watchlist ?? ["NVDA", "SPY", "BTC-USD"]}
          focusTicker={researchTicker}
          onTickerSelect={(sym) => {
            setResearchTicker(null);
            setActiveIntelSymbol(sym);
            updateWorkspaceContext({ selectedAsset: sym });
          }}
          onArmDipRule={(sym) =>
            void action({ action: "create_dip_rule", ticker: sym, dropPct: 5 }).then((j) => {
              if (j.status) applyStatus(j.status);
              setSignal(`Dip rule created for ${sym}`);
            })
          }
          onAddWatchlist={(sym) =>
            void action({ action: "add_to_watchlist", ticker: sym }).then((j) => {
              if (j.status) applyStatus(j.status);
              setSignal(`${sym} added to watchlist`);
            })
          }
          onCreateRuleFromThesis={(sym) =>
            void action({ action: "create_rule_from_thesis", ticker: sym }).then((j) => {
              if (j.status) applyStatus(j.status);
              setSignal(`Rule created from ${sym} thesis`);
            })
          }
        />
      </ExperienceAppSection>

      <ExperienceAppSection appId="my-capital" sectionId="intel-alerts" minLevel="standard" title="Intel alerts" subtitle="Telegram/Slack nudge when dip or sentiment triggers">
        <CapitalIntelAlertsPanel symbol={activeIntelSymbol ?? researchTicker ?? status?.watchlist[0] ?? null} />
      </ExperienceAppSection>

      <ExperienceAppSection appId="my-capital" sectionId="digest" minLevel="standard" title="Market intel digest" subtitle="CNBC + WSB + Reddit + FinTwit across your watchlist">
        <CapitalMarketDigestPanel onTickerClick={(t) => setResearchTicker(t)} />
      </ExperienceAppSection>

      <ExperienceAppSection appId="my-capital" sectionId="pilots" minLevel="beginner" title="Pilot marketplace" subtitle="Choose a portfolio · allocate · auto-mirror trades">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() =>
              void action({ action: "refresh_pilot_feeds" }).then(() => setSignal("Pilot SEC feeds refreshed"))
            }
            className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase text-muted hover:text-stark"
          >
            Refresh live SEC feeds
          </button>
        </div>
        <CapitalPilotMarketplacePanel
          pilots={status?.pilots ?? []}
          subscribedPilotIds={(status?.subscriptions ?? []).map((s) => s.pilotId)}
          onSubscribe={(pilotId, allocationUsd) =>
            void action({ action: "subscribe_pilot", pilotId, allocationUsd }).then(() =>
              setSignal(`Subscribed to ${pilotId}`),
            )
          }
          onHoldingClick={openResearch}
        />
      </ExperienceAppSection>

      <ExperienceAppSection appId="my-capital" sectionId="subscriptions" minLevel="standard" title="Your pilots" subtitle="Pause · re-sync · unsubscribe">
        <CapitalSubscriptionsPanel
          subscriptions={status?.subscriptions ?? []}
          pilots={status?.pilots ?? []}
          signals={status?.pilotSignals ?? []}
          onPause={(id) => void action({ action: "pause_subscription", subscriptionId: id })}
          onResume={(id) => void action({ action: "resume_subscription", subscriptionId: id })}
          onUnsubscribe={(id) => void action({ action: "unsubscribe_pilot", subscriptionId: id })}
          onSync={(id) => void action({ action: "sync_pilot_subscription", subscriptionId: id })}
        />
      </ExperienceAppSection>

      <ExperienceAppSection appId="my-capital" sectionId="risk" minLevel="beginner" title="Risk & permissions" subtitle="Crisis mode · autonomous trading · guardrails">
        <CapitalPermissionsPanel
          permissions={status?.permissions ?? { autonomousMode: "off", autonomousGrantedAt: null, allowedBrokers: [], activeBrokerId: "alpaca", maxAutoTradesPerDay: 10, tradingviewWebhookSecret: null, liveMoneyConfirmedAt: null }}
          riskLimits={status?.riskLimits ?? { maxPositionPct: 15, maxDailyLossPct: 4, maxSectorPct: 40, pdtGuard: true }}
          tradingPaused={status?.tradingPaused ?? false}
          dailyPnlPct={status?.dailyPnlPct ?? 0}
          tradingMode={mode}
          liveEnvEnabled={status?.liveEnvEnabled ?? false}
          goLiveReady={Boolean(goLive?.ready)}
          onSetAutonomous={(m) => void action({ action: "set_autonomous_mode", autonomousMode: m })}
          onToggleCrisis={(paused) => void action({ action: "set_trading_paused", paused })}
          onConfirmLiveMoney={() =>
            void action({ action: "confirm_live_money" }).then((j) => {
              if (j.goLive) setGoLive(j.goLive);
              if (j.status) applyStatus(j.status);
              setSignal(j.ok ? "Live money confirmed" : j.error ?? "Confirm failed");
            })
          }
          onSetTradingMode={(nextMode) =>
            void action({ action: "set_trading_mode", mode: nextMode }).then((j) => {
              if (j.goLive) setGoLive(j.goLive);
              if (j.status) applyStatus(j.status);
              setSignal(j.ok ? `Trading mode · ${nextMode}` : j.error ?? "Mode change failed");
            })
          }
        />
      </ExperienceAppSection>

      <ExperienceAppSection appId="my-capital" sectionId="auto-approval" minLevel="standard" title="Auto-approval stack" subtitle="Sovereign execution policy · paper-first · notional caps">
        <CapitalAutoApprovalPanel
          policy={status?.autoApproval ?? defaultAutoApprovalPolicy()}
          tradingMode={mode}
          onUpdate={(patch) => void action({ action: "set_auto_approval", autoApproval: patch })}
        />
      </ExperienceAppSection>

      <ExperienceAppSection appId="my-capital" sectionId="agent-trading" minLevel="standard" title="Agent & MCP trading" subtitle="Claude · Cursor · Claw chat · review before execute">
        <CapitalAgentTradingPanel
          autoApproval={status?.autoApproval ?? defaultAutoApprovalPolicy()}
          auditLog={status?.agentAuditLog ?? []}
          selectedAsset={
            status?.rules.find((r) => r.id === selectedRuleId)?.asset ?? status?.watchlist[0] ?? "SPY"
          }
          signal={signal}
          onKillSwitch={(enabled) =>
            void action({ action: "set_agent_kill_switch", agentKillSwitch: enabled }).then(() =>
              setSignal(enabled ? "Agent kill switch ON" : "Agent kill switch cleared"),
            )
          }
          onAgentExecute={async (input) => {
            const j = await action({
              action: "agent_execute_trade",
              ticker: input.ticker,
              qty: input.qty,
              actionTrade: input.action,
              confirm: input.confirm,
            });
            const r = j as {
              phase?: string;
              error?: string;
              preview?: import("@/lib/capital-queue-types").TradePreview;
              trade?: CapitalTrade;
            };
            setSignal(formatAgentPhaseMessage(r));
            return r;
          }}
        />
      </ExperienceAppSection>

      {level !== "beginner" ? (
        <ExperienceAppSection appId="my-capital" sectionId="pfm" minLevel="standard" title="Personal finance" subtitle="Cash flow · spending · wealth goals · Mint-style insights on-appliance">
          <CapitalPlaidLinkSection onLinked={() => void loadStatus()} />
          <CapitalPfmPanel onSuggestionAction={handlePfmSuggestion} />
        </ExperienceAppSection>
      ) : null}

      {level !== "beginner" ? (
        <ExperienceAppSection appId="my-capital" sectionId="portfolio-health" minLevel="standard" title="Portfolio health" subtitle="Concentration · sector mix · rebalance hints">
          <CapitalPortfolioHealthPanel health={portfolioHealth} />
        </ExperienceAppSection>
      ) : null}

      <ExperienceAppSection appId="my-capital" sectionId="movers" minLevel="standard" title="Movers & positions" subtitle="Quote cache · Alpaca sync">
        <CapitalMoversPanel
          movers={status?.movers ?? []}
          positions={status?.positions ?? []}
          onSymbolClick={openResearch}
        />
      </ExperienceAppSection>

      <ExperienceAppSection appId="my-capital" sectionId="brokers" minLevel="standard" title="Broker integrations" subtitle="Alpaca live · TradingView webhook · Robinhood MCP">
        <CapitalBrokersPanel
          brokers={status?.brokers ?? []}
          activeBrokerId={status?.permissions.activeBrokerId}
          tvWebhookSecret={status?.permissions.tradingviewWebhookSecret ?? null}
          envTvSecretConfigured={Boolean(
            status?.brokers.find((b) => b.id === "tradingview")?.configured &&
              !status?.permissions.tradingviewWebhookSecret,
          )}
          onTvRefresh={() => void loadStatus()}
          onSetActive={(brokerId) =>
            void action({ action: "set_active_broker", brokerId }).then(() =>
              setSignal(`Active broker · ${brokerId}`),
            )
          }
          onLink={async (brokerId) => {
            if (brokerId === "robinhood_mcp") {
              const res = await fetch("/api/capital/robinhood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start" }),
              });
              const json = (await res.json()) as { instructions?: string[]; mcpUrl?: string };
              const ok = window.confirm(
                `Robinhood MCP:\n${json.instructions?.join("\n") ?? json.mcpUrl ?? "Complete OAuth on desktop"}\n\nMark connected after OAuth?`,
              );
              if (ok) {
                await fetch("/api/capital/robinhood", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "mark_connected" }),
                });
                await loadStatus();
                setSignal("Robinhood MCP marked connected");
              }
              return;
            }
            if (brokerId === "snaptrade") {
              const res = await fetch("/api/capital/snaptrade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start" }),
              });
              const json = (await res.json()) as { loginLink?: string; error?: string };
              if (json.loginLink) {
                window.open(json.loginLink, "_blank", "noopener,noreferrer");
                const ok = window.confirm("Complete SnapTrade broker linking in the new tab, then mark connected?");
                if (ok) {
                  await fetch("/api/capital/snaptrade", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "mark_linked" }),
                  });
                  await loadStatus();
                  setSignal("SnapTrade marked linked");
                }
              } else {
                setSignal(json.error ?? "SnapTrade link failed");
              }
              return;
            }
            const path = brokerId === "etrade" ? "/api/capital/etrade" : "/api/capital/webull";
            const res = await fetch(path, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "start" }),
            });
            const json = (await res.json()) as { authorizeUrl?: string; error?: string };
            if (json.authorizeUrl) {
              window.open(json.authorizeUrl, "_blank", "noopener,noreferrer");
              setSignal(`Authorize ${brokerId} in the new tab`);
            } else {
              setSignal(json.error ?? "Broker link failed");
            }
          }}
          onUnlink={async (brokerId) => {
            if (brokerId === "robinhood_mcp") {
              await fetch("/api/capital/robinhood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "unlink" }),
              });
              await loadStatus();
              setSignal("Robinhood MCP unlinked");
              return;
            }
            if (brokerId === "snaptrade") {
              await fetch("/api/capital/snaptrade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "unlink" }),
              });
              await loadStatus();
              setSignal("SnapTrade unlinked");
              return;
            }
            const path = brokerId === "etrade" ? "/api/capital/etrade" : "/api/capital/webull";
            await fetch(path, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "unlink" }),
            });
            await loadStatus();
            setSignal(`${brokerId} unlinked`);
          }}
        />
      </ExperienceAppSection>

      <ExperienceAppSection appId="my-capital" sectionId="portfolio" minLevel="beginner" title="Rule engine" subtitle="WHEN / THEN · Arm · Execute via digital bridge">
        <CapitalRulesPanel
          rules={status?.rules ?? []}
          selectedRuleId={selectedRuleId}
          defaultAsset={status?.watchlist[0] ?? "NVDA"}
          onSelect={setSelectedRuleId}
          onToggle={(id) => void action({ action: "toggle_rule", ruleId: id })}
          onExecute={(id) =>
            void action({ action: "execute_trade", ruleId: id }).then((j) =>
              setSignal(
                formatTradeOutcomeMessage(
                  (j as { trade?: CapitalTrade }).trade,
                  typeof j.error === "string" ? j.error : null,
                ),
              ),
            )
          }
          onCreateStructured={(input) =>
            void action({
              action: "create_rule",
              name: input.name,
              asset: input.asset,
              conditionType: input.conditionType,
              conditionParams: input.conditionParams,
              actionTrade: input.action,
              qty: input.qty,
              takeProfitPct: input.takeProfitPct,
              stopLossPct: input.stopLossPct,
            }).then(() => setSignal(`Rule created · ${input.name}`))
          }
          onCreate={() => {}}
        />
      </ExperienceAppSection>

      <div id="capital-trade-log">
        <ExperienceAppSection appId="my-capital" sectionId="trades" minLevel="standard" title="Trade log" subtitle="Paper orders · simulated · recovery">
          <CapitalTradeLogPanel
            trades={status?.trades ?? []}
            selectedTradeId={selectedTradeId}
            onSelect={setSelectedTradeId}
            onRetry={(tradeId) => void action({ action: "recovery_retry", tradeId })}
            onApprove={(tradeId) => void action({ action: "submit_trade", tradeId })}
          />
          <div className="mt-3">
            <CapitalTradeDecisionPanel
              trade={status?.trades.find((t) => t.id === selectedTradeId) ?? status?.trades[0] ?? null}
            />
          </div>
        </ExperienceAppSection>
      </div>

      {level !== "beginner" ? (
        <ExperienceAppSection appId="my-capital" sectionId="recovery" minLevel="standard" title="Trade recovery" subtitle="Retry failed Alpaca submissions">
          <CapitalRecoveryPanel
            failed={failedTrades}
            onRetry={(tradeId) => void action({ action: "recovery_retry", tradeId })}
            onRefresh={() => void loadRecovery()}
          />
        </ExperienceAppSection>
      ) : null}

      <DigitalReceiptPanel
        title="Trade Execution Receipts"
        toolFilter="capital.execute_trade"
        receipts={digital.receipts}
        latest={digital.latest}
        connected={digital.connected}
        formatReceipt={formatTradeReceipt}
      />
    </div>
  );
}
