import "server-only";

import { readAppFreState } from "./app-fre-state";
import { buildWorkConnectorHealthReport } from "./work-connector-health";
import { resolveAutoSendOnActivate } from "./work-send-policy";
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
  /** Day-one ready without SMTP — FRE + lead + sequence activity */
  demoReady: boolean;
  /** SMTP verified + first real sent */
  liveReady: boolean;
  partiallyReady: boolean;
  progress: { complete: number; total: number };
  steps: WorkGoLiveStep[];
  today: WorkGoLiveTodaySummary;
}

export async function buildWorkGoLiveReport(): Promise<WorkGoLiveReport> {
  const [fre, file, bridgeConfigured, vault, autoSend] = await Promise.all([
    readAppFreState("my-work"),
    ensureWorkQueue(),
    isWorkEmailBridgeConfigured(),
    buildWorkConnectorHealthReport(),
    resolveAutoSendOnActivate(),
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

  const commsReady = vault.commsPathReady;
  steps.push({
    id: "comms_path",
    label: "Comms path configured",
    status: commsReady ? "complete" : "warning",
    detail: commsReady
      ? bridgeConfigured
        ? "SMTP bridge ready"
        : "Demo mode — SMTP, Google, or IMAP when ready for live mail"
      : "Configure SMTP, Google Workspace, or IMAP in connector vault",
  });

  steps.push({
    id: "smtp",
    label: "Email bridge ready",
    status: bridgeConfigured ? "complete" : "warning",
    detail: bridgeConfigured
      ? "SMTP configured in digital.env"
      : "Demo mode OK — set SMTP_HOST + SMTP_FROM when ready for live send",
  });

  steps.push({
    id: "auto_send_policy",
    label: "Understand auto-send policy",
    status: "complete",
    detail: autoSend
      ? "Auto-send on activate is ON — step 1 sends when policy allows"
      : "Auto-send on activate is OFF — heartbeat process_due sends on schedule",
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
  const hasAnySend = file.sends.some((s) => s.status === "sent" || s.status === "simulated");
  const hasRealSend = file.sends.some((s) => s.status === "sent");
  steps.push({
    id: "active",
    label: "Sequence activated",
    status: active.length > 0 ? "complete" : hasSequence ? "warning" : "pending",
    detail:
      active.length > 0
        ? `${active.length} active · pause-on-reply enabled`
        : "Activate a draft sequence to start outbound",
  });

  steps.push({
    id: "first_send",
    label: "First outbound send",
    status: hasAnySend ? "complete" : active.length > 0 ? "warning" : "pending",
    detail: hasAnySend
      ? bridgeConfigured
        ? `${file.sends.filter((s) => s.status === "sent").length} sent via bridge`
        : `${file.sends.filter((s) => s.status === "simulated").length} simulated · demo mode`
      : "Run demo tour or Send Step on an active sequence",
  });

  const required = steps.filter((s) => s.status !== "optional");
  const complete = required.filter((s) => s.status === "complete").length;
  const freComplete = steps.find((s) => s.id === "fre")?.status === "complete";
  const hasSequenceActivity = hasSequence && (active.length > 0 || hasAnySend);
  const demoReady = Boolean(freComplete && hasLead && hasSequenceActivity);
  const liveReady = Boolean(bridgeConfigured && hasRealSend && freComplete);
  const ready = bridgeConfigured
    ? required.every((s) => s.status === "complete")
    : demoReady;
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
    demoReady,
    liveReady,
    partiallyReady,
    progress: { complete, total: required.length },
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
