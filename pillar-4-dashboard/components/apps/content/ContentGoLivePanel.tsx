"use client";

export type GoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface GoLiveStepRow {
  id: string;
  label: string;
  status: GoLiveStepStatus;
  detail: string;
}

export interface GoLiveTodayRow {
  nextScheduledAt: string | null;
  nextScheduledPostId: string | null;
  pendingApprovals: number;
  recoveryCount: number;
  publishingPaused: boolean;
}

export interface GoLiveReportRow {
  ready: boolean;
  partiallyReady?: boolean;
  progress: { complete: number; total: number };
  steps: GoLiveStepRow[];
  today: GoLiveTodayRow;
}

function statusIcon(status: GoLiveStepStatus): string {
  if (status === "complete") return "✓";
  if (status === "warning") return "!";
  if (status === "optional") return "○";
  return "·";
}

function statusClass(status: GoLiveStepStatus): string {
  if (status === "complete") return "text-cursor-glow";
  if (status === "warning") return "text-amber-400";
  if (status === "optional") return "text-muted";
  return "text-stark";
}

interface ContentGoLivePanelProps {
  report: GoLiveReportRow | null;
  onRefresh: () => void;
  onOpenWizard: () => void;
}

export function ContentGoLivePanel({ report, onRefresh, onOpenWizard }: ContentGoLivePanelProps) {
  if (!report) {
    return (
      <p className="font-mono text-[10px] text-muted">Loading go-live checklist…</p>
    );
  }

  const { today, steps, progress, ready, partiallyReady } = report;

  const statusLabel = ready
    ? "Ready to publish"
    : partiallyReady
      ? `Partially ready · ${progress.complete}/${progress.total}`
      : `Go live · ${progress.complete}/${progress.total}`;

  const headerStatusClass = ready ? "text-cursor-glow" : partiallyReady ? "text-stark" : "text-amber-400";

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${headerStatusClass} uppercase`}>{statusLabel}</span>
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Refresh
        </button>
        {!ready ? (
          <button type="button" onClick={onOpenWizard} className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow">
            Start wizard
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Next scheduled</p>
          <p className="mt-0.5 text-stark">
            {today.nextScheduledAt
              ? `${today.nextScheduledPostId} · ${new Date(today.nextScheduledAt).toLocaleString()}`
              : "None"}
          </p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Pending approval</p>
          <p className="mt-0.5 text-stark">{today.pendingApprovals}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Failed publishes</p>
          <p className={`mt-0.5 ${today.recoveryCount > 0 ? "text-amber-400" : "text-stark"}`}>{today.recoveryCount}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Publishing</p>
          <p className={`mt-0.5 ${today.publishingPaused ? "text-red-400" : "text-cursor-glow"}`}>
            {today.publishingPaused ? "Paused" : "Active"}
          </p>
        </div>
      </div>

      <ol className="space-y-1.5">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-2 border border-line/40 px-2 py-1.5">
            <span className={`w-4 shrink-0 ${statusClass(step.status)}`}>{statusIcon(step.status)}</span>
            <div className="min-w-0">
              <p className={statusClass(step.status)}>{step.label}</p>
              <p className="mt-0.5 text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
