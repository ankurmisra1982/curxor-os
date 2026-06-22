"use client";

import { useState } from "react";

import type { GrowthLevel } from "@/lib/os-growth-level";
import type { MailIndexEntry, WorkTask } from "@/lib/work-queue-types";
import { workTerm } from "@/lib/work-level-copy";
import type { WorkTemplate, WorkTemplatePack } from "@/lib/work-template-packs-data";

interface WorkStartHomePanelProps {
  growthLevel: GrowthLevel;
  mailIndex: MailIndexEntry[];
  tasks: WorkTask[];
  templatePacks: WorkTemplatePack[];
  defaultPackId?: string | null;
  onApplyPack: (packId: string) => Promise<void>;
  onAddOpportunity: () => void;
  onToggleTask: (taskId: string) => void;
  onOpenIntegrations?: () => void;
  showIntegrationsPeek?: boolean;
}

export function WorkStartHomePanel({
  growthLevel,
  mailIndex,
  tasks,
  templatePacks,
  defaultPackId,
  onApplyPack,
  onAddOpportunity,
  onToggleTask,
  onOpenIntegrations,
  showIntegrationsPeek,
}: WorkStartHomePanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkTemplate | null>(null);
  const [packBusy, setPackBusy] = useState(false);

  const waiting = mailIndex.filter((m) => !m.leadId && !m.matchedReply).slice(0, 8);
  const openTasks = tasks.filter((t) => !t.done).slice(0, 6);

  const applyPack = (packId: string) => {
    setPackBusy(true);
    void onApplyPack(packId).finally(() => setPackBusy(false));
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <p className="text-[11px] text-muted">{workTerm(growthLevel, "deskSubtitle")}</p>

      <section>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-cursor-glow">People waiting</h3>
        {waiting.length === 0 ? (
          <p className="text-[11px] text-muted">No unassigned messages — scan inbox or check comms.</p>
        ) : (
          <ul className="space-y-1">
            {waiting.map((m) => (
              <li key={m.id} className="border border-line/60 px-2 py-1">
                <span className="text-stark">{m.from || "Message"}</span>
                <span className="ml-2 text-[10px] text-muted">{m.subject?.slice(0, 48)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-widest text-cursor-glow">Tasks</h3>
          <button
            type="button"
            onClick={onAddOpportunity}
            className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow"
          >
            {workTerm(growthLevel, "addLead")}
          </button>
        </div>
        {openTasks.length === 0 ? (
          <p className="text-[11px] text-muted">No open tasks — add an opportunity or run morning brief.</p>
        ) : (
          <ul className="space-y-1">
            {openTasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onToggleTask(t.id)}
                  className="w-full border border-line px-2 py-1 text-left text-stark hover:border-cursor-glow/50"
                >
                  <span className={t.priority === "P1" ? "text-cursor-glow" : "text-muted"}>{t.priority}</span>
                  <span className="ml-2">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-cursor-glow">Message templates</h3>
        <div className="mb-2 flex flex-wrap gap-2">
          {templatePacks.map((pack) => (
            <button
              key={pack.id}
              type="button"
              disabled={packBusy}
              onClick={() => applyPack(pack.id)}
              className={`border px-2 py-0.5 text-[10px] uppercase ${
                pack.id === defaultPackId ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
              }`}
            >
              {pack.label}
            </button>
          ))}
        </div>
        {selectedTemplate ? (
          <pre className="whitespace-pre-wrap border border-line/60 p-2 text-[10px] text-stark">
            {selectedTemplate.subject}
            {"\n\n"}
            {selectedTemplate.body}
          </pre>
        ) : (
          <p className="text-[11px] text-muted">Tap a pack to load templates — copy into your reply draft.</p>
        )}
        {templatePacks[0]?.templates.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {templatePacks.flatMap((p) =>
              p.templates.map((t) => (
                <button
                  key={`${p.id}-${t.id}`}
                  type="button"
                  onClick={() => setSelectedTemplate(t)}
                  className="border border-line/60 px-2 py-0.5 text-[10px] text-muted hover:text-stark"
                >
                  {t.title}
                </button>
              )),
            )}
          </div>
        ) : null}
      </section>

      {showIntegrationsPeek && onOpenIntegrations ? (
        <button
          type="button"
          onClick={onOpenIntegrations}
          className="text-[10px] uppercase text-muted underline hover:text-stark"
        >
          Advanced: connector vault (L4+)
        </button>
      ) : null}
    </div>
  );
}
