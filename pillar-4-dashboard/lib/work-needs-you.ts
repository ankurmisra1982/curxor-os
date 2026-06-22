import "server-only";

import { ensureWorkQueue } from "./work-store";
import { readWorkDeskPermissions } from "./work-permissions";
import { slaChipForIso } from "./work-sla";
import type { SlaChipLevel } from "./work-sla";

export interface NeedsYouSummary {
  p1Tasks: number;
  pendingApprovals: number;
  interestedMail: number;
  total: number;
  operatorId: string;
  items: Array<{
    kind: "task" | "approval" | "mail";
    id: string;
    label: string;
    priority?: string;
    at: string;
    slaLevel: SlaChipLevel;
  }>;
}

export async function buildNeedsYouSummary(): Promise<NeedsYouSummary> {
  const file = await ensureWorkQueue();
  const { operatorId } = await readWorkDeskPermissions();
  const items: NeedsYouSummary["items"] = [];

  for (const t of file.tasks.filter((t) => !t.done && t.priority === "P1")) {
    items.push({
      kind: "task",
      id: t.id,
      label: t.title,
      priority: t.priority,
      at: t.createdAt,
      slaLevel: slaChipForIso(t.createdAt),
    });
  }
  for (const s of file.sends.filter((s) => s.status === "pending_approval")) {
    items.push({
      kind: "approval",
      id: s.id,
      label: `${s.to} · ${s.subject.slice(0, 48)}`,
      at: s.createdAt,
      slaLevel: slaChipForIso(s.createdAt),
    });
  }
  for (const m of file.mailIndex.filter((m) => m.replyIntent === "interested")) {
    if (m.assignedTo && m.assignedTo !== operatorId) continue;
    const assignHint = m.assignedTo ? ` · ${m.assignedTo}` : "";
    items.push({
      kind: "mail",
      id: m.id,
      label: `${m.from}: ${m.subject.slice(0, 40)}${assignHint}`,
      at: m.receivedAt,
      slaLevel: slaChipForIso(m.receivedAt),
    });
  }

  const p1Tasks = file.tasks.filter((t) => !t.done && t.priority === "P1").length;
  const pendingApprovals = file.sends.filter((s) => s.status === "pending_approval").length;
  const interestedMail = file.mailIndex.filter(
    (m) => m.replyIntent === "interested" && (!m.assignedTo || m.assignedTo === operatorId),
  ).length;

  return {
    p1Tasks,
    pendingApprovals,
    interestedMail,
    total: p1Tasks + pendingApprovals + interestedMail,
    operatorId,
    items: items.slice(0, 15),
  };
}
