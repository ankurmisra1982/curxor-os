import "server-only";

import { publishDigitalIntent } from "./mesh-publish";
import {
  advanceSequenceStep,
  ensureWorkQueue,
  getLead,
  markSequenceReplied,
  markSequenceStepSent,
  personalizeTemplate,
  recordSend,
  rescheduleSequenceStep,
  resolveStepSubject,
  updateSendStatus,
} from "./work-store";
import type { OutboundSend, WorkSequence } from "./work-queue-types";
import { notifyWorkSendFailure } from "./work-publish-failure-notify";
import { evaluateSendPolicy, readWorkSendPolicy } from "./work-send-policy";

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
  return {
    tool: "work.email.send",
    payload: {
      to: input.to,
      subject: input.subject,
      body: input.body,
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

  const policy = await readWorkSendPolicy();
  const gate = evaluateSendPolicy(file, policy);
  if (!gate.ok) {
    if (gate.retryAfter) {
      await rescheduleSequenceStep(sequenceId, idx, gate.retryAfter);
    }
    return { ok: false, error: gate.reason };
  }

  const { subject, variant } = resolveStepSubject(step, lead);
  const body = personalizeTemplate(step.body, lead);

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
    return { ok: true, send };
  }

  return executeOutboundSend(send.id);
}

export async function executeOutboundSend(sendId: string): Promise<{ ok: boolean; send?: OutboundSend; error?: string }> {
  const file = await ensureWorkQueue();
  const send = file.sends.find((s) => s.id === sendId);
  if (!send) return { ok: false, error: "Send not found" };

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
    });
    await markSequenceStepSent(send.sequenceId, send.stepId, send.subjectVariant);
    await advanceSequenceStep(send.sequenceId);
    return { ok: true, send: updated ?? undefined };
  }

  const err = result.error ?? "Bridge send failed";
  const failed = await updateSendStatus(sendId, { status: "failed", error: err });
  await notifyWorkSendFailure(send, err);
  return { ok: false, send: failed ?? undefined, error: err };
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

export async function pauseSequencesOnReply(fromEmail: string): Promise<WorkSequence[]> {
  const file = await ensureWorkQueue();
  const email = fromEmail.trim().toLowerCase();
  const lead = file.leads.find((l) => l.email === email);
  if (!lead) return [];

  const paused: WorkSequence[] = [];
  for (const seq of file.sequences) {
    if (seq.leadId !== lead.id || !seq.pauseOnReply || seq.status !== "active") continue;
    const updated = await markSequenceReplied(seq.id);
    if (updated) paused.push(updated);
  }
  return paused;
}
