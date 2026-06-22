"use client";

import type { CapitalTradeAnalytics, PortfolioBenchmark, RuleScorecard } from "@/lib/capital-analytics-types";

interface CapitalAnalyticsPanelProps {
  analytics: CapitalTradeAnalytics;
  benchmark: PortfolioBenchmark;
  onRefresh?: () => void;
}

export function CapitalAnalyticsPanel({ analytics, benchmark, onRefresh }: CapitalAnalyticsPanelProps) {
  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-cursor-glow">Desk analytics</span>
        {onRefresh ? (
          <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted hover:text-stark">
            Refresh
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Filled today" value={String(analytics.filledToday)} />
        <Metric label="Simulated total" value={String(analytics.simulatedTotal)} />
        <Metric label="Pending approval" value={String(analytics.pendingApproval)} highlight={analytics.pendingApproval > 0} />
        <Metric label="Failed" value={String(analytics.failedTotal)} highlight={analytics.failedTotal > 0} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Win rate (sells)" value={analytics.winRatePct != null ? `${analytics.winRatePct}%` : "—"} />
        <Metric label="Avg notional" value={analytics.avgNotionalUsd != null ? `$${analytics.avgNotionalUsd}` : "—"} />
        <Metric label="Daily P&L" value={analytics.dailyPnlPct != null ? `${analytics.dailyPnlPct.toFixed(2)}%` : "—"} />
      </div>
      <div className="border border-line/60 p-2">
        <p className="text-[10px] uppercase text-muted">Portfolio benchmark</p>
        <p className="mt-1 text-stark">
          Portfolio {benchmark.portfolioReturnPct ?? "—"}% · SPY proxy {benchmark.spyReturnPct ?? "—"}% · Alpha{" "}
          {benchmark.alphaPct != null ? `${benchmark.alphaPct > 0 ? "+" : ""}${benchmark.alphaPct}%` : "—"}
        </p>
        <p className="text-[10px] text-muted">{benchmark.label}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <SourceBlock title="By source" data={analytics.bySource} />
        <SourceBlock title="By status" data={analytics.byStatus} />
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border px-2 py-1.5 ${highlight ? "border-amber-400/60" : "border-line/60"}`}>
      <p className="text-[10px] uppercase text-muted">{label}</p>
      <p className={highlight ? "text-amber-400" : "text-stark"}>{value}</p>
    </div>
  );
}

function SourceBlock({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <div className="border border-line/40 p-2">
      <p className="mb-1 text-[10px] uppercase text-muted">{title}</p>
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between text-[10px]">
          <span className="text-muted">{k}</span>
          <span className="text-stark">{v}</span>
        </div>
      ))}
    </div>
  );
}

interface CapitalRuleScorecardPanelProps {
  scorecards: RuleScorecard[];
  onSelectRule?: (ruleId: string) => void;
  onWalkForward?: (ruleId: string) => void;
  walkForwardNote?: string | null;
}

export function CapitalRuleScorecardPanel({
  scorecards,
  onSelectRule,
  onWalkForward,
  walkForwardNote,
}: CapitalRuleScorecardPanelProps) {
  if (scorecards.length === 0) {
    return <p className="font-mono text-[10px] text-muted">No rules yet — create one in Trade tab.</p>;
  }
  return (
    <div className="space-y-2 font-mono text-xs">
      <p className="text-[10px] uppercase tracking-widest text-muted">Rule scorecard</p>
      {walkForwardNote ? <p className="text-[10px] text-cursor-glow">{walkForwardNote}</p> : null}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase text-muted">
            <th className="py-1 text-left">Rule</th>
            <th className="py-1 text-right">Fills</th>
            <th className="py-1 text-right">Backtest</th>
            <th className="py-1 text-right">vs SPY</th>
            <th className="py-1 text-right">State</th>
          </tr>
        </thead>
        <tbody>
          {scorecards.map((s) => (
            <tr
              key={s.ruleId}
              className="cursor-pointer border-b border-line/40 hover:bg-panel/50"
              onClick={() => onSelectRule?.(s.ruleId)}
            >
              <td className="py-1.5">
                <div className="text-cursor-glow">{s.ruleId}</div>
                <div className="text-[10px] text-muted">{s.ruleName} · {s.asset}</div>
              </td>
              <td className="py-1.5 text-right text-stark">{s.fillsLive}</td>
              <td className="py-1.5 text-right text-stark">
                {s.strategyReturnPct != null ? `${s.strategyReturnPct}%` : "—"}
              </td>
              <td className="py-1.5 text-right">
                {s.alphaVsSpyPct != null ? (
                  <span className={s.alphaVsSpyPct >= 0 ? "text-cursor-glow" : "text-red-400"}>
                    {s.alphaVsSpyPct > 0 ? "+" : ""}
                    {s.alphaVsSpyPct}%
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-1.5 text-right">
                <span className={s.state === "ARMED" ? "text-cursor-glow" : "text-muted"}>{s.state}</span>
                {onWalkForward ? (
                  <button
                    type="button"
                    className="ml-1 border border-line px-1 text-[9px] uppercase text-muted hover:text-stark"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWalkForward(s.ruleId);
                    }}
                  >
                    WF
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CapitalNlQueryPanelProps {
  onQuery: (q: string) => Promise<{ answer: string; intent: string } | null>;
  lastAnswer: string | null;
}

export function CapitalNlQueryPanel({ onQuery, lastAnswer }: CapitalNlQueryPanelProps) {
  const examples = ["NVDA exposure", "armed rules", "trades today", "portfolio health", "pending approval"];

  return (
    <div className="space-y-2 font-mono text-xs">
      <p className="text-[10px] uppercase tracking-widest text-muted">Portfolio Q&A</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const q = String(fd.get("q") ?? "").trim();
          if (q) void onQuery(q);
        }}
        className="flex gap-2"
      >
        <input
          name="q"
          placeholder="Ask about exposure, rules, health…"
          className="min-w-0 flex-1 border border-line bg-transparent px-2 py-1 text-[10px] text-stark outline-none focus:border-cursor-glow"
        />
        <button type="submit" className="border border-cursor-glow px-2 py-1 text-[10px] uppercase text-cursor-glow">
          Ask
        </button>
      </form>
      <div className="flex flex-wrap gap-1">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => void onQuery(ex)}
            className="border border-line/60 px-2 py-0.5 text-[9px] text-muted hover:border-cursor-glow hover:text-stark"
          >
            {ex}
          </button>
        ))}
      </div>
      {lastAnswer ? (
        <div className="border border-cursor-glow/30 bg-cursor-glow/5 px-3 py-2 text-[10px] text-stark">{lastAnswer}</div>
      ) : null}
    </div>
  );
}

interface CapitalCoachBannerProps {
  tip: string;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function CapitalCoachBanner({ tip, onDismiss, actionLabel, onAction }: CapitalCoachBannerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border border-cursor-glow/40 bg-cursor-glow/5 px-3 py-2 font-mono text-[10px]">
      <span className="uppercase tracking-widest text-cursor-glow">Coach</span>
      <span className="flex-1 text-muted">{tip}</span>
      {onAction && actionLabel ? (
        <button type="button" onClick={onAction} className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow">
          {actionLabel}
        </button>
      ) : null}
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="text-muted hover:text-stark">
          ✕
        </button>
      ) : null}
    </div>
  );
}

interface CapitalUnlockNudgeProps {
  message: string;
  onUpgrade: () => void;
}

export function CapitalUnlockNudge({ message, onUpgrade }: CapitalUnlockNudgeProps) {
  return (
    <div className="border border-line bg-panel px-3 py-2 font-mono text-[10px]">
      <p className="text-stark">{message}</p>
      <button type="button" onClick={onUpgrade} className="mt-2 border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow">
        Unlock Standard desk
      </button>
    </div>
  );
}

interface CapitalBenchmarkStripProps {
  benchmark: PortfolioBenchmark;
}

export function CapitalBenchmarkStrip({ benchmark }: CapitalBenchmarkStripProps) {
  return (
    <div className="flex flex-wrap gap-3 border border-line/40 bg-panel/30 px-3 py-1.5 font-mono text-[10px] text-muted">
      <span>
        Portfolio <span className="text-stark">{benchmark.portfolioReturnPct ?? "—"}%</span>
      </span>
      <span>
        vs SPY <span className="text-stark">{benchmark.spyReturnPct ?? "—"}%</span>
      </span>
      {benchmark.alphaPct != null ? (
        <span>
          Alpha{" "}
          <span className={benchmark.alphaPct >= 0 ? "text-cursor-glow" : "text-red-400"}>
            {benchmark.alphaPct > 0 ? "+" : ""}
            {benchmark.alphaPct}%
          </span>
        </span>
      ) : null}
    </div>
  );
}
