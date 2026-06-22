"use client";

import { useMemo, useState } from "react";

import { useWorkInboxKeys } from "@/hooks/useWorkInboxKeys";
import { groupMailIntoThreads } from "@/lib/work-mail-threads";
import type { MailIndexEntry, ReplyIntent, WorkLead, WorkTask } from "@/lib/work-queue-types";

const INTENTS: ReplyIntent[] = ["interested", "objection", "ooo", "neutral", "unknown"];

type InboxSplit = "waiting" | "snoozed" | "done";

interface WorkInboxTriagePanelProps {
  rows: MailIndexEntry[];
  tasks?: WorkTask[];
  leads: WorkLead[];
  highlightMailId?: string | null;
  threadView?: boolean;
  onAssign: (mailId: string, leadId: string) => void;
  onTagIntent: (mailId: string, intent: ReplyIntent) => void;
  onDraftReply: (mailId: string) => void;
  onSnooze?: (mailId: string) => void;
  onArchive?: (mailId: string) => void;
  onMarkDone?: (mailId: string) => void;
}

function filterBySplit(rows: MailIndexEntry[], tasks: WorkTask[], split: InboxSplit): MailIndexEntry[] {
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

export function WorkInboxTriagePanel({
  rows,
  tasks = [],
  leads,
  highlightMailId,
  threadView = true,
  onAssign,
  onTagIntent,
  onDraftReply,
  onSnooze,
  onArchive,
  onMarkDone,
}: WorkInboxTriagePanelProps) {
  const [split, setSplit] = useState<InboxSplit>("waiting");
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const filtered = useMemo(() => filterBySplit(rows, tasks, split), [rows, tasks, split]);
  const threads = useMemo(() => (threadView ? groupMailIntoThreads(filtered) : []), [filtered, threadView]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const displayRows = threadView
    ? threads.map((t) => ({ ...t.messages[t.messages.length - 1]!, threadCount: t.messages.length, threadId: t.id }))
    : filtered.slice(0, 30).map((r) => ({ ...r, threadCount: 1, threadId: r.id }));

  useWorkInboxKeys({
    enabled: displayRows.length > 0,
    threads: threadView ? threads : groupMailIntoThreads(displayRows),
    selectedIndex,
    onSelectIndex: setSelectedIndex,
    onDraftReply,
    onAssign,
    onSnooze: onSnooze ?? (() => {}),
    onArchive: onArchive ?? (() => {}),
    onMarkDone: onMarkDone ?? (() => {}),
    onTagIntent,
    leads,
    defaultLeadId: leads[0]?.id,
  });

  if (rows.length === 0) {
    return <p className="font-mono text-[10px] text-muted">No mail indexed — run Scan Inbox skill or wait for IMAP ingest.</p>;
  }

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex flex-wrap gap-1">
        {(["waiting", "snoozed", "done"] as InboxSplit[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSplit(s)}
            className={`border px-2 py-0.5 uppercase ${split === s ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="text-muted uppercase">j/k navigate · r draft · a assign · s snooze · e archive · d done · 1–5 intent</p>
      {displayRows.map((row, idx) => {
        const thread = threads.find((t) => t.id === row.threadId);
        const expanded = expandedThreadId === row.threadId;
        return (
          <div
            key={row.threadId}
            className={`border px-3 py-2 ${
              highlightMailId === row.id || selectedIndex === idx ? "border-cursor-glow bg-surface" : "border-line"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-stark truncate">{row.from}</span>
              <span className="text-muted">
                {row.threadCount > 1 ? (
                  <button
                    type="button"
                    className="text-cursor-glow underline"
                    onClick={() => setExpandedThreadId(expanded ? null : row.threadId)}
                  >
                    {row.threadCount} msgs {expanded ? "▲" : "▼"}
                  </button>
                ) : null}
                {row.threadCount > 1 ? " · " : ""}
                {new Date(row.receivedAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-stark">{row.subject}</p>
            <p className="mt-0.5 text-muted line-clamp-2">{row.snippet}</p>
            {expanded && thread && thread.messages.length > 1 ? (
              <ul className="mt-2 space-y-1 border-t border-line/40 pt-2">
                {thread.messages.map((m) => (
                  <li key={m.id} className="text-muted">
                    <span className="text-stark">{new Date(m.receivedAt).toLocaleString()}</span> — {m.snippet.slice(0, 100)}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {INTENTS.map((intent, i) => (
                <button
                  key={intent}
                  type="button"
                  onClick={() => onTagIntent(row.id, intent)}
                  className={`border px-1.5 py-0.5 uppercase ${
                    row.replyIntent === intent ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
                  }`}
                >
                  {i + 1}:{intent}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onDraftReply(row.id)}
                className="border border-cursor-glow/60 px-1.5 py-0.5 uppercase text-cursor-glow"
              >
                Draft (r)
              </button>
              {onSnooze ? (
                <button
                  type="button"
                  onClick={() => onSnooze(row.id)}
                  className="border border-line px-1.5 py-0.5 uppercase text-muted"
                >
                  Snooze (s)
                </button>
              ) : null}
              {onArchive ? (
                <button
                  type="button"
                  onClick={() => onArchive(row.id)}
                  className="border border-line px-1.5 py-0.5 uppercase text-muted"
                >
                  Archive (e)
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="text-muted uppercase">Assign (a)</label>
              <select
                className="border border-line bg-panel px-2 py-0.5 text-stark"
                value={row.leadId ?? ""}
                onChange={(e) => {
                  if (e.target.value) onAssign(row.id, e.target.value);
                }}
              >
                <option value="">— lead —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.email}
                  </option>
                ))}
              </select>
              {row.assignedTo ? <span className="text-cursor-glow">assigned</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
