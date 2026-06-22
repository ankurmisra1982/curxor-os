import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { readAppFreState } from "./app-fre-state";
import { loadDigitalEnv } from "./digital-env";
import { buildWorkAnalytics } from "./work-analytics";
import { buildWorkConnectorHealthReport } from "./work-connector-health";
import { classifyReplyIntent } from "./work-reply-intent";
import { countSendsToday, readAutoSendOnActivateFre, readWorkSendPolicy, resolveAutoSendOnActivate } from "./work-send-policy";
import type {
  LeadStage,
  MailIndexEntry,
  OutboundSend,
  ReplyIntent,
  SequenceStep,
  SequenceStepKind,
  SubjectVariant,
  TaskPriority,
  WorkLead,
  WorkQueueFile,
  WorkQueueStatus,
  WorkSequence,
  WorkSyncLogEntry,
  WorkTask,
} from "./work-queue-types";

function storePath(): string {
  return process.env.CURXOR_WORK_QUEUE_PATH ?? "/etc/curxor/work-queue.json";
}

function emptyFile(): WorkQueueFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    leads: [],
    tasks: [],
    sequences: [],
    sends: [],
    mailIndex: [],
    syncLog: [],
  };
}

export async function ensureWorkQueue(): Promise<WorkQueueFile> {
  const filePath = storePath();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkQueueFile>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      sequences: Array.isArray(parsed.sequences) ? parsed.sequences : [],
      sends: Array.isArray(parsed.sends) ? parsed.sends : [],
      mailIndex: Array.isArray(parsed.mailIndex) ? parsed.mailIndex : [],
      syncLog: Array.isArray(parsed.syncLog) ? parsed.syncLog : [],
    };
  } catch {
    const seeded = seedDemoQueue();
    await writeWorkFile(seeded);
    return seeded;
  }
}

async function writeWorkFile(data: WorkQueueFile): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

