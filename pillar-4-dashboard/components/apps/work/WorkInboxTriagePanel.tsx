"use client";

import { useMemo, useState } from "react";

import { useWorkInboxKeys } from "@/hooks/useWorkInboxKeys";
import { groupMailIntoThreads } from "@/lib/work-mail-threads";
import type { MailIndexEntry, ReplyIntent, WorkLead } from "@/lib/work-queue-types";

const INTENTS: ReplyIntent[] = ["interested", "objection", "ooo", "neutral", "unknown"];

interface WorkInboxTriagePanelProps {
  rows: MailIndexEntry[];
  leads: WorkLead[];
  highlightMailId?: string | null;
  threadView?: boolean;
  onAssign: (mailId: string, leadId: string) => void;
  onTagIntent: (mailId: string, intent: ReplyIntent) => void;
  onDraftReply: (mailId: string) => void;
  onSnooze?: (mailId: string) => void;
}

export function WorkInboxTriagePanel({
  rows,
  leads,
  highlightMailId,
  threadView = true,
  onAssign,
  onTagIntent,
  onDraftReply,
  onSnooze,
}: WorkInboxTriagePanelProps) {
  const threads = useMemo(() => (threadView ? groupMailIntoThreads(rows) : []), [rows, threadView]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const displayRows = threadView
    ? threads.map((t) => ({ ...t.messages[t.messages.length - 1]!, threadCount: t.messages.length, threadId: t.id }))
    : rows.slice(0, 30).map((r) => ({ ...r, threadCount: 1, threadId: r.id }));

  useWorkInboxKeys({
    enabled: displayRows.length > 0,
    threads: threadView ? threads : groupMailIntoThreads(displayRows),
    selectedIndex,
    onSelectIndex: setSelectedIndex,
    onDraftReply,
    onAssign,
    onSnooze: onSnooze ?? (() => {}),
    onTagIntent,
    leads,
    defaultLeadId: leads[0]?.id,
  });

  if (rows.length === 0) {
    return <p className="font-mono text-[10px] text-muted">No mail indexed — run Scan Inbox skill or wait for IMAP ingest.</p>;
  }

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <p className="text-muted uppercase">j/k navigate · r draft · a assign · s snooze · 1–5 intent</p>
      {displayRows.map((row, idx) => (
        <div
          key={row.threadId}
          className={`border px-3 py-2 ${
            highlightMailId === row.id || selectedIndex === idx ? "border-cursor-glow bg-surface" : "border-line"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-stark truncate">{row.from}</span>
            <span className="text-muted">
              {row.threadCount > 1 ? `${row.threadCount} msgs · ` : ""}
              {new Date(row.receivedAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-stark">{row.subject}</p>
          <p className="mt-0.5 text-muted line-clamp-2">{row.snippet}</p>
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
      ))}
    </div>
  );
}
