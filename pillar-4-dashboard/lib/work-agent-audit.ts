import "server-only";

import type { WorkAgentAuditEntry } from "./work-queue-types";
import { ensureWorkQueue, writeWorkFilePartial } from "./work-store";

const MAX_AUDIT = 100;

export async function appendAgentAudit(
  entry: Omit<WorkAgentAuditEntry, "id" | "at"> & { at?: string },
): Promise<WorkAgentAuditEntry> {
  const file = await ensureWorkQueue();
  const row: WorkAgentAuditEntry = {
    id: `WAGT-${String((file.agentAuditLog ?? []).length + 1).padStart(4, "0")}`,
    at: entry.at ?? new Date().toISOString(),
    kind: entry.kind,
    source: entry.source,
    tool: entry.tool,
    note: entry.note,
    sendId: entry.sendId ?? null,
    leadId: entry.leadId ?? null,
  };
  file.agentAuditLog = [row, ...(file.agentAuditLog ?? [])].slice(0, MAX_AUDIT);
  await writeWorkFilePartial(file);
  return row;
}

export async function listWorkAgentAudit(limit = 25): Promise<WorkAgentAuditEntry[]> {
  const file = await ensureWorkQueue();
  return (file.agentAuditLog ?? []).slice(0, limit);
}
