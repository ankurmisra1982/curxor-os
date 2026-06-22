"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { meetsGrowthLevel } from "@/lib/os-growth-level";
import type { LeadStage, WorkLead } from "@/lib/work-queue-types";

type LeadSyncBadge = "synced" | "conflict" | "local_only";
import { workTerm } from "@/lib/work-level-copy";

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
  growthLevel: GrowthLevel;
  onSelect: (id: string) => void;
  onStageChange: (leadId: string, stage: LeadStage) => void;
  onAddLead: () => void;
  onEnrich?: (leadId: string) => void;
  onBookMeeting?: (leadId: string) => void;
  syncBadgeForLead?: (leadId: string) => LeadSyncBadge | undefined;
}

function badgeLabel(badge: LeadSyncBadge): string {
  if (badge === "synced") return "synced";
  if (badge === "conflict") return "conflict";
  return "local";
}

function badgeClass(badge: LeadSyncBadge): string {
  if (badge === "synced") return "text-cursor-glow";
  if (badge === "conflict") return "text-amber-400";
  return "text-muted";
}

export function WorkPipelinePanel({
  leads,
  selectedLeadId,
  growthLevel,
  onSelect,
  onStageChange,
  onAddLead,
  onEnrich,
  onBookMeeting,
  syncBadgeForLead,
}: WorkPipelinePanelProps) {
  const singular = workTerm(growthLevel, "lead").toLowerCase();
  const plural = workTerm(growthLevel, "leadPlural").toLowerCase();
  const showQuickActions = meetsGrowthLevel(growthLevel, "L2") && (onEnrich || onBookMeeting);

  return (
    <div className="space-y-2 font-mono text-xs">
      <div className="flex justify-end">
        <button type="button" onClick={onAddLead} className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow">
          {workTerm(growthLevel, "addLead")}
        </button>
      </div>
      {leads.length === 0 ? (
        <p className="text-[11px] text-muted">
          No {plural} yet — add one or ask Outreach Claw to draft a {workTerm(growthLevel, "sequence").toLowerCase()}.
        </p>
      ) : (
        leads.map((lead) => (
          <div
            key={lead.id}
            className={`border px-3 py-2 ${
              selectedLeadId === lead.id ? "border-cursor-glow bg-surface" : "border-line bg-panel"
            }`}
          >
            <button type="button" onClick={() => onSelect(lead.id)} className="grid w-full grid-cols-[1fr_auto] gap-2 text-left">
              <div>
                <p className="text-stark">{lead.name}</p>
                <p className="text-[10px] text-muted">
                  {lead.company || lead.email} · {lead.title || "—"}
                  {syncBadgeForLead ? (
                    <span className={`ml-2 uppercase ${badgeClass(syncBadgeForLead(lead.id) ?? "local_only")}`}>
                      {badgeLabel(syncBadgeForLead(lead.id) ?? "local_only")}
                    </span>
                  ) : null}
                </p>
              </div>
              <select
                value={lead.stage}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onStageChange(lead.id, e.target.value as LeadStage)}
                className={`border border-line bg-panel px-1 py-0.5 text-[10px] uppercase ${stageClass(lead.stage)}`}
                aria-label={`${singular} stage`}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </button>
            {showQuickActions && selectedLeadId === lead.id ? (
              <div className="mt-2 flex flex-wrap gap-1 border-t border-line/40 pt-2">
                {onEnrich ? (
                  <button
                    type="button"
                    onClick={() => onEnrich(lead.id)}
                    className="border border-line px-1.5 py-0.5 text-[9px] uppercase text-muted hover:text-stark"
                  >
                    Enrich
                  </button>
                ) : null}
                {onBookMeeting ? (
                  <button
                    type="button"
                    onClick={() => onBookMeeting(lead.id)}
                    className="border border-cursor-glow/50 px-1.5 py-0.5 text-[9px] uppercase text-cursor-glow"
                  >
                    Book meeting
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
