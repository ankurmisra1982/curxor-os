import "server-only";

import { publishDigitalIntent } from "./mesh-publish";
import { readAppFreState } from "./app-fre-state";
import {
  advanceSequenceStep,
  ensureWorkQueue,
  getLead,
  isWorkEmailBridgeConfigured,
  markSequenceReplied,
  markSequenceStepSent,
  personalizeTemplateForLead,
  readOutboundKillSwitch,
  recordSend,
  rescheduleSequenceStep,
  resolveStepSubject,
  updateSendStatus,
} from "./work-store";
import type { OutboundSend, ReplyIntent, WorkSequence } from "./work-queue-types";
import { notifyWorkSendFailure } from "./work-publish-failure-notify";
import { notifyWorkPendingApproval } from "./work-approval-notify";
import { readWorkDeskPermissions, workPermissionDeniedMessage } from "./work-permissions";
import { evaluateSendPolicy, readWorkSendPolicy } from "./work-send-policy";
import { addSuppression, isEmailSuppressed } from "./work-suppression";

export const UNDO_SEND_WINDOW_MS = 8000;

export function requireWorkSendApproval(): boolean {
  const env = process.env.CURXOR_WORK_REQUIRE_APPROVAL?.trim().toLowerCase();
  if (env === "1" || env === "true") return true;
  return false;
}

export async function buildEmailIntent(input: {
  to: string;
  subject: string;
  body: string;
  sequenceId?: string;
  stepId?: string;
  leadId?: string;
}): Promise<{ tool: string; payload: Record<string, unknown> }> {
  const fre = await readAppFreState("my-work");
  const primary = typeof fre.config.smtpFrom === "string" ? fre.config.smtpFrom : undefined;
  const secondary =
    typeof fre.config.secondarySmtpFrom === "string" ? fre.config.secondarySmtpFrom.trim() : undefined;
  const file = await ensureWorkQueue();
  const from =
    secondary && file.sends.length % 2 === 1
      ? secondary
      : primary;

  return {
    tool: "work.email.send",
    payload: {
      to: input.to,
      subject: input.subject,
      body: input.body,
      from,
      sequence_id: input.sequenceId,
      step_id: input.stepId,
      lead_id: input.leadId,
    },
  };
}

export async function sendSequenceStep(
  sequenceId: string,
  stepIndex?: number,
): Promise<{ ok: boolean; send?: OutboundSend; error?: string }> {
  const perms = await readWorkDeskPermissions();
  if (!perms.canSend) {
    return { ok: false, error: workPermissionDeniedMessage("send", perms.role) };
  }
  if (await readOutboundKillSwitch()) {
    return { ok: false, error: "Outbound kill switch is ON — sends blocked" };
  }

  const file = await ensureWorkQueue();
  const seqIdx = file.sequences.findIndex((s) => s.id === sequenceId);
  if (seqIdx < 0) return { ok: false, error: "Sequence not found" };
  const seq = file.sequences[seqIdx]!;
  if (seq.status !== "active" && seq.status !== "draft") {
    return { ok: false, error: `Sequence is ${seq.status}` };
  }

  const idx = stepIndex ?? seq.currentStepIndex;
  const step = seq.steps[idx];
  if (!step) return { ok: false, error: "No step at index" };
  if (step.kind !== "email") {
    await advanceSequenceStep(sequenceId);
    return { ok: true };
  }
  if (step.sentAt) return { ok: false, error: "Step already sent" };

  const lead = await getLead(seq.leadId);
  if (!lead?.email) return { ok: false, error: "Lead email missing" };
  if (await isEmailSuppressed(lead.email)) {
    return { ok: false, error: "Lead email is on suppression list" };
  }

  const policy = await readWorkSendPolicy();
  const gate = evaluateSendPolicy(file, policy);
  if (!gate.ok) {
    if (gate.retryAfter) {
      await rescheduleSequenceStep(sequenceId, idx, gate.retryAfter);
    }
    return { ok: false, error: gate.reason };
  }

  const { subject, variant } = resolveStepSubject(step, lead);
  const body = await personalizeTemplateForLead(step.body, lead);

  const send = await recordSend({
    sequenceId: seq.id,
    stepId: step.id,
    leadId: lead.id,
    to: lead.email,
    subject,
    body,
    subjectVariant: variant,
    status: requireWorkSendApproval() ? "pending_approval" : "queued",
    sentAt: null,
    error: null,
  });

  if (requireWorkSendApproval()) {
    await notifyWorkPendingApproval(send);
    return { ok: true, send };
  }

  return executeOutboundSend(send.id);
}

export async function executeOutboundSend(
  sendId: string,
  opts?: { skipUndo?: boolean },
): Promise<{ ok: boolean; send?: OutboundSend; error?: string; undoPending?: boolean }> {
  const perms = await readWorkDeskPermissions();
  if (!perms.canSend) {
    return { ok: false, error: workPermissionDeniedMessage("send", perms.role) };
  }
  const file = await ensureWorkQueue();
  const send = file.sends.find((s) => s.id === sendId);
  if (!send) return { ok: false, error: "Send not found" };

  if (send.status === "skipped") {
    return { ok: true, send };
  }
  if (send.status === "sent" || send.status === "simulated") {
    return { ok: true, send };
  }
  if (send.status === "failed") {
    return { ok: false, send, error: send.error ?? "Send failed" };
  }
  if (send.status === "pending_approval") {
    return { ok: true, send };
  }

  const now = Date.now();
  if (!opts?.skipUndo) {
    if (send.undoUntil && now < Date.parse(send.undoUntil)) {
      return { ok: true, send, undoPending: true };
    }
    if (!send.undoUntil) {
      const updated = await updateSendStatus(sendId, {
        undoUntil: new Date(now + UNDO_SEND_WINDOW_MS).toISOString(),
      });
      return { ok: true, send: updated ?? undefined, undoPending: true };
    }
  }

  return executeOutboundSendNow(sendId);
}

