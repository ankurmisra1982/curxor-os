import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { WorkLead, WorkQueueFile, WorkSequence, SequenceStep } from "./work-queue-types";

function workspaceRoot(): string {
  return process.env.CURXOR_AGENT_WORKSPACE_PATH ?? "/etc/curxor/agent-workspace";
}

function queuePath(forgedAppId: string): string {
  return path.join(workspaceRoot(), forgedAppId, "work-queue.json");
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

async function ensureForgedWorkQueue(forgedAppId: string): Promise<WorkQueueFile> {
  const filePath = queuePath(forgedAppId);
  await mkdir(path.dirname(filePath), { recursive: true });
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
    const file = emptyFile();
    await writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o644 });
    return file;
  }
}

async function writeForgedWorkQueue(forgedAppId: string, file: WorkQueueFile): Promise<void> {
  file.updatedAt = new Date().toISOString();
  await writeFile(queuePath(forgedAppId), `${JSON.stringify(file, null, 2)}\n`, { mode: 0o644 });
}

export interface ForgedWorkQueueStatus {
  forgedAppId: string;
  source: "demo" | "live";
  leads: WorkLead[];
  sequences: WorkSequence[];
  stats: {
    leadCount: number;
    sequenceCount: number;
    activeSequences: number;
    draftSequences: number;
  };
}

export async function fetchForgedWorkStatus(forgedAppId: string): Promise<ForgedWorkQueueStatus> {
  const file = await ensureForgedWorkQueue(forgedAppId);
  return {
    forgedAppId,
    source: file.leads.length === 0 && file.sequences.length === 0 ? "demo" : "live",
    leads: file.leads,
    sequences: file.sequences,
    stats: {
      leadCount: file.leads.length,
      sequenceCount: file.sequences.length,
      activeSequences: file.sequences.filter((s) => s.status === "active").length,
      draftSequences: file.sequences.filter((s) => s.status === "draft").length,
    },
  };
}

export async function upsertForgedLead(
  forgedAppId: string,
  input: { name: string; email: string; company?: string },
): Promise<WorkLead> {
  const file = await ensureForgedWorkQueue(forgedAppId);
  const now = new Date().toISOString();
  const lead: WorkLead = {
    id: `LEAD-${String(file.leads.length + 1).padStart(3, "0")}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: input.company?.trim() ?? "",
    title: "",
    stage: "new",
    tags: ["forged"],
    notes: "",
    source: "forged-desk",
    createdAt: now,
    updatedAt: now,
    lastTouchAt: null,
  };
  file.leads.push(lead);
  await writeForgedWorkQueue(forgedAppId, file);
  return lead;
}

export async function createForgedSequence(
  forgedAppId: string,
  input: { leadId: string; name?: string },
): Promise<WorkSequence | null> {
  const file = await ensureForgedWorkQueue(forgedAppId);
  const lead = file.leads.find((l) => l.id === input.leadId);
  if (!lead) return null;

  const now = new Date().toISOString();
  const steps: SequenceStep[] = [
    {
      id: `STEP-${randomUUID().slice(0, 8)}`,
      kind: "email",
      delayDays: 0,
      subject: `Intro — ${lead.company || lead.name}`,
      body: `Hi {{name}},\n\nReaching out from your forged outreach desk on CurXor.\n\nBest,`,
      sentAt: null,
      scheduledAt: null,
    },
    {
      id: `STEP-${randomUUID().slice(0, 8)}`,
      kind: "email",
      delayDays: 3,
      subject: `Follow-up — ${lead.company || lead.name}`,
      body: `Hi {{name}},\n\nFollowing up on my note — happy to share more if useful.`,
      sentAt: null,
      scheduledAt: null,
    },
  ];

  const seq: WorkSequence = {
    id: `SEQ-${String(file.sequences.length + 1).padStart(3, "0")}`,
    name: input.name?.trim() || `${lead.name} sequence`,
    leadId: lead.id,
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
  lead.stage = "contacted";
  lead.updatedAt = now;
  await writeForgedWorkQueue(forgedAppId, file);
  return seq;
}

export async function seedForgedWorkDemoIfEmpty(forgedAppId: string): Promise<WorkLead | null> {
  const file = await ensureForgedWorkQueue(forgedAppId);
  if (file.leads.length > 0) return file.leads[0] ?? null;
  return upsertForgedLead(forgedAppId, {
    name: "Demo Prospect",
    email: `demo-${forgedAppId.slice(-8)}@forged.local`,
    company: "CurXor Pilot",
  });
}
