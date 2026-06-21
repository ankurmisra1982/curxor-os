import "server-only";

import { readAppFreState } from "./app-fre-state";
import { ensureWorkQueue, isWorkEmailBridgeConfigured } from "./work-store";

export type WorkGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface WorkGoLiveStep {
  id: string;
  label: string;
  status: WorkGoLiveStepStatus;
  detail: string;
}

export interface WorkGoLiveTodaySummary {
  nextScheduledAt: string | null;
  nextSequenceId: string | null;
  activeSequences: number;
  pendingSends: number;
  openTasks: number;
}

export interface WorkGoLiveReport {
  ready: boolean;
  partiallyReady: boolean;
  progress: { complete: number; total: number };
  steps: WorkGoLiveStep[];
  today: WorkGoLiveTodaySummary;
}

export async function buildWorkGoLiveReport(): Promise<WorkGoLiveReport> {
  const [fre, file, bridgeConfigured] = await Promise.all([
    readAppFreState("my-work"),
    ensureWorkQueue(),
    isWorkEmailBridgeConfigured(),
  ]);

  const steps: WorkGoLiveStep[] = [];

  steps.push({
    id: "fre",
    label: "Outreach desk configured",
    status: fre.initialized ? "complete" : "pending",
    detail: fre.initialized
      ? String(fre.config.workspaceName ?? "Outreach Desk")
      : "Complete Outreach Claw setup wizard",
  });

  steps.push({
    id: "smtp",
    label: "Email bridge ready",
    status: bridgeConfigured ? "complete" : "warning",
    detail: bridgeConfigured
      ? "SMTP configured in digital.env"
      : "Set SMTP_HOST + SMTP_FROM in digital.env — demo mode queues locally",
  });

  const hasLead = file.leads.length > 0;
  steps.push({
    id: "lead",
    label: "First lead in pipeline",
    status: hasLead ? "complete" : "pending",
    detail: hasLead ? `${file.leads.length} lead(s)` : "Add a lead or import prospects",
  });

  const hasSequence = file.sequences.length > 0;
  steps.push({
    id: "sequence",
    label: "Sequence created",
    status: hasSequence ? "complete" : "pending",
    detail: hasSequence ? `${file.sequences.length} sequence(s)` : "Create a multi-step cold sequence",
  });

  const active = file.sequences.filter((s) => s.status === "active");
  steps.push({
    id: "active",
    label: "Sequence activated",
    status: active.length > 0 ? "complete" : hasSequence ? "warning" : "pending",
    detail:
      active.length > 0
        ? `${active.length} active · pause-on-reply enabled`
        : "Activate a draft sequence to start outbound",
  });

  const complete = steps.filter((s) => s.status === "complete").length;
  const required = steps.filter((s) => s.status !== "optional");
  const ready = required.every((s) => s.status === "complete");
  const partiallyReady = complete >= 3;

  let nextScheduledAt: string | null = null;
  let nextSequenceId: string | null = null;
  for (const seq of file.sequences) {
    if (seq.status !== "active") continue;
    const step = seq.steps[seq.currentStepIndex];
    if (step?.scheduledAt && !step.sentAt) {
      if (!nextScheduledAt || Date.parse(step.scheduledAt) < Date.parse(nextScheduledAt)) {
        nextScheduledAt = step.scheduledAt;
        nextSequenceId = seq.id;
      }
    }
  }

  return {
    ready,
    partiallyReady,
    progress: { complete, total: steps.length },
    steps,
    today: {
      nextScheduledAt,
      nextSequenceId,
      activeSequences: active.length,
      pendingSends: file.sends.filter((s) => s.status === "queued" || s.status === "pending_approval").length,
      openTasks: file.tasks.filter((t) => !t.done).length,
    },
  };
}
