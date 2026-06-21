"use client";

import type { MailIndexEntry, ReplyIntent } from "@/lib/work-queue-types";
import { REPLY_INTENT_LABELS } from "@/lib/work-reply-intent";

const INTENTS: ReplyIntent[] = ["interested", "objection", "ooo", "neutral", "unknown"];

interface WorkMailIndexPanelProps {
  rows: MailIndexEntry[];
  onTagIntent: (mailId: string, intent: ReplyIntent) => void;
}

export function WorkMailIndexPanel({ rows, onTagIntent }: WorkMailIndexPanelProps) {
  return (
    <table className="w-full border-collapse font-mono text-xs">
      <thead>
        <tr className="border-b border-line text-[10px] uppercase tracking-widest text-muted">
          <th className="py-2 text-left">From</th>
          <th className="py-2 text-left">Subject</th>
          <th className="py-2 text-left">Intent</th>
          <th className="py-2 text-right">Reply</th>
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 12).map((row) => (
          <tr key={row.id} className="border-b border-line/40">
            <td className="py-2 text-muted">{row.from}</td>
            <td className="py-2">{row.subject}</td>
            <td className="py-2">
              <select
                value={row.replyIntent ?? "unknown"}
                onChange={(e) => onTagIntent(row.id, e.target.value as ReplyIntent)}
                className="border border-line bg-panel px-1 py-0.5 text-[10px] text-stark"
              >
                {INTENTS.map((intent) => (
                  <option key={intent} value={intent}>
                    {REPLY_INTENT_LABELS[intent]}
                  </option>
                ))}
              </select>
            </td>
            <td className="py-2 text-right text-cursor-glow">{row.matchedReply ? "MATCH" : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
