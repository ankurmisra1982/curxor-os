"use client";

import type { LeadActivityEvent } from "@/lib/work-lead-activity";

interface WorkLeadActivityPanelProps {
  leadId: string | null;
  leadName?: string;
  events: LeadActivityEvent[];
  loading?: boolean;
  onRefresh?: () => void;
}

function kindClass(kind: LeadActivityEvent["kind"]): string {
  if (kind === "send") return "text-cursor-glow";
  if (kind === "stage") return "text-emerald-400";
  if (kind === "handoff") return "text-amber-400";
  if (kind === "sync") return "text-stark";
  return "text-muted";
}

export function WorkLeadActivityPanel({ leadId, leadName, events, loading, onRefresh }: WorkLeadActivityPanelProps) {
  if (!leadId) {
    return (
      <p className="font-mono text-[10px] text-muted">Select a lead to view activity timeline.</p>
    );
  }

  const kinds = new Set(events.map((e) => e.kind));

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          Activity · {leadName ?? leadId} · {kinds.size} type{kinds.size === 1 ? "" : "s"}
        </p>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="border border-line px-2 py-0.5 uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow disabled:opacity-40"
          >
            Refresh
          </button>
        ) : null}
      </div>
      {events.length === 0 ? (
        <p className="text-muted">No activity yet — sends, stage changes, and CRM sync appear here.</p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className={`border px-3 py-2 ${event.error ? "border-red-400/40" : "border-line"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`uppercase ${kindClass(event.kind)}`}>{event.kind}</span>
              <span className="text-muted">{new Date(event.at).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-stark">{event.title}</p>
            <p className="mt-0.5 text-muted">{event.detail}</p>
            {event.error ? <p className="mt-1 text-red-400">{event.error}</p> : null}
          </div>
        ))
      )}
    </div>
  );
}
