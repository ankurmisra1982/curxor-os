import "server-only";

import { ensureWorkQueue, getLead } from "./work-store";
import type { WorkAgentAuditEntry, WorkSyncLogEntry } from "./work-queue-types";

export type LeadActivityKind = "created" | "send" | "stage" | "sync" | "handoff" | "approval";

export interface LeadActivityEvent {
  id: string;
  kind: LeadActivityKind;
  at: string;
  title: string;
  detail: string;
  error?: string | null;
}

function auditKind(row: WorkAgentAuditEntry): LeadActivityKind {
  if (row.kind === "handoff") return "handoff";
  if (row.kind === "approval") return "approval";
  if (row.note.toLowerCase().includes("stage")) return "stage";
  return "sync";
}

function syncMatchesLead(row: WorkSyncLogEntry, email: string, leadId: string): boolean {
  if (row.leadId === leadId) return true;
  return row.detail.toLowerCase().includes(email.toLowerCase());
}

export async function buildLeadActivityTimeline(leadId: string): Promise<LeadActivityEvent[]> {
  const lead = await getLead(leadId);
  if (!lead) return [];

  const file = await ensureWorkQueue();
  const events: LeadActivityEvent[] = [];

  events.push({
    id: `created-${leadId}`,
    kind: "created",
    at: lead.createdAt,
    title: "Lead created",
    detail: `${lead.source || "manual"} · ${lead.email}`,
  });

  events.push({
    id: `stage-${leadId}-${lead.stage}`,
    kind: "stage",
    at: lead.updatedAt,
    title: `Pipeline · ${lead.stage}`,
    detail: lead.lastTouchAt ? `Last touch ${lead.lastTouchAt.slice(0, 10)}` : "Stage updated",
  });

  for (const send of file.sends.filter((s) => s.leadId === leadId)) {
    events.push({
      id: send.id,
      kind: "send",
      at: send.sentAt ?? send.createdAt,
      title: `Outbound · ${send.status}`,
      detail: send.subject,
      error: send.error,
    });
  }

  for (const row of file.agentAuditLog ?? []) {
    if (row.leadId !== leadId) continue;
    events.push({
      id: row.id,
      kind: auditKind(row),
      at: row.at,
      title: row.kind.replace(/_/g, " "),
      detail: row.note,
    });
  }

  for (const row of file.syncLog ?? []) {
    if (!syncMatchesLead(row, lead.email, leadId)) continue;
    events.push({
      id: row.id,
      kind: "sync",
      at: row.createdAt,
      title: `${row.connector} · ${row.action}`,
      detail: row.detail,
      error: row.error ?? null,
    });
  }

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 40);
}
