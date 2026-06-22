"use client";

import type { MailIndexEntry, ReplyIntent, WorkLead } from "@/lib/work-queue-types";

const INTENTS: ReplyIntent[] = ["interested", "objection", "ooo", "neutral", "unknown"];

interface WorkInboxTriagePanelProps {
  rows: MailIndexEntry[];
  leads: WorkLead[];
  highlightMailId?: string | null;
  onAssign: (mailId: string, leadId: string) => void;
  onTagIntent: (mailId: string, intent: ReplyIntent) => void;
  onDraftReply: (mailId: string) => void;
}

export function WorkInboxTriagePanel({
  rows,
  leads,
  highlightMailId,
  onAssign,
  onTagIntent,
  onDraftReply,
}: WorkInboxTriagePanelProps) {
  if (rows.length === 0) {
    return <p className="font-mono text-[10px] text-muted">No mail indexed — run Scan Inbox skill or wait for IMAP ingest.</p>;
  }

  return (
    <div className="space-y-2 font-mono text-[10px]">
      {rows.slice(0, 30).map((row) => (
        <div key={row.id} className={`border px-3 py-2 ${highlightMailId === row.id ? "border-cursor-glow bg-surface" : "border-line"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-stark truncate">{row.from}</span>
            <span className="text-muted">{new Date(row.receivedAt).toLocaleString()}</span>
          </div>
          <p className="mt-1 text-stark">{row.subject}</p>
          <p className="mt-0.5 text-muted line-clamp-2">{row.snippet}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {INTENTS.map((intent) => (
              <button
                key={intent}
                type="button"
                onClick={() => onTagIntent(row.id, intent)}
                className={`border px-1.5 py-0.5 uppercase ${
                  row.replyIntent === intent ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
                }`}
              >
                {intent}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onDraftReply(row.id)}
              className="border border-cursor-glow/60 px-1.5 py-0.5 uppercase text-cursor-glow"
            >
              Draft reply
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-muted uppercase">Assign</label>
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
