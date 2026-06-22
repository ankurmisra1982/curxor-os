import "server-only";

import { readAppFreState } from "./app-fre-state";
import { sendSequenceStep } from "./work-send-executor";
import { activateSequence, createSequence, ensureWorkQueue, upsertLead } from "./work-store";

const DEMO_LEAD_NAME = "Demo tour · Jordan";
const DEMO_SEQUENCE_NAME = "Demo tour · intro sequence";

export interface WorkDemoTourResult {
  ok: boolean;
  steps: Array<{ id: string; label: string; done: boolean; detail: string }>;
  leadId?: string;
  sequenceId?: string;
  sendId?: string;
  error?: string;
}

export async function runWorkDemoTour(): Promise<WorkDemoTourResult> {
  const steps: WorkDemoTourResult["steps"] = [];
  const fre = await readAppFreState("my-work");

  steps.push({
    id: "fre",
    label: "Outreach desk",
    done: fre.initialized,
    detail: fre.initialized
      ? String(fre.config.workspaceName ?? "Outreach Desk")
      : "Complete Outreach Claw setup wizard",
  });
  if (!fre.initialized) {
    return { ok: false, steps, error: "Complete Outreach Claw FRE first" };
  }

  let file = await ensureWorkQueue();
  let lead =
    file.leads.find((l) => l.name.startsWith("Demo tour")) ??
    file.leads.find((l) => l.stage === "new") ??
    file.leads[0];

  if (!lead) {
    lead = await upsertLead({
      name: DEMO_LEAD_NAME,
      email: "demo@curxor.dev",
      company: "Demo Co",
    });
  }
  steps.push({ id: "lead", label: "Demo lead", done: true, detail: `${lead.name} · ${lead.email}` });

  file = await ensureWorkQueue();
  let seq = file.sequences.find((s) => s.name.startsWith("Demo tour"));
  if (!seq) {
    seq = await createSequence({
      name: DEMO_SEQUENCE_NAME,
      leadId: lead.id,
      steps: [
        {
          subject: "Demo tour · sovereign outbound",
          subjectAlt: "{{name}}, quick CurXor question",
          body: "Hi {{name}} — Outreach Claw runs sequences on-appliance with pause-on-reply. Worth a 10-min look?",
        },
        {
          delayDays: 3,
          subject: "Re: local outbound stack",
          body: "Following up — happy to share how we simulate sends without SMTP until you wire digital.env.",
        },
      ],
    });
  }
  steps.push({ id: "sequence", label: "Demo sequence", done: true, detail: `${seq.id} · ${seq.steps.length} steps` });

  if (seq.status !== "active") {
    await activateSequence(seq.id);
  }
  steps.push({ id: "activate", label: "Sequence activated", done: true, detail: seq.id });

  let sendOut = await sendSequenceStep(seq.id);
  if (!sendOut.ok) {
    file = await ensureWorkQueue();
    const prior = file.sends.find(
      (s) => s.sequenceId === seq!.id && (s.status === "simulated" || s.status === "sent"),
    );
    if (prior) {
      steps.push({
        id: "send",
        label: prior.status === "simulated" ? "Simulated send" : "Bridge send",
        done: true,
        detail: `${prior.status} · ${prior.id}${sendOut.error ? ` · ${sendOut.error}` : ""}`,
      });
      return { ok: true, steps, leadId: lead.id, sequenceId: seq.id, sendId: prior.id };
    }
  }

  const simulated = sendOut.send?.status === "simulated";
  const sent = sendOut.send?.status === "sent" || simulated;
  steps.push({
    id: "send",
    label: simulated ? "Simulated send" : sent ? "Bridge send" : "Send step",
    done: sendOut.ok,
    detail: sendOut.send ? sendOut.send.status : sendOut.error ?? "failed",
  });

  return {
    ok: sendOut.ok,
    steps,
    leadId: lead.id,
    sequenceId: seq.id,
    sendId: sendOut.send?.id,
    error: sendOut.ok ? undefined : sendOut.error,
  };
}
