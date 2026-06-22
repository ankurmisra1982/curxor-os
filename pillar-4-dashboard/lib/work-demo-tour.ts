import "server-only";

import { readAppFreState } from "./app-fre-state";
import { draftReplyWithLlm } from "./work-inference";
import { type GrowthLevel, isGrowthLevel } from "./os-growth-level";
import { resolveWorkGrowthLevel } from "./work-growth";
import { readUserSettings } from "./user-settings";
import { sendSequenceStep } from "./work-send-executor";
import { applyTemplatePack } from "./work-template-packs";
import {
  activateSequence,
  createSequence,
  ensureWorkQueue,
  recordSend,
  scanLocalMailQueue,
  upsertLead,
} from "./work-store";
import { defaultTemplatePackForGrowth, MINI_SEQUENCE_PRESETS } from "./work-template-packs-data";

const DEMO_LEAD_NAME = "Demo tour · Jordan";
const DEMO_SEQUENCE_NAME = "Demo tour · intro sequence";

export interface WorkDemoTourResult {
  ok: boolean;
  tourKind?: string;
  growthLevel?: GrowthLevel;
  steps: Array<{ id: string; label: string; done: boolean; detail: string }>;
  leadId?: string;
  sequenceId?: string;
  sendId?: string;
  mailId?: string;
  error?: string;
}

async function resolveTourGrowth(override?: GrowthLevel): Promise<GrowthLevel> {
  if (override && isGrowthLevel(override)) return override;
  const fre = await readAppFreState("my-work");
  const settings = await readUserSettings();
  return resolveWorkGrowthLevel(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.workGrowthLevel ?? null,
  );
}

async function freStep(): Promise<{ ok: boolean; steps: WorkDemoTourResult["steps"]; error?: string }> {
  const fre = await readAppFreState("my-work");
  const steps: WorkDemoTourResult["steps"] = [
    {
      id: "fre",
      label: "Outreach desk",
      done: fre.initialized,
      detail: fre.initialized
        ? String(fre.config.workspaceName ?? "Outreach Desk")
        : "Complete Outreach Claw setup wizard",
    },
  ];
  if (!fre.initialized) {
    return { ok: false, steps, error: "Complete Outreach Claw FRE first" };
  }
  return { ok: true, steps };
}

/** L1 Explorer — opportunity → template pack → draft reply (no CRM jargon). */
async function runL1ExplorerTour(): Promise<WorkDemoTourResult> {
  const base = await freStep();
  const steps = [...base.steps];
  if (!base.ok) return { ok: false, tourKind: "L1-explorer", growthLevel: "L1", steps, error: base.error };

  const fre = await readAppFreState("my-work");
  const packId =
    typeof fre.config.defaultTemplatePack === "string"
      ? fre.config.defaultTemplatePack
      : defaultTemplatePackForGrowth("L1", fre.config.organizingFirst);

  const lead = await upsertLead({
    name: "Demo tour · internship inquiry",
    email: "coach@school.edu",
    company: "Campus Programs",
    title: "Coordinator",
  });
  steps.push({
    id: "opportunity",
    label: "Add opportunity",
    done: true,
    detail: `${lead.name} · ${lead.email}`,
  });

  const pack = await applyTemplatePack(packId);
  steps.push({
    id: "templates",
    label: "Template pack",
    done: true,
    detail: `${pack.packId} · ${pack.tasksCreated} reminder tasks`,
  });

  await scanLocalMailQueue();
  const file = await ensureWorkQueue();
  const mail =
    file.mailIndex.find((m) => !m.leadId && !m.matchedReply) ??
    file.mailIndex.find((m) => !m.leadId) ??
    file.mailIndex[0];
  if (!mail) {
    steps.push({ id: "mail", label: "Inbox message", done: false, detail: "No mail indexed" });
    return { ok: false, tourKind: "L1-explorer", growthLevel: "L1", steps, leadId: lead.id, error: "No mail to draft against" };
  }

  const draft = await draftReplyWithLlm({ mailId: mail.id, leadId: lead.id });
  steps.push({
    id: "draft_reply",
    label: "Draft reply",
    done: Boolean(draft.body),
    detail: draft.subject?.slice(0, 48) ?? "Reply ready",
  });

  return {
    ok: Boolean(draft.body),
    tourKind: "L1-explorer",
    growthLevel: "L1",
    steps,
    leadId: lead.id,
    mailId: mail.id,
  };
}

