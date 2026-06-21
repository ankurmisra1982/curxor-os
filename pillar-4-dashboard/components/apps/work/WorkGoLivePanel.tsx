"use client";

export type WorkGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface WorkGoLiveStepRow {
  id: string;
  label: string;
  status: WorkGoLiveStepStatus;
  detail: string;
}

export interface WorkGoLiveReportRow {
  ready: boolean;
  partiallyReady?: boolean;
  progress: { complete: number; total: number };
  steps: WorkGoLiveStepRow[];
  today: {
    nextScheduledAt: string | null;
    nextSequenceId: string | null;
    activeSequences: number;
    pendingSends: number;
    openTasks: number;
  };
}

function statusIcon(status: WorkGoLiveStepStatus): string {
  if (status === "complete") return "✓";
  if (status === "warning") return "!";
  if (status === "optional") return "○";
  return "·";
}

function statusClass(status: WorkGoLiveStepStatus): string {
  if (status === "complete") return "text-cursor-glow";
  if (status === "warning") return "text-amber-400";
  if (status === "optional") return "text-muted";
  return "text-stark";
}

interface WorkGoLivePanelProps {
  report: WorkGoLiveReportRow | null;
  onRefresh: () => void;
}

export function WorkGoLivePanel({ report, onRefresh }: WorkGoLivePanelProps) {
  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading go-live checklist…</p>;
  }

  const { steps, progress, ready, partiallyReady, today } = report;
  const label = ready
    ? "Ready to send"
    : partiallyReady
      ? `Partially ready · ${progress.complete}/${progress.total}`
      : `Go live · ${progress.complete}/${progress.total}`;

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={ready ? "text-cursor-glow uppercase" : "text-amber-400 uppercase"}>{label}</span>
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Refresh
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Active seq</p>
          <p className="text-stark">{today.activeSequences}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Pending sends</p>
          <p className="text-stark">{today.pendingSends}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Open tasks</p>
          <p className="text-stark">{today.openTasks}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Next send</p>
          <p className="text-stark truncate">{today.nextScheduledAt ? new Date(today.nextScheduledAt).toLocaleString() : "—"}</p>
        </div>
      </div>
      <ul className="space-y-1">
        {steps.map((step) => (
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
