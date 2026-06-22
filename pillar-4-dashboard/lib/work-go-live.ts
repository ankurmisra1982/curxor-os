import "server-only";

import { readAppFreState } from "./app-fre-state";
import { buildWorkGrowthProfile } from "./work-growth";
import { meetsGrowthLevel } from "./os-growth-level";
import { readUserSettings } from "./user-settings";
import { buildWorkConnectorHealthReport } from "./work-connector-health";
import { resolveAutoSendOnActivate } from "./work-send-policy";
import { ensureWorkQueue, isWorkEmailBridgeConfigured } from "./work-store";
import { buildWorkDeliverabilitySummary } from "./work-deliverability";

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
  const [fre, file, bridgeConfigured, vault, autoSend, settings] = await Promise.all([
    readAppFreState("my-work"),
    ensureWorkQueue(),
    isWorkEmailBridgeConfigured(),
    buildWorkConnectorHealthReport(),
    resolveAutoSendOnActivate(),
    readUserSettings(),
  ]);

  const growthProfile = buildWorkGrowthProfile(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.workGrowthLevel ?? null,
  );
  const growth = growthProfile.growthLevel;
  const isExplorer = growth === "L1";
  const isProfessionalPlus = growth === "L4" || growth === "L5";

  const steps: WorkGoLiveStep[] = [];

  steps.push({
    id: "fre",
    label: isExplorer ? "Desk configured" : "Outreach desk configured",
    status: fre.initialized ? "complete" : "pending",
    detail: fre.initialized
      ? String(fre.config.workspaceName ?? "Outreach Desk")
      : isExplorer ? "Complete setup wizard" : "Complete Outreach Claw setup wizard",
  });

  const commsReady = vault.commsPathReady;
  steps.push({
    id: "comms_path",
    label: isExplorer ? "Messages connected (optional)" : "Comms path configured",
    status: commsReady ? "complete" : isExplorer ? "optional" : "warning",
    detail: commsReady
      ? bridgeConfigured
        ? "SMTP bridge ready"
        : isExplorer
          ? "Demo mode — connect email when ready"
          : "Demo mode — SMTP, Google, or IMAP when ready for live mail"
      : isExplorer
        ? "Optional — add email in connector vault later"
        : "Configure SMTP, Google Workspace, or IMAP in connector vault",
  });

  steps.push({
    id: "smtp",
    label: isExplorer ? "Email setup (optional)" : "Email bridge ready",
    status: bridgeConfigured ? "complete" : isExplorer ? "optional" : "warning",
    detail: bridgeConfigured
      ? "SMTP configured in digital.env"
      : isExplorer
        ? "Simulated sends work without SMTP"
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
    label: isExplorer ? "First opportunity added" : "First lead in pipeline",
    status: hasLead ? "complete" : "pending",
    detail: hasLead
      ? isExplorer
        ? `${file.leads.length} ${file.leads.length === 1 ? "opportunity" : "opportunities"}`
        : `${file.leads.length} lead(s)`
      : isExplorer
        ? "Add an opportunity or contact"
        : "Add a lead or import prospects",
  });

  const hasSequence = file.sequences.length > 0;
  steps.push({
    id: "sequence",
    label: isExplorer ? "Follow-up plan (optional)" : "Sequence created",
    status: hasSequence ? "complete" : isExplorer ? "optional" : "pending",
    detail: hasSequence
      ? `${file.sequences.length} ${isExplorer ? "plan" : "sequence"}(s)`
      : isExplorer
        ? "Optional at Explorer level — use templates first"
        : "Create a multi-step cold sequence",
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

  const deliverability = await buildWorkDeliverabilitySummary(
    file.sends,
    file.sequences,
    Object.keys(file.unsubscribeTokens ?? {}).length,
  );
  const physicalAddress = typeof fre.config.physicalAddress === "string" ? fre.config.physicalAddress.trim() : "";
  const optOutLine = typeof fre.config.optOutLine === "string" ? fre.config.optOutLine.trim() : "";
  const complianceOk = Boolean(physicalAddress && optOutLine);
  steps.push({
    id: "compliance",
    label: "CAN-SPAM compliance copy",
    status: complianceOk ? "complete" : isExplorer ? "optional" : meetsGrowthLevel(growth, "L3") ? "warning" : "optional",
    detail: complianceOk
      ? "Physical address + opt-out line configured in FRE"
      : "Set physicalAddress + optOutLine in setup wizard for live outbound",
  });

  const suppressionCount = file.suppressionList?.length ?? 0;
  const suppressionAck =
    fre.config.suppressionAcknowledged === true || fre.config.suppressionAcknowledged === "true";
  steps.push({
    id: "suppression_ack",
    label: "Suppression list reviewed",
    status:
      suppressionAck || suppressionCount === 0
        ? "complete"
        : meetsGrowthLevel(growth, "L4")
          ? "warning"
          : "optional",
    detail:
      suppressionCount > 0
        ? `${suppressionCount} suppressed — acknowledge in Go Live or unblock in Deliverability`
        : "No suppressions on file",
  });

  const domainOk = deliverability.domainHealth === "healthy";
  steps.push({
    id: "domain_health",
    label: "Sending domain health",
    status: !deliverability.domain
      ? isExplorer
        ? "optional"
        : "warning"
      : domainOk
        ? "complete"
        : deliverability.domainHealth === "warning"
          ? "warning"
          : "pending",
    detail: deliverability.domainHealthDetail,
  });

  const required = steps.filter((s) => s.status !== "optional");
  const complete = required.filter((s) => s.status === "complete").length;
  const freComplete = steps.find((s) => s.id === "fre")?.status === "complete";
  const hasSequenceActivity = hasSequence && (active.length > 0 || hasAnySend);
  const demoReady = Boolean(freComplete && hasLead && (isExplorer || hasSequenceActivity));
  const liveReady = Boolean(bridgeConfigured && hasRealSend && freComplete && (isProfessionalPlus || !isExplorer));
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

export async function checkPreSendGate(): Promise<{ ok: boolean; missing: string[]; suppressionCount: number }> {
  const [fre, file] = await Promise.all([readAppFreState("my-work"), ensureWorkQueue()]);
  const physicalAddress = typeof fre.config.physicalAddress === "string" ? fre.config.physicalAddress.trim() : "";
  const optOutLine = typeof fre.config.optOutLine === "string" ? fre.config.optOutLine.trim() : "";
  const missing: string[] = [];
  if (!physicalAddress) missing.push("physicalAddress");
  if (!optOutLine) missing.push("optOutLine");
  const suppressionCount = file.suppressionList?.length ?? 0;
  return { ok: missing.length === 0, missing, suppressionCount };
}
