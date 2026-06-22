"use client";

export type ForgeGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface ForgeGoLiveStepRow {
  id: string;
  label: string;
  status: ForgeGoLiveStepStatus;
  detail: string;
}

export interface ForgeGoLiveReportRow {
  ready: boolean;
  demoReady?: boolean;
  partiallyReady?: boolean;
  progress: { complete: number; total: number };
  steps: ForgeGoLiveStepRow[];
  fleetTotal: number;
  forgedCount: number;
  inferenceBackend: string;
}

function statusIcon(status: ForgeGoLiveStepStatus): string {
  if (status === "complete") return "✓";
  if (status === "warning") return "!";
  if (status === "optional") return "○";
  return "·";
}

function statusClass(status: ForgeGoLiveStepStatus): string {
  if (status === "complete") return "text-cursor-glow";
  if (status === "warning") return "text-amber-400";
  if (status === "optional") return "text-muted";
  return "text-stark";
}

interface ForgeGoLivePanelProps {
  report: ForgeGoLiveReportRow | null;
  onRefresh: () => void;
  onRunDemoTour?: () => void;
  demoTourRunning?: boolean;
}

export function ForgeGoLivePanel({
  report,
  onRefresh,
  onRunDemoTour,
  demoTourRunning,
}: ForgeGoLivePanelProps) {
  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading go-live checklist…</p>;
  }

  const { steps, progress, ready, partiallyReady, demoReady, fleetTotal, forgedCount, inferenceBackend } =
    report;

  const label = ready
    ? "Forge ready"
    : demoReady
      ? `Demo ready · ${progress.complete}/${progress.total}`
      : partiallyReady
        ? `Partially ready · ${progress.complete}/${progress.total}`
        : `Go live · ${progress.complete}/${progress.total}`;

  const headerStatusClass = ready || demoReady ? "text-cursor-glow" : partiallyReady ? "text-stark" : "text-amber-400";

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-panel px-3 py-2">
        <div>
          <span className={`uppercase tracking-widest ${headerStatusClass}`}>{label}</span>
          <p className="mt-1 text-muted">
            {fleetTotal} profile(s) · {forgedCount} forged desk(s) · inference {inferenceBackend}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="border border-line px-3 py-1 uppercase tracking-widest text-muted hover:text-cursor-glow"
          >
            Refresh
          </button>
          {onRunDemoTour ? (
            <button
              type="button"
              disabled={demoTourRunning}
              onClick={onRunDemoTour}
              className="border border-cursor-glow px-3 py-1 uppercase tracking-widest text-cursor-glow disabled:opacity-40"
            >
              {demoTourRunning ? "Running tour…" : "Run demo tour"}
            </button>
          ) : null}
        </div>
      </div>

      {demoReady && !ready ? (
        <div className="border border-cursor-glow/40 bg-cursor-glow/5 px-3 py-2 text-muted">
          <span className="uppercase tracking-widest text-cursor-glow">Demo mode</span>
          <p className="mt-1">
            FRE + fleet mint is enough for GTM walkthrough. Framework desk recommended for nav demo — run demo tour
            to mint a blank desk automatically.
          </p>
        </div>
      ) : null}

      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-2 border border-line/60 bg-void/40 px-3 py-2">
            <span className={statusClass(step.status)}>{statusIcon(step.status)}</span>
            <div>
              <p className="uppercase tracking-widest text-stark">{step.label}</p>
              <p className="mt-0.5 text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
