"use client";

export type CapitalGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface CapitalGoLiveStepRow {
  id: string;
  label: string;
  status: CapitalGoLiveStepStatus;
  detail: string;
}

export interface CapitalGoLiveReportRow {
  ready: boolean;
  demoReady?: boolean;
  paperReady?: boolean;
  partiallyReady?: boolean;
  progress: { complete: number; total: number };
  steps: CapitalGoLiveStepRow[];
  today: {
    armedRules: number;
    failedTrades: number;
    filledToday: number;
    tradingPaused: boolean;
  };
}

function statusIcon(status: CapitalGoLiveStepStatus): string {
  if (status === "complete") return "✓";
  if (status === "warning") return "!";
  return "·";
}

function statusClass(status: CapitalGoLiveStepStatus): string {
  if (status === "complete") return "text-cursor-glow";
  if (status === "warning") return "text-amber-400";
  return "text-stark";
}

interface CapitalGoLivePanelProps {
  report: CapitalGoLiveReportRow | null;
  onRefresh: () => void;
  onRunDemoTour?: () => void;
  demoTourRunning?: boolean;
  armedRuleId?: string | null;
  onExecuteNow?: () => void;
  executeRunning?: boolean;
}

export function CapitalGoLivePanel({
  report,
  onRefresh,
  onRunDemoTour,
  demoTourRunning,
  armedRuleId,
  onExecuteNow,
  executeRunning,
}: CapitalGoLivePanelProps) {
  if (!report) return <p className="font-mono text-[10px] text-muted">Loading go-live checklist…</p>;

  const alpacaStep = report.steps.find((s) => s.id === "alpaca");
  const demoRelease = alpacaStep?.status === "warning";

  const label = report.ready
    ? report.paperReady
      ? "Ready to trade (paper bridge)"
      : report.demoReady
        ? "Demo ready — sovereign desk live"
        : report.steps.some((s) => s.id === "live_money" && s.status === "complete" && report.steps.find((x) => x.id === "paper")?.detail?.includes("live"))
          ? "Ready to trade (live)"
          : "Ready to trade (paper)"
    : report.demoReady
      ? `Demo ready · ${report.progress.complete}/${report.progress.total} full checklist`
      : report.partiallyReady
        ? `Partially ready · ${report.progress.complete}/${report.progress.total}`
        : `Go live · ${report.progress.complete}/${report.progress.total}`;

  return (
    <div className="space-y-3 font-mono text-[10px]">
      {demoRelease ? (
        <div className="border border-cursor-glow/40 bg-cursor-glow/5 px-3 py-2 text-[10px] text-muted">
          <span className="uppercase tracking-widest text-cursor-glow">Demo mode</span>
          <p className="mt-1">
            No broker keys configured — expected for this release. Rules, research, and trade log work locally;
            Alpaca / Plaid / SnapTrade setup is deferred (see Go Live when ready).
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className={report.ready ? "text-cursor-glow uppercase" : "text-amber-400 uppercase"}>{label}</span>
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Refresh
        </button>
        {onRunDemoTour ? (
          <button
            type="button"
            disabled={demoTourRunning}
            onClick={onRunDemoTour}
            className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
          >
            {demoTourRunning ? "Running tour…" : "Run demo tour"}
          </button>
        ) : null}
        {armedRuleId && onExecuteNow ? (
          <button
            type="button"
            disabled={executeRunning || demoTourRunning}
            onClick={onExecuteNow}
            className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
          >
            {executeRunning ? "Executing…" : "Execute now"}
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Armed</p>
          <p className="text-stark">{report.today.armedRules}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Filled today</p>
          <p className="text-stark">{report.today.filledToday}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Failed</p>
          <p className="text-stark">{report.today.failedTrades}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Paused</p>
          <p className="text-stark">{report.today.tradingPaused ? "YES" : "NO"}</p>
        </div>
      </div>
      <ul className="space-y-1">
        {report.steps.map((step) => (
          <li key={step.id} className="grid grid-cols-[auto_1fr] gap-2 border border-line/40 px-2 py-1">
            <span className={statusClass(step.status)}>{statusIcon(step.status)}</span>
            <div>
              <p className="text-stark">{step.label}</p>
              <p className="text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
