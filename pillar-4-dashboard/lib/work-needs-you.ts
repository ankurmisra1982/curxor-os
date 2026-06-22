import "server-only";

import { ensureWorkQueue } from "./work-store";

export interface NeedsYouSummary {
  p1Tasks: number;
  pendingApprovals: number;
  interestedMail: number;
  total: number;
  items: Array<{ kind: "task" | "approval" | "mail"; id: string; label: string; priority?: string }>;
}

export async function buildNeedsYouSummary(): Promise<NeedsYouSummary> {
  const file = await ensureWorkQueue();
  const items: NeedsYouSummary["items"] = [];

  for (const t of file.tasks.filter((t) => !t.done && t.priority === "P1")) {
    items.push({ kind: "task", id: t.id, label: t.title, priority: t.priority });
  }
  for (const s of file.sends.filter((s) => s.status === "pending_approval")) {
    items.push({ kind: "approval", id: s.id, label: `${s.to} · ${s.subject.slice(0, 48)}` });
  }
  for (const m of file.mailIndex.filter((m) => m.replyIntent === "interested")) {
    items.push({ kind: "mail", id: m.id, label: `${m.from}: ${m.subject.slice(0, 40)}` });
  }

  const p1Tasks = file.tasks.filter((t) => !t.done && t.priority === "P1").length;
  const pendingApprovals = file.sends.filter((s) => s.status === "pending_approval").length;
  const interestedMail = file.mailIndex.filter((m) => m.replyIntent === "interested").length;

  return {
    p1Tasks,
    pendingApprovals,
    interestedMail,
    total: p1Tasks + pendingApprovals + interestedMail,
    items: items.slice(0, 15),
  };
}