/** Demo-mode send when SMTP bridge is not configured — local only, not sent to eno2. */
async function simulateDemoSend(sendId: string): Promise<OutboundSend | null> {
  const file = await ensureWorkQueue();
  const send = file.sends.find((s) => s.id === sendId);
  if (!send) return null;
  const updated = await updateSendStatus(sendId, {
    status: "simulated",
    sentAt: new Date().toISOString(),
    error: null,
    undoUntil: null,
  });
  if (updated) {
    await markSequenceStepSent(send.sequenceId, send.stepId, send.subjectVariant);
    await advanceSequenceStep(send.sequenceId);
  }
  return updated;
}

async function executeOutboundSendNow(sendId: string): Promise<{ ok: boolean; send?: OutboundSend; error?: string }> {
  const file = await ensureWorkQueue();
  const send = file.sends.find((s) => s.id === sendId);
  if (!send) return { ok: false, error: "Send not found" };

  if (!(await isWorkEmailBridgeConfigured())) {
    const simulated = await simulateDemoSend(sendId);
    return { ok: true, send: simulated ?? undefined };
  }

  const digital = await buildEmailIntent({
    to: send.to,
    subject: send.subject,
    body: send.body,
    sequenceId: send.sequenceId,
    stepId: send.stepId,
    leadId: send.leadId,
  });

  const result = await publishDigitalIntent(digital);
  if (result.ok) {
    const updated = await updateSendStatus(sendId, {
      status: "sent",
      sentAt: new Date().toISOString(),
      error: null,
      undoUntil: null,
    });
    await markSequenceStepSent(send.sequenceId, send.stepId, send.subjectVariant);
    await advanceSequenceStep(send.sequenceId);
    return { ok: true, send: updated ?? undefined };
  }

  const err = result.error ?? "Bridge send failed";
  const failed = await updateSendStatus(sendId, { status: "failed", error: err, undoUntil: null });
  if (err.toLowerCase().includes("bounce") || err.includes("550")) {
    await addSuppression(send.to, err, "bounce");
  }
  await notifyWorkSendFailure(send, err);
  return { ok: false, send: failed ?? undefined, error: err };
}

export async function undoOutboundSend(sendId: string): Promise<{ ok: boolean; send?: OutboundSend; error?: string }> {
  const file = await ensureWorkQueue();
  const send = file.sends.find((s) => s.id === sendId);
  if (!send) return { ok: false, error: "Send not found" };
  if (send.status !== "queued") return { ok: false, error: `Cannot undo ${send.status} send` };
  if (!send.undoUntil || Date.now() >= Date.parse(send.undoUntil)) {
    return { ok: false, error: "Undo window closed" };
  }
  const updated = await updateSendStatus(sendId, {
    status: "skipped",
    error: "Cancelled by operator",
    undoUntil: null,
  });
  return { ok: true, send: updated ?? undefined };
}

export async function finalizeDueOutboundSends(): Promise<number> {
  const file = await ensureWorkQueue();
  const now = Date.now();
  let finalized = 0;
  for (const send of file.sends) {
    if (send.status !== "queued") continue;
    if (!send.undoUntil || Date.parse(send.undoUntil) > now) continue;
    const res = await executeOutboundSend(send.id, { skipUndo: true });
    if (res.ok) finalized += 1;
  }
  return finalized;
}

export async function processDueSequenceSteps(): Promise<number> {
  const file = await ensureWorkQueue();
  const now = Date.now();
  let processed = 0;

  for (const seq of file.sequences) {
    if (seq.status !== "active") continue;
    const step = seq.steps[seq.currentStepIndex];
    if (!step || step.sentAt) continue;
    if (step.kind === "wait") {
      await advanceSequenceStep(seq.id);
      processed += 1;
      continue;
    }
    if (step.kind !== "email") continue;
    if (step.scheduledAt && Date.parse(step.scheduledAt) > now) continue;
    const res = await sendSequenceStep(seq.id, seq.currentStepIndex);
    if (res.ok) processed += 1;
  }
  return processed;
}

export async function pauseSequencesOnReply(
  fromEmail: string,
  intent?: ReplyIntent,
): Promise<WorkSequence[]> {
  const file = await ensureWorkQueue();
  const email = fromEmail.trim().toLowerCase();
  const lead = file.leads.find((l) => l.email === email);
  if (!lead) return [];

  const paused: WorkSequence[] = [];
  for (const seq of file.sequences) {
    if (seq.leadId !== lead.id || !seq.pauseOnReply || seq.status !== "active") continue;

    const currentStep = seq.steps[seq.currentStepIndex];
    const branchIndex =
      intent && currentStep?.onReplyIntent?.[intent] != null
        ? currentStep.onReplyIntent[intent]!
        : null;

    if (branchIndex != null && branchIndex >= 0 && branchIndex < seq.steps.length) {
      const file2 = await ensureWorkQueue();
      const idx = file2.sequences.findIndex((s) => s.id === seq.id);
      if (idx >= 0) {
        file2.sequences[idx] = {
          ...file2.sequences[idx]!,
          currentStepIndex: branchIndex,
          updatedAt: new Date().toISOString(),
        };
        const { writeWorkFilePartial } = await import("./work-store");
        await writeWorkFilePartial(file2);
        paused.push(file2.sequences[idx]!);
        continue;
      }
    }

    const updated = await markSequenceReplied(seq.id);
    if (updated) paused.push(updated);
  }
  return paused;
}
