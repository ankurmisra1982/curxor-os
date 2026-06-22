import type { MailIndexEntry, WorkTask } from "./work-queue-types";

export type InboxSplit = "waiting" | "snoozed" | "done";

export function filterMailBySplit(rows: MailIndexEntry[], tasks: WorkTask[], split: InboxSplit): MailIndexEntry[] {
  const now = Date.now();
  if (split === "done") return rows.filter((m) => m.doneAt || m.archivedAt);
  if (split === "snoozed") {
    return rows.filter((m) => {
      if (m.snoozedUntil && Date.parse(m.snoozedUntil) > now) return true;
      return tasks.some((t) => !t.done && t.title.startsWith("Snoozed:") && t.leadId === m.leadId);
    });
  }
  return rows.filter((m) => !m.archivedAt && !m.doneAt && (!m.snoozedUntil || Date.parse(m.snoozedUntil) <= now));
}

export function countMailBySplit(rows: MailIndexEntry[], tasks: WorkTask[]): Record<InboxSplit, number> {
  return {
    waiting: filterMailBySplit(rows, tasks, "waiting").length,
    snoozed: filterMailBySplit(rows, tasks, "snoozed").length,
    done: filterMailBySplit(rows, tasks, "done").length,
  };
}