/** L2 Side Hustler — mini-sequence on a hustle lead. */
async function runL2SideHustlerTour(): Promise<WorkDemoTourResult> {
  const base = await freStep();
  const steps = [...base.steps];
  if (!base.ok) return { ok: false, tourKind: "L2-side-hustler", growthLevel: "L2", steps, error: base.error };

  const lead = await upsertLead({
    name: "Demo tour · Etsy buyer",
    email: "buyer@example.com",
    company: "Custom order",
    stage: "contacted",
  });
  steps.push({ id: "lead", label: "Hustle lead", done: true, detail: `${lead.name} · ${lead.email}` });

  const preset = MINI_SEQUENCE_PRESETS.find((p) => p.id === "order_checkin") ?? MINI_SEQUENCE_PRESETS[0]!;
  const seq = await createSequence({
    name: `${preset.label} · ${lead.name}`,
    leadId: lead.id,
    steps: preset.steps.map((s) => ({ subject: s.subject, body: s.body, delayDays: s.delayDays })),
  });
  steps.push({
    id: "mini_sequence",
    label: "Mini-sequence",
    done: true,
    detail: `${seq.id} · ${seq.steps.length} steps`,
  });

  await activateSequence(seq.id);
  steps.push({ id: "activate", label: "Sequence ready", done: true, detail: seq.id });

  const sendOut = await sendSequenceStep(seq.id);
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
    tourKind: "L2-side-hustler",
    growthLevel: "L2",
    steps,
    leadId: lead.id,
    sequenceId: seq.id,
    sendId: sendOut.send?.id,
    error: sendOut.ok ? undefined : sendOut.error,
  };
}

/** L3 Operator — approval queue demo (pending send). */
async function runL3OperatorTour(): Promise<WorkDemoTourResult> {
  const base = await freStep();
  const steps = [...base.steps];
  if (!base.ok) return { ok: false, tourKind: "L3-operator", growthLevel: "L3", steps, error: base.error };

  const lead = await upsertLead({
    name: DEMO_LEAD_NAME,
    email: "demo@curxor.dev",
    company: "Demo Co",
    stage: "qualified",
  });
  steps.push({ id: "lead", label: "Campaign lead", done: true, detail: `${lead.name} · qualified` });

  let file = await ensureWorkQueue();
  let seq = file.sequences.find((s) => s.name.startsWith("Demo tour · approval"));
  if (!seq) {
    seq = await createSequence({
      name: "Demo tour · approval sequence",
      leadId: lead.id,
      steps: [
        {
          subject: "Demo tour · needs your OK",
          body: "Hi {{name}} — this step waits in the approval queue until you release it.",
        },
      ],
    });
  }
  steps.push({ id: "sequence", label: "GTM sequence", done: true, detail: `${seq.id} · ${seq.steps.length} steps` });

  if (seq.status !== "active") await activateSequence(seq.id);

  const step = seq.steps[0];
  const pending = await recordSend({
    sequenceId: seq.id,
    stepId: step?.id ?? "step-1",
    leadId: lead.id,
    to: lead.email,
    subject: "Demo tour · needs your OK",
    body: "Hi Jordan — this send is queued for operator approval.",
    status: "pending_approval",
    sentAt: null,
    error: null,
  });
  steps.push({
    id: "approval",
    label: "Approval queue",
    done: true,
    detail: `${pending.id} · pending_approval`,
  });

  return {
    ok: true,
    tourKind: "L3-operator",
    growthLevel: "L3",
    steps,
    leadId: lead.id,
    sequenceId: seq.id,
    sendId: pending.id,
  };
}

/** L4+ default — lead → sequence → activate → simulated send (legacy GTM tour). */
async function runGtmDemoTour(): Promise<WorkDemoTourResult> {
  const base = await freStep();
  const steps = [...base.steps];
  if (!base.ok) return { ok: false, tourKind: "gtm-default", steps, error: base.error };

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

  if (seq.status !== "active") await activateSequence(seq.id);
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
      return { ok: true, tourKind: "gtm-default", steps, leadId: lead.id, sequenceId: seq.id, sendId: prior.id };
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
    tourKind: "gtm-default",
    steps,
    leadId: lead.id,
    sequenceId: seq.id,
    sendId: sendOut.send?.id,
    error: sendOut.ok ? undefined : sendOut.error,
  };
}

export async function runWorkDemoTour(growthOverride?: GrowthLevel): Promise<WorkDemoTourResult> {
  const growth = await resolveTourGrowth(growthOverride);

  if (growth === "L1") return runL1ExplorerTour();
  if (growth === "L2") return runL2SideHustlerTour();
  if (growth === "L3") return runL3OperatorTour();
  return runGtmDemoTour();
}

export async function runWorkDemoTourForLevel(level: unknown): Promise<WorkDemoTourResult> {
  const growth = isGrowthLevel(level) ? level : await resolveTourGrowth();
  return runWorkDemoTour(growth);
}
