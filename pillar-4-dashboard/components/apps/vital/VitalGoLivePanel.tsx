"use client";

export type VitalGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface VitalGoLiveStepRow {
  id: string;
  label: string;
  status: VitalGoLiveStepStatus;
  detail: string;
}

export interface VitalGoLiveReportRow {
  ready: boolean;
  demoReady?: boolean;
  partiallyReady?: boolean;
  progress: { complete: number; total: number };
  steps: VitalGoLiveStepRow[];
  today: {
    vitalsCount: number;
    protocolSteps: number;
    reportsCount: number;
    meshPublished: boolean;
  };
}

function statusIcon(status: VitalGoLiveStepStatus): string {
  if (status === "complete") return "✓";
  if (status === "warning") return "!";
  if (status === "optional") return "○";
  return "·";
}

function statusClass(status: VitalGoLiveStepStatus): string {
  if (status === "complete") return "text-cursor-glow";
  if (status === "warning") return "text-amber-400";
  if (status === "optional") return "text-muted";
  return "text-stark";
}

interface VitalGoLivePanelProps {
  report: VitalGoLiveReportRow | null;
  onRefresh: () => void;
  onRunDemoTour?: () => void;
  demoTourRunning?: boolean;
}

export function VitalGoLivePanel({
  report,
  onRefresh,
  onRunDemoTour,
  demoTourRunning,
}: VitalGoLivePanelProps) {
  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading go-live checklist…</p>;
  }

  const { today, steps, progress, ready, partiallyReady, demoReady } = report;
  const bridgesStep = steps.find((s) => s.id === "bridges");
  const previewBridges = bridgesStep?.status === "optional" && !ready;

  const statusLabel = ready
    ? "Demo ready — Lab + mesh live on-box"
    : demoReady
      ? `Demo ready · ${progress.complete}/${progress.total} checklist`
      : partiallyReady
        ? `Partially ready · ${progress.complete}/${progress.total}`
        : `Go live · ${progress.complete}/${progress.total}`;

  const headerStatusClass = ready || demoReady ? "text-cursor-glow" : partiallyReady ? "text-stark" : "text-amber-400";

  return (
    <div className="space-y-3 font-mono text-[10px]">
      {previewBridges ? (
        <div className="border border-cursor-glow/40 bg-cursor-glow/5 px-3 py-2 text-muted">
          <span className="uppercase tracking-widest text-cursor-glow">Day-one scope</span>
          <p className="mt-1">
            Longevity Lab, protocol vault, and CCP mesh publish are live on sovereign metal. Wearable bridges and lab PDF
            OCR stay preview until eno2 validation — Connect buttons mark local state only.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`${headerStatusClass} uppercase`}>{statusLabel}</span>
        <button
          type="button"
          onClick={onRefresh}
          className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark"
        >
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
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Vitals</p>
          <p className="mt-0.5 text-stark">{today.vitalsCount}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Protocol steps</p>
          <p className="mt-0.5 text-stark">{today.protocolSteps}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Reports</p>
          <p className="mt-0.5 text-stark">{today.reportsCount}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Mesh</p>
          <p className={`mt-0.5 ${today.meshPublished ? "text-cursor-glow" : "text-muted"}`}>
            {today.meshPublished ? "Published" : "Not yet"}
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
