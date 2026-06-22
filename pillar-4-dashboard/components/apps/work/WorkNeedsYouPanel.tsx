"use client";

interface NeedsYouItem {
  kind: "task" | "approval" | "mail";
  id: string;
  label: string;
  priority?: string;
}

interface NeedsYouSummaryView {
  total: number;
  p1Tasks: number;
  pendingApprovals: number;
  interestedMail: number;
  operatorId?: string;
  items: NeedsYouItem[];
}

interface StallItemView {
  id: string;
  kind: string;
  title: string;
  detail: string;
  leadId: string | null;
  sequenceId: string | null;
  sendId: string | null;
  severity: "high" | "medium" | "low";
  stalledSince: string;
}

interface WorkNeedsYouPanelProps {
  items?: StallItemView[];
  summary?: NeedsYouSummaryView | null;
  onOpenSend?: (sendId: string) => void;
  onOpenSequence?: (sequenceId: string) => void;
  onOpenLead?: (leadId: string) => void;
}

function severityClass(severity: StallItemView["severity"]): string {
  if (severity === "high") return "border-amber-500/50 text-amber-400";
  if (severity === "medium") return "border-cursor-glow/40 text-cursor-glow";
  return "border-line text-muted";
}

export function WorkNeedsYouPanel({ items, summary, onOpenSend, onOpenSequence, onOpenLead }: WorkNeedsYouPanelProps) {
  if (summary && summary.total > 0) {
    return (
      <div className="space-y-2 font-mono text-[10px]">
        <p className="text-muted">
          {summary.operatorId ? `Operator ${summary.operatorId} · ` : ""}
          {summary.p1Tasks} P1 tasks · {summary.pendingApprovals} approvals · {summary.interestedMail} interested
        </p>
        {summary.items.map((item) => (
          <div key={`${item.kind}-${item.id}`} className="border border-line px-3 py-2">
            <span className="uppercase text-cursor-glow">{item.kind}</span>
            <p className="mt-1 text-stark">{item.label}</p>
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted">
        Nothing blocking — desk is moving. Stalls appear when sequences, approvals, or replies need attention.
      </p>
    );
  }

  return (
    <div className="space-y-2 font-mono text-[10px]">
      {items.map((item) => (
        <div key={item.id} className={`border px-3 py-2 ${severityClass(item.severity)}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="uppercase tracking-widest">{item.kind.replace(/_/g, " ")}</span>
            <span className="text-muted">{new Date(item.stalledSince).toLocaleDateString()}</span>
          </div>
          <p className="mt-1 text-stark">{item.title}</p>
          <p className="mt-0.5 text-muted">{item.detail}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.sendId && onOpenSend ? (
              <button type="button" onClick={() => onOpenSend(item.sendId!)} className="border border-line px-1.5 py-0.5 uppercase">
                Open send
              </button>
            ) : null}
            {item.sequenceId && onOpenSequence ? (
              <button type="button" onClick={() => onOpenSequence(item.sequenceId!)} className="border border-line px-1.5 py-0.5 uppercase">
                Open sequence
              </button>
            ) : null}
            {item.leadId && onOpenLead ? (
              <button type="button" onClick={() => onOpenLead(item.leadId!)} className="border border-line px-1.5 py-0.5 uppercase">
                Open lead
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
