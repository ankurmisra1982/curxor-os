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
  demoReady?: boolean;
  liveReady?: boolean;
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
  onRunDemoTour?: () => void;
  onOpenSetupWizard?: () => void;
  onAckSuppression?: () => void;
  demoTourRunning?: boolean;
}

export function WorkGoLivePanel({
  report,
  onRefresh,
  onRunDemoTour,
  onOpenSetupWizard,
  onAckSuppression,
  demoTourRunning,
}: WorkGoLivePanelProps) {
  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading go-live checklist…</p>;
  }

  const { steps, progress, ready, partiallyReady, demoReady, liveReady, today } = report;
  const smtpStep = steps.find((s) => s.id === "smtp");
  const domainStep = steps.find((s) => s.id === "domain_health");
  const suppressionStep = steps.find((s) => s.id === "suppression_ack");
  const demoRelease = smtpStep?.status === "warning" && !ready;

  const label = ready
    ? "Ready to send"
    : demoReady
      ? `Demo ready · ${progress.complete}/${progress.total} full checklist`
      : partiallyReady
        ? `Partially ready · ${progress.complete}/${progress.total}`
        : `Go live · ${progress.complete}/${progress.total}`;

  const headerStatusClass = ready || demoReady ? "text-cursor-glow" : partiallyReady ? "text-stark" : "text-amber-400";

  return (
    <div className="space-y-3 font-mono text-[10px]">
      {demoRelease ? (
        <div className="space-y-2">
          <div className="border border-cursor-glow/40 bg-cursor-glow/5 px-3 py-2 text-[10px] text-muted">
            <span className="uppercase tracking-widest text-cursor-glow">Demo mode</span>
            <p className="mt-1">
              No email connected yet — expected for this release. Leads, sequences, inbox scan, and simulated sends work
              locally without mail leaving the appliance.
            </p>
          </div>
          <div className="border border-line/60 bg-panel/50 px-3 py-2 text-[10px] text-muted">
            <span className="uppercase tracking-widest text-stark">Ready for live email?</span>
            <p className="mt-1">
              Connect your email in Outreach → Integrations (Google, Microsoft, or SMTP). Simulated sends stop once a
              real comms path is verified.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {onOpenSetupWizard ? (
                <button
                  type="button"
                  onClick={onOpenSetupWizard}
                  className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow"
                >
                  Open setup wizard
                </button>
              ) : null}
              <a
                href="https://github.com/curxor-os/curxor-os/blob/main/docs/outreach-claw/EXIT-DEMO.md#live-ready"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark"
              >
                EXIT-DEMO steps
              </a>
            </div>
          </div>
        </div>
      ) : null}
      {liveReady ? (
        <div className="border border-cursor-glow/50 bg-cursor-glow/10 px-3 py-2 text-[10px]">
          <span className="uppercase tracking-widest text-cursor-glow">Live ready</span>
          <p className="mt-1 text-muted">
            SMTP verified and first real send recorded.{" "}
            <a
              href="https://github.com/curxor-os/curxor-os/blob/main/docs/outreach-claw/EXIT-DEMO.md#live-ready"
              className="text-cursor-glow underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              EXIT-DEMO live-ready anchor
            </a>
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${headerStatusClass} uppercase`}>{label}</span>
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
      {domainStep ? (
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Domain health</p>
          <p className={domainStep.status === "complete" ? "text-cursor-glow" : domainStep.status === "warning" ? "text-amber-400" : "text-stark"}>
            {domainStep.status}
          </p>
          <p className="text-muted truncate">{domainStep.detail}</p>
        </div>
      ) : null}
      {suppressionStep?.status === "warning" && onAckSuppression ? (
        <div className="border border-amber-400/40 px-2 py-2">
          <p className="text-amber-400 uppercase">Suppression review</p>
          <p className="mt-1 text-muted">{suppressionStep.detail}</p>
          <button
            type="button"
            onClick={onAckSuppression}
            className="mt-2 border border-line px-2 py-0.5 uppercase text-muted hover:text-stark"
          >
            Acknowledge suppression list reviewed
          </button>
        </div>
      ) : null}
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