function seedDemoQueue(): WorkQueueFile {
  const now = new Date().toISOString();
  const leads: WorkLead[] = [
    {
      id: "LEAD-001",
      name: "Jordan Lee",
      email: "jordan@fintechlabs.io",
      company: "Fintech Labs",
      title: "Head of Ops",
      stage: "contacted",
      tags: ["fintech", "warm"],
      notes: "Met at demo — interested in sovereign appliance for outbound.",
      source: "demo",
      createdAt: now,
      updatedAt: now,
      lastTouchAt: now,
    },
    {
      id: "LEAD-002",
      name: "Sam Rivera",
      email: "sam@buildco.dev",
      company: "BuildCo",
      title: "Founder",
      stage: "new",
      tags: ["saas"],
      notes: "",
      source: "import",
      createdAt: now,
      updatedAt: now,
      lastTouchAt: null,
    },
    {
      id: "LEAD-003",
      name: "Alex Chen",
      email: "alex@edgecompute.ai",
      company: "EdgeCompute",
      title: "CTO",
      stage: "replied",
      tags: ["technical"],
      notes: "Asked for pricing on Creator + Outreach bundle.",
      source: "inbound",
      createdAt: now,
      updatedAt: now,
      lastTouchAt: now,
    },
  ];

  const tasks: WorkTask[] = [
    {
      id: "TASK-001",
      title: "Follow up with Alex on appliance pricing",
      priority: "P1",
      done: false,
      leadId: "LEAD-003",
      dueAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "TASK-002",
      title: "Import Q2 prospect CSV",
      priority: "P2",
      done: false,
      leadId: null,
      dueAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "TASK-003",
      title: "Review sequence templates",
      priority: "P3",
      done: true,
      leadId: null,
      dueAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const sequences: WorkSequence[] = [
    {
      id: "SEQ-001",
      name: "Sovereign appliance intro",
      leadId: "LEAD-001",
      status: "active",
      pauseOnReply: true,
      currentStepIndex: 1,
      activatedAt: now,
      completedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
      steps: [
        {
          id: "STEP-001",
          kind: "email",
          delayDays: 0,
          subject: "Quick question on outbound stack",
          body: "Hi {{name}} — saw {{company}} is scaling outbound. We run Creator + Outreach Claw on bare metal with zero SaaS rent. Worth a 10-min look?",
          sentAt: now,
          scheduledAt: null,
        },
        {
          id: "STEP-002",
          kind: "email",
          delayDays: 3,
          subject: "Re: sovereign outbound",
          subjectAlt: "Quick follow-up on local CRM",
          body: "Following up — happy to share how we pause sequences on reply and keep CRM on-appliance.",
          sentAt: null,
          scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
        },
      ],
    },
    {
      id: "SEQ-002",
      name: "Founder cold intro",
      leadId: "LEAD-002",
      status: "draft",
      pauseOnReply: true,
      currentStepIndex: 0,
      activatedAt: null,
      completedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
      steps: [
        {
          id: "STEP-010",
          kind: "email",
          delayDays: 0,
          subject: "CurXor for {{company}}",
          body: "Hi {{name}} — local LLM drafts sequences; eno2 bridge sends mail. No cloud CRM bill.",
          sentAt: null,
          scheduledAt: null,
        },
      ],
    },
  ];

  return { version: 1, updatedAt: now, leads, tasks, sequences, sends: [], mailIndex: [] };
}

export async function isWorkEmailBridgeConfigured(): Promise<boolean> {
  const env = await loadDigitalEnv();
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_FROM?.trim());
}

export async function fetchWorkStatus(): Promise<WorkQueueStatus> {
  const fre = await readAppFreState("my-work");
  const file = await ensureWorkQueue();
  const bridgeConfigured = await isWorkEmailBridgeConfigured();
  const weekAgo = Date.now() - 7 * 86400000;
  const policy = await readWorkSendPolicy();
  const sendsToday = countSendsToday(file.sends);
  const analytics = buildWorkAnalytics(file.sends, file.mailIndex);
  const connectorVault = await buildWorkConnectorHealthReport();
  const autoSendFre = await readAutoSendOnActivateFre();
  const autoSendOnActivate = autoSendFre ?? (await resolveAutoSendOnActivate(bridgeConfigured));

  return {
    source: bridgeConfigured ? "live" : "demo",
    bridgeConfigured,
    workspaceName: typeof fre.config.workspaceName === "string" ? fre.config.workspaceName : "Outreach Desk",
    focusAreas: Array.isArray(fre.config.focusAreas)
      ? fre.config.focusAreas.filter((x): x is string => typeof x === "string")
      : ["tasks", "mail"],
    clawLane: typeof fre.config.clawLane === "string" ? fre.config.clawLane : "A",
    leads: file.leads,
    tasks: file.tasks,
    sequences: file.sequences,
    sends: file.sends,
    mailIndex: file.mailIndex,
    updatedAt: file.updatedAt,
    stats: {
      openTasks: file.tasks.filter((t) => !t.done).length,
      activeSequences: file.sequences.filter((s) => s.status === "active").length,
      leadsInPipeline: file.leads.filter((l) => !["won", "lost"].includes(l.stage)).length,
      repliesThisWeek: file.leads.filter((l) => l.stage === "replied" && l.lastTouchAt && Date.parse(l.lastTouchAt) >= weekAgo).length,
      pendingSends: file.sends.filter((s) => s.status === "queued" || s.status === "pending_approval").length,
      sendsToday,
    },
    sendPolicy: {
      dailySendLimit: policy.dailySendLimit,
      sendStaggerMinutes: policy.sendStaggerMinutes,
      sendsToday,
      remainingToday: Math.max(0, policy.dailySendLimit - sendsToday),
    },
    analytics,
    connectorVault,
    syncLog: file.syncLog ?? [],
    autoSendOnActivate,
    autoSendDefault: bridgeConfigured,
  };
}

export async function getLead(leadId: string): Promise<WorkLead | null> {
  const file = await ensureWorkQueue();
  return file.leads.find((l) => l.id === leadId) ?? null;
}

export async function upsertLead(input: Partial<WorkLead> & { name: string; email: string }): Promise<WorkLead> {
  const file = await ensureWorkQueue();
  const now = new Date().toISOString();
  const existing = input.id ? file.leads.find((l) => l.id === input.id) : null;
  const lead: WorkLead = {
    id: existing?.id ?? `LEAD-${String(file.leads.length + 1).padStart(3, "0")}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: input.company?.trim() ?? existing?.company ?? "",
    title: input.title?.trim() ?? existing?.title ?? "",
    stage: input.stage ?? existing?.stage ?? "new",
    tags: input.tags ?? existing?.tags ?? [],
    notes: input.notes ?? existing?.notes ?? "",
    source: input.source ?? existing?.source ?? "manual",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastTouchAt: input.lastTouchAt ?? existing?.lastTouchAt ?? null,
  };
  if (existing) {
    Object.assign(existing, lead);
  } else {
    file.leads.push(lead);
  }
  await writeWorkFile(file);
  return lead;
}

export async function updateLeadStage(leadId: string, stage: LeadStage): Promise<WorkLead | null> {
  const file = await ensureWorkQueue();
  const idx = file.leads.findIndex((l) => l.id === leadId);
  if (idx < 0) return null;
  file.leads[idx] = {
    ...file.leads[idx]!,
    stage,
    updatedAt: new Date().toISOString(),
    lastTouchAt: stage === "replied" ? new Date().toISOString() : file.leads[idx]!.lastTouchAt,
  };
  if (stage === "won") {
    for (let i = 0; i < file.tasks.length; i++) {
      const task = file.tasks[i]!;
      if (task.leadId === leadId && !task.done) {
        file.tasks[i] = { ...task, done: true, updatedAt: new Date().toISOString() };
      }
    }
  }
  await writeWorkFile(file);
  return file.leads[idx]!;
}

export async function createTask(title: string, priority: TaskPriority = "P2", leadId?: string): Promise<WorkTask> {
  const file = await ensureWorkQueue();
  const now = new Date().toISOString();
  const task: WorkTask = {
    id: `TASK-${String(file.tasks.length + 1).padStart(3, "0")}`,
    title: title.trim(),
    priority,
    done: false,
    leadId: leadId ?? null,
    dueAt: null,
    createdAt: now,
    updatedAt: now,
  };
  file.tasks.push(task);
  await writeWorkFile(file);
  return task;
}

export async function toggleTaskDone(taskId: string): Promise<WorkTask | null> {
  const file = await ensureWorkQueue();
  const idx = file.tasks.findIndex((t) => t.id === taskId);
  if (idx < 0) return null;
  file.tasks[idx] = {
    ...file.tasks[idx]!,
    done: !file.tasks[idx]!.done,
    updatedAt: new Date().toISOString(),
  };
  await writeWorkFile(file);
  return file.tasks[idx]!;
}

export async function createSequence(input: {
  name: string;
  leadId: string;
  steps?: Array<{ kind?: SequenceStepKind; delayDays?: number; subject?: string; subjectAlt?: string; body?: string }>;
}): Promise<WorkSequence> {
  const file = await ensureWorkQueue();
  const now = new Date().toISOString();
  const steps: SequenceStep[] =
    input.steps?.length
      ? input.steps.map((s, i) => ({
          id: `STEP-${randomUUID().slice(0, 8)}`,
          kind: s.kind ?? "email",
          delayDays: s.delayDays ?? (i === 0 ? 0 : 3),
          subject: s.subject ?? "",
          subjectAlt: s.subjectAlt?.trim() || undefined,
          body: s.body ?? "",
          sentAt: null,
          scheduledAt: null,
        }))
      : [
          {
            id: `STEP-${randomUUID().slice(0, 8)}`,
            kind: "email",
            delayDays: 0,
            subject: "Intro",
            body: "Hi {{name}} — reaching out from CurXor.",
            sentAt: null,
            scheduledAt: null,
          },
        ];

  const seq: WorkSequence = {
    id: `SEQ-${String(file.sequences.length + 1).padStart(3, "0")}`,
    name: input.name.trim(),
    leadId: input.leadId,
    status: "draft",
    steps,
    currentStepIndex: 0,
    pauseOnReply: true,
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
    completedAt: null,
    lastError: null,
  };
  file.sequences.push(seq);
  await writeWorkFile(file);
  return seq;
}

export async function activateSequence(sequenceId: string): Promise<WorkSequence | null> {
  const file = await ensureWorkQueue();
  const idx = file.sequences.findIndex((s) => s.id === sequenceId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  file.sequences[idx] = {
    ...file.sequences[idx]!,
    status: "active",
    activatedAt: now,
    updatedAt: now,
  };
  await writeWorkFile(file);
  return file.sequences[idx]!;
}

export async function pauseSequence(sequenceId: string, reason?: string): Promise<WorkSequence | null> {
  const file = await ensureWorkQueue();
  const idx = file.sequences.findIndex((s) => s.id === sequenceId);
  if (idx < 0) return null;
  file.sequences[idx] = {
    ...file.sequences[idx]!,
    status: file.sequences[idx]!.status === "replied" ? "replied" : "paused",
    lastError: reason ?? file.sequences[idx]!.lastError,
    updatedAt: new Date().toISOString(),
  };
  await writeWorkFile(file);
  return file.sequences[idx]!;
}

export async function markSequenceReplied(sequenceId: string): Promise<WorkSequence | null> {
  const file = await ensureWorkQueue();
  const idx = file.sequences.findIndex((s) => s.id === sequenceId);
  if (idx < 0) return null;
  const seq = file.sequences[idx]!;
  file.sequences[idx] = {
    ...seq,
    status: "replied",
    updatedAt: new Date().toISOString(),
  };
  const leadIdx = file.leads.findIndex((l) => l.id === seq.leadId);
  if (leadIdx >= 0) {
    file.leads[leadIdx] = {
      ...file.leads[leadIdx]!,
      stage: "replied",
      lastTouchAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  await writeWorkFile(file);
  return file.sequences[idx]!;
}

export async function markSequenceStepSent(
  sequenceId: string,
  stepId: string,
  variant?: SubjectVariant,
): Promise<WorkSequence | null> {
  const file = await ensureWorkQueue();
  const idx = file.sequences.findIndex((s) => s.id === sequenceId);
  if (idx < 0) return null;
  const seq = file.sequences[idx]!;
  const stepIdx = seq.steps.findIndex((st) => st.id === stepId);
  if (stepIdx < 0) return null;
  const now = new Date().toISOString();
  seq.steps[stepIdx] = { ...seq.steps[stepIdx]!, sentAt: now, scheduledAt: null, subjectVariant: variant ?? seq.steps[stepIdx]!.subjectVariant };
  if (seq.status === "draft") seq.status = "active";
  seq.updatedAt = now;
  file.sequences[idx] = seq;
  await writeWorkFile(file);
  return seq;
}

export async function appendWorkSyncLog(input: {
  connector: string;
  action: string;
  detail: string;
}): Promise<WorkSyncLogEntry> {
  const file = await ensureWorkQueue();
  const entry: WorkSyncLogEntry = {
    id: `SYNC-${randomUUID().slice(0, 8)}`,
    connector: input.connector,
    action: input.action,
    detail: input.detail,
    createdAt: new Date().toISOString(),
  };
  file.syncLog = [entry, ...(file.syncLog ?? [])].slice(0, 100);
  await writeWorkFile(file);
  return entry;
}

export async function deferSequenceStepSend(
  sequenceId: string,
  delayMs: number,
): Promise<string | null> {
  const file = await ensureWorkQueue();
  const seq = file.sequences.find((s) => s.id === sequenceId);
  if (!seq) return null;
  const scheduledAt = new Date(Date.now() + delayMs).toISOString();
  await rescheduleSequenceStep(sequenceId, seq.currentStepIndex, scheduledAt);
  return scheduledAt;
}

export async function getSequenceNextDueAt(sequenceId: string): Promise<string | null> {
  const file = await ensureWorkQueue();
  const seq = file.sequences.find((s) => s.id === sequenceId);
  if (!seq) return null;
  const step = seq.steps[seq.currentStepIndex];
  return step?.scheduledAt ?? null;
}

export async function rescheduleSequenceStep(
  sequenceId: string,
  stepIndex: number,
  scheduledAt: string,
): Promise<WorkSequence | null> {
  const file = await ensureWorkQueue();
  const idx = file.sequences.findIndex((s) => s.id === sequenceId);
  if (idx < 0) return null;
  const seq = file.sequences[idx]!;
  const steps = seq.steps.map((st, i) => (i === stepIndex ? { ...st, scheduledAt } : st));
  file.sequences[idx] = { ...seq, steps, updatedAt: new Date().toISOString() };
  await writeWorkFile(file);
  return file.sequences[idx]!;
}

export async function advanceSequenceStep(sequenceId: string): Promise<WorkSequence | null> {
  const file = await ensureWorkQueue();
  const idx = file.sequences.findIndex((s) => s.id === sequenceId);
  if (idx < 0) return null;
  const seq = file.sequences[idx]!;
  const next = seq.currentStepIndex + 1;
  if (next >= seq.steps.length) {
    file.sequences[idx] = {
      ...seq,
      status: "completed",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } else {
    const nextStep = seq.steps[next]!;
    const scheduledAt =
      nextStep.delayDays > 0
        ? new Date(Date.now() + nextStep.delayDays * 86400000).toISOString()
        : null;
    const steps = seq.steps.map((st, i) => (i === next ? { ...st, scheduledAt } : st));
    file.sequences[idx] = {
      ...seq,
      steps,
      currentStepIndex: next,
      updatedAt: new Date().toISOString(),
    };
  }
  await writeWorkFile(file);
  return file.sequences[idx]!;
}

export async function recordSend(send: Omit<OutboundSend, "id" | "createdAt">): Promise<OutboundSend> {
  const file = await ensureWorkQueue();
  const row: OutboundSend = {
    ...send,
    id: `SEND-${String(file.sends.length + 1).padStart(3, "0")}`,
    createdAt: new Date().toISOString(),
  };
  file.sends.unshift(row);
  file.sends = file.sends.slice(0, 200);
  await writeWorkFile(file);
  return row;
}

export async function updateSendStatus(
  sendId: string,
  patch: Partial<Pick<OutboundSend, "status" | "sentAt" | "error">>,
): Promise<OutboundSend | null> {
  const file = await ensureWorkQueue();
  const idx = file.sends.findIndex((s) => s.id === sendId);
  if (idx < 0) return null;
  file.sends[idx] = { ...file.sends[idx]!, ...patch };
  await writeWorkFile(file);
  return file.sends[idx]!;
}

export async function ingestMailIndex(entries: MailIndexEntry[]): Promise<number> {
  const file = await ensureWorkQueue();
  file.mailIndex = [...entries, ...file.mailIndex].slice(0, 100);
  await writeWorkFile(file);
  return entries.length;
}

export async function scanLocalMailQueue(): Promise<MailIndexEntry[]> {
  const file = await ensureWorkQueue();
  const now = new Date().toISOString();
  const demo: MailIndexEntry[] = [
    {
      id: `MAIL-${randomUUID().slice(0, 8)}`,
      from: "alex@edgecompute.ai",
      subject: "Re: CurXor pricing",
      snippet: "Thanks — interested in appliance tiers. Can we schedule a call?",
      receivedAt: now,
      leadId: "LEAD-003",
      matchedReply: true,
      replyIntent: classifyReplyIntent("Re: CurXor pricing", "Thanks — interested in appliance tiers. Can we schedule a call?"),
    },
    {
      id: `MAIL-${randomUUID().slice(0, 8)}`,
      from: "notifications@calendar.local",
      subject: "Out of office until Monday",
      snippet: "I am away from email — automatic reply",
      receivedAt: now,
      leadId: null,
      matchedReply: false,
      replyIntent: classifyReplyIntent("Out of office until Monday", "I am away from email"),
    },
  ];
  file.mailIndex = [...demo, ...file.mailIndex.filter((m) => !demo.some((d) => d.from === m.from))].slice(0, 50);
  await writeWorkFile(file);
  for (const entry of demo.filter((e) => e.matchedReply && e.leadId)) {
    await markSendRepliedForLead(entry.leadId!);
  }
  return demo;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export async function importLeadsFromCsv(csvText: string): Promise<{ imported: number; skipped: number; leads: WorkLead[] }> {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { imported: 0, skipped: 0, leads: [] };

  const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const hasHeader = header.includes("email");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const idx = {
    name: hasHeader ? header.indexOf("name") : 0,
    email: hasHeader ? header.indexOf("email") : 1,
    company: hasHeader ? header.indexOf("company") : 2,
    title: hasHeader ? header.indexOf("title") : 3,
  };

  const file = await ensureWorkQueue();
  const existingEmails = new Set(file.leads.map((l) => l.email.toLowerCase()));
  const created: WorkLead[] = [];
  let skipped = 0;

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    const email = (cols[idx.email >= 0 ? idx.email : 1] ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      skipped += 1;
      continue;
    }
    if (existingEmails.has(email)) {
      skipped += 1;
      continue;
    }
    const name = (cols[idx.name >= 0 ? idx.name : 0] ?? email.split("@")[0] ?? "Prospect").trim();
    const lead = await upsertLead({
      name,
      email,
      company: cols[idx.company >= 0 ? idx.company : 2]?.trim(),
      title: cols[idx.title >= 0 ? idx.title : 3]?.trim(),
      source: "csv",
    });
    existingEmails.add(email);
    created.push(lead);
  }

  return { imported: created.length, skipped, leads: created };
}

export async function tagMailReplyIntent(mailId: string, intent: ReplyIntent): Promise<MailIndexEntry | null> {
  const file = await ensureWorkQueue();
  const idx = file.mailIndex.findIndex((m) => m.id === mailId);
  if (idx < 0) return null;
  file.mailIndex[idx] = { ...file.mailIndex[idx]!, replyIntent: intent };
  await writeWorkFile(file);
  return file.mailIndex[idx]!;
}

export async function trackSendOpen(sendId: string): Promise<OutboundSend | null> {
  const file = await ensureWorkQueue();
  const idx = file.sends.findIndex((s) => s.id === sendId);
  if (idx < 0) return null;
  if (!file.sends[idx]!.openedAt) {
    file.sends[idx] = { ...file.sends[idx]!, openedAt: new Date().toISOString() };
    await writeWorkFile(file);
  }
  return file.sends[idx]!;
}

export async function markSendRepliedForLead(leadId: string): Promise<number> {
  const file = await ensureWorkQueue();
  const now = new Date().toISOString();
  let updated = 0;
  for (let i = 0; i < file.sends.length; i++) {
    const send = file.sends[i]!;
    if (send.leadId !== leadId || send.status !== "sent" || send.repliedAt) continue;
    file.sends[i] = { ...send, repliedAt: now };
    updated += 1;
    break;
  }
  if (updated > 0) await writeWorkFile(file);
  return updated;
}

export function pickSubjectVariant(leadId: string): SubjectVariant {
  let hash = 0;
  for (let i = 0; i < leadId.length; i++) hash = (hash + leadId.charCodeAt(i)) % 1000;
  return hash % 2 === 0 ? "a" : "b";
}

export function resolveStepSubject(
  step: SequenceStep,
  lead: WorkLead,
): { subject: string; variant: SubjectVariant } {
  if (!step.subjectAlt?.trim()) {
    return { subject: personalizeTemplate(step.subject, lead), variant: "a" };
  }
  const variant = pickSubjectVariant(lead.id);
  const raw = variant === "b" ? step.subjectAlt : step.subject;
  return { subject: personalizeTemplate(raw, lead), variant };
}

export function personalizeTemplate(text: string, lead: WorkLead): string {
  return text
    .replace(/\{\{name\}\}/gi, lead.name.split(" ")[0] ?? lead.name)
    .replace(/\{\{company\}\}/gi, lead.company || "your team")
    .replace(/\{\{email\}\}/gi, lead.email)
    .replace(/\{\{title\}\}/gi, lead.title || "there");
}
