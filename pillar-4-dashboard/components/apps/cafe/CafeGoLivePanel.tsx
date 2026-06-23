"use client";

export type CafeGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface CafeGoLiveStepRow {
  id: string;
  label: string;
  status: CafeGoLiveStepStatus;
  detail: string;
}

export interface CafeGoLiveReportRow {
  ready: boolean;
  demoReady: boolean;
  partiallyReady: boolean;
  progress: { complete: number; total: number };
  steps: CafeGoLiveStepRow[];
  inferenceBackend: string;
  optOut?: boolean;
}

function statusIcon(status: CafeGoLiveStepStatus): string {
  if (status === "complete") return "✓";
  if (status === "warning") return "!";
  if (status === "optional") return "○";
  return "·";
}

function statusClass(status: CafeGoLiveStepStatus): string {
  if (status === "complete") return "text-cursor-glow";
  if (status === "warning") return "text-amber-400";
  if (status === "optional") return "text-muted";
  return "text-stark";
}

interface CafeGoLivePanelProps {
  report: CafeGoLiveReportRow | null;
  onRefresh: () => void;
  onRunDemoTour?: () => void;
  demoTourRunning?: boolean;
}

export function CafeGoLivePanel({
  report,
  onRefresh,
  onRunDemoTour,
  demoTourRunning,
}: CafeGoLivePanelProps) {
  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading go-live checklist…</p>;
  }

  const { steps, progress, ready, partiallyReady, demoReady, inferenceBackend, optOut } = report;

  const label = ready
    ? "Cafe ready"
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
            Inference {inferenceBackend}
            {optOut ? " · gamification off" : ""}
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
              disabled={demoTourRunning || optOut}
              onClick={onRunDemoTour}
              className="border border-cursor-glow px-3 py-1 uppercase tracking-widest text-cursor-glow disabled:opacity-40"
            >
              {demoTourRunning ? "Running tour…" : "Run demo tour"}
            </button>
          ) : null}
        </div>
      </div>
      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-2 border border-line/40 px-2 py-1.5">
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
