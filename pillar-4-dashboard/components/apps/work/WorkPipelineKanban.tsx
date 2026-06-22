"use client";

import type { DragEvent } from "react";

import type { LeadStage, WorkLead } from "@/lib/work-queue-types";

const STAGES: LeadStage[] = ["new", "contacted", "replied", "qualified", "won", "lost"];

interface WorkPipelineKanbanProps {
  leads: WorkLead[];
  selectedLeadId: string;
  onSelect: (leadId: string) => void;
  onStageChange: (leadId: string, stage: LeadStage) => void;
}

export function WorkPipelineKanban({ leads, selectedLeadId, onSelect, onStageChange }: WorkPipelineKanbanProps) {
  const onDragStart = (e: DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/lead-id", leadId);
  };

  const onDrop = (e: DragEvent, stage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/lead-id");
    if (leadId) onStageChange(leadId, stage);
  };

  return (
    <div className="grid gap-2 lg:grid-cols-3 xl:grid-cols-6">
      {STAGES.map((stage) => {
        const column = leads.filter((l) => l.stage === stage);
        return (
          <div
            key={stage}
            className="min-h-[120px] border border-line/60 bg-panel/30 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, stage)}
          >
            <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">{stage}</p>
            <div className="space-y-1">
              {column.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  draggable
                  onDragStart={(e) => onDragStart(e, lead.id)}
                  onClick={() => onSelect(lead.id)}
                  className={`block w-full border px-2 py-1 text-left text-[10px] ${
                    selectedLeadId === lead.id ? "border-cursor-glow text-cursor-glow" : "border-line text-stark"
                  }`}
                >
                  <span className="block truncate">{lead.name}</span>
                  <span className="block truncate text-muted">{lead.company || lead.email}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
