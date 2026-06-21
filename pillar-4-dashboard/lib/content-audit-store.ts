import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type AuditAction =
  | "submit_post_approval"
  | "approve_post"
  | "reject_post"
  | "submit_reply_approval"
  | "approve_reply"
  | "reject_reply"
  | "publish_post"
  | "publish_reply"
  | "ops_pause"
  | "ops_resume";

export type AuditTargetType = "post" | "reply" | "ops";

export interface ContentAuditEntry {
  id: string;
  at: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  actor: string;
  detail: string;
  meta?: Record<string, unknown>;
}

interface AuditFile {
  version: 1;
  entries: ContentAuditEntry[];
  updatedAt: string;
}

function auditPath(): string {
  return process.env.CURXOR_CONTENT_AUDIT_PATH ?? "/etc/curxor/content-audit.json";
}

async function readAudit(): Promise<AuditFile> {
  try {
    const raw = await readFile(auditPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AuditFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) throw new Error("invalid");
    return {
      version: 1,
      entries: parsed.entries,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, entries: [], updatedAt: new Date().toISOString() };
  }
}

async function writeAudit(data: AuditFile): Promise<void> {
  const filePath = auditPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function appendAuditEntry(input: {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  actor?: string;
  detail: string;
  meta?: Record<string, unknown>;
}): Promise<ContentAuditEntry> {
  const file = await readAudit();
  const entry: ContentAuditEntry = {
    id: randomUUID(),
    at: new Date().toISOString(),
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    actor: input.actor?.trim() || "system",
    detail: input.detail,
    meta: input.meta,
  };
  file.entries.unshift(entry);
  if (file.entries.length > 512) file.entries = file.entries.slice(0, 512);
  await writeAudit(file);
  return entry;
}

export async function listAuditEntries(input?: {
  targetId?: string;
  limit?: number;
}): Promise<ContentAuditEntry[]> {
  const file = await readAudit();
  const limit = input?.limit ?? 48;
  const rows = input?.targetId
    ? file.entries.filter((e) => e.targetId === input.targetId)
    : file.entries;
  return rows.slice(0, limit);
}
