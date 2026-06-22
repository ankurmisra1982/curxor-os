"use client";

import type { WorkAgentAuditEntry } from "@/lib/work-queue-types";

interface WorkAuditTimelinePanelProps {
  rows?: WorkAgentAuditEntry[];
  entries?: WorkAgentAuditEntry[];
  onRefresh?: () => void;
}

function kindLabel(kind: string): string {
  return kind.replace(/_/g, " ");
}

export function WorkAuditTimelinePanel({ rows, entries, onRefresh }: WorkAuditTimelinePanelProps) {
  const audit = rows ?? entries ?? [];

  if (audit.length === 0) {
    return (
      <div className="space-y-2 font-mono text-[10px]">
        <p className="text-muted">No agent audit entries yet — approvals, MCP calls, and handoffs log here.</p>
        {onRefresh ? (
          <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted">
            Refresh
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1 font-mono text-[10px]">
      {onRefresh ? (
        <button type="button" onClick={onRefresh} className="mb-2 border border-line px-2 py-0.5 uppercase text-muted">
          Refresh
        </button>
      ) : null}
      {audit.map((row) => (
        <div key={row.id} className="grid grid-cols-[auto_1fr] gap-2 border border-line/40 px-2 py-1">
          <span className="text-muted whitespace-nowrap">{new Date(row.at).toLocaleString()}</span>
          <div>
            <p className="text-stark">
              <span className="uppercase text-cursor-glow">{kindLabel(row.kind)}</span>
              {row.tool ? ` · ${row.tool}` : ""}
              {row.source ? ` · ${row.source}` : ""}
            </p>
            {row.note ? <p className="text-muted">{row.note}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
