"use client";

import type { OutboundSend } from "@/lib/work-queue-types";

interface WorkOutboundPanelProps {
  sends: OutboundSend[];
  onRetry: (sendId: string) => void;
}

function statusClass(status: OutboundSend["status"]): string {
  if (status === "sent" || status === "simulated") return "text-cursor-glow";
  if (status === "failed") return "text-red-400";
  if (status === "pending_approval") return "text-amber-400";
  return "text-stark";
}

function isBounceLike(error: string | null): boolean {
  return Boolean(error && /\b(bounce|550|mailbox|user unknown)\b/i.test(error));
}

export function WorkOutboundPanel({ sends, onRetry }: WorkOutboundPanelProps) {
  const recent = sends.slice(0, 12);
  return (
    <div className="space-y-2 font-mono text-xs">
      {recent.length === 0 ? (
        <p className="text-[11px] text-muted">No outbound sends yet — activate a sequence to queue mail.</p>
      ) : (
        recent.map((send) => (
          <div key={send.id} className="grid grid-cols-[1fr_auto] gap-2 border border-line px-3 py-2">
            <div>
              <p className="text-stark truncate">{send.subject}</p>
              <p className="text-[10px] text-muted">
                {send.to} · {send.id}
                {send.subjectVariant ? ` · var ${send.subjectVariant.toUpperCase()}` : ""}
                {send.openedAt ? " · opened" : ""}
                {send.repliedAt ? " · replied" : ""}
              </p>
              {send.error ? (
                <p className="text-[10px] text-red-400">
                  {isBounceLike(send.error) ? "Bounce · " : ""}
                  {send.error}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className={`text-[10px] uppercase ${statusClass(send.status)}`}>{send.status}</p>
              {send.status === "failed" || send.status === "pending_approval" ? (
                <button type="button" onClick={() => onRetry(send.id)} className="mt-1 border border-line px-1 py-0.5 text-[9px] uppercase text-muted hover:text-stark">
                  {send.status === "pending_approval" ? "Send" : "Retry"}
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
