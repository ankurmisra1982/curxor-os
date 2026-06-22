import type { MailIndexEntry } from "./work-queue-types";

export interface MailThread {
  id: string;
  from: string;
  subjectRoot: string;
  messages: MailIndexEntry[];
  latestAt: string;
  unreadCount: number;
}

const RE_PREFIX = /^(re|fwd|fw):\s*/i;

export function normalizeMailSubject(subject: string): string {
  let s = subject.trim();
  while (RE_PREFIX.test(s)) {
    s = s.replace(RE_PREFIX, "").trim();
  }
  return s.toLowerCase();
}

export function threadKeyForMail(row: MailIndexEntry): string {
  const from = row.from.trim().toLowerCase();
  const root = normalizeMailSubject(row.subject);
  return `${from}|${root}`;
}

export function groupMailThreads(rows: MailIndexEntry[]): MailThread[] {
  const map = new Map<string, MailThread>();
  for (const row of rows) {
    const key = threadKeyForMail(row);
    const existing = map.get(key);
    if (existing) {
      existing.messages.push(row);
      if (Date.parse(row.receivedAt) > Date.parse(existing.latestAt)) {
        existing.latestAt = row.receivedAt;
      }
      if (!row.matchedReply && !row.leadId) existing.unreadCount += 1;
    } else {
      map.set(key, {
        id: key,
        from: row.from,
        subjectRoot: normalizeMailSubject(row.subject),
        messages: [row],
        latestAt: row.receivedAt,
        unreadCount: !row.matchedReply && !row.leadId ? 1 : 0,
      });
    }
  }
  for (const thread of map.values()) {
    thread.messages.sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt));
  }
  return [...map.values()].sort((a, b) => Date.parse(b.latestAt) - Date.parse(a.latestAt));
}

/** Alias used by work-store. */
export const groupMailIntoThreads = groupMailThreads;
