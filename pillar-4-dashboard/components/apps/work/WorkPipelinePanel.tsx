"use client";

import type { LeadStage, WorkLead } from "@/lib/work-queue-types";

const STAGES: LeadStage[] = ["new", "contacted", "replied", "qualified", "won", "lost"];

function stageClass(stage: LeadStage): string {
  if (stage === "replied" || stage === "qualified") return "text-cursor-glow";
  if (stage === "won") return "text-emerald-400";
  if (stage === "lost") return "text-muted";
  return "text-stark";
}

interface WorkPipelinePanelProps {
  leads: WorkLead[];
  selectedLeadId: string;
  onSelect: (id: string) => void;
  onStageChange: (leadId: string, stage: LeadStage) => void;
  onAddLead: () => void;
}

export function WorkPipelinePanel({
  leads,
  selectedLeadId,
  onSelect,
  onStageChange,
  onAddLead,
}: WorkPipelinePanelProps) {
  return (
    <div className="space-y-2 font-mono text-xs">
      <div className="flex justify-end">
        <button type="button" onClick={onAddLead} className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow">
          + Lead
        </button>
      </div>
      {leads.length === 0 ? (
        <p className="text-[11px] text-muted">No leads yet — add one or ask Outreach Claw to draft a sequence.</p>
      ) : (
        leads.map((lead) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => onSelect(lead.id)}
            className={`grid w-full grid-cols-[1fr_auto] gap-2 border px-3 py-2 text-left ${
              selectedLeadId === lead.id ? "border-cursor-glow bg-surface" : "border-line bg-panel"
            }`}
          >
            <div>
              <p className="text-stark">{lead.name}</p>
              <p className="text-[10px] text-muted">
                {lead.company || lead.email} · {lead.title || "—"}
              </p>
            </div>
            <select
              value={lead.stage}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onStageChange(lead.id, e.target.value as LeadStage)}
              className={`border border-line bg-panel px-1 py-0.5 text-[10px] uppercase ${stageClass(lead.stage)}`}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </button>
        ))
      )}
    </div>
  );
}
