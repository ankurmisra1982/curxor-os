"use client";

import { useMemo, useState } from "react";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { countMailBySplit, filterMailBySplit, type InboxSplit } from "@/lib/work-inbox-splits";
import type { MailIndexEntry, WorkTask } from "@/lib/work-queue-types";
import { workTerm } from "@/lib/work-level-copy";
import type { WorkTemplate, WorkTemplatePack } from "@/lib/work-template-packs-data";

interface WorkStartHomePanelProps {
  growthLevel: GrowthLevel;
  mailIndex: MailIndexEntry[];
  tasks: WorkTask[];
  templatePacks: WorkTemplatePack[];
  defaultPackId?: string | null;
  focusMailId?: string | null;
  onApplyPack: (packId: string) => Promise<void>;
  onAddOpportunity: () => void;
  onToggleTask: (taskId: string) => void;
  onOpenIntegrations?: () => void;
  showIntegrationsPeek?: boolean;
  onSelectWaitingMail?: (mailId: string) => void;
  onDraftReply?: (mailId: string) => void;
  onUseTemplateInDraft?: (template: WorkTemplate) => void;
}

export function WorkStartHomePanel({
  growthLevel,
  mailIndex,
  tasks,
  templatePacks,
  defaultPackId,
  focusMailId,
  onApplyPack,
  onAddOpportunity,
  onToggleTask,
  onOpenIntegrations,
  showIntegrationsPeek,
  onSelectWaitingMail,
  onDraftReply,
  onUseTemplateInDraft,
}: WorkStartHomePanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkTemplate | null>(null);
  const [packBusy, setPackBusy] = useState(false);
  const [inboxStrip, setInboxStrip] = useState<InboxSplit>("waiting");
  const [copied, setCopied] = useState(false);

  const stripCounts = useMemo(() => countMailBySplit(mailIndex, tasks), [mailIndex, tasks]);
  const waitingRows = useMemo(
    () => filterMailBySplit(mailIndex, tasks, inboxStrip).slice(0, 8),
    [inboxStrip, mailIndex, tasks],
  );

  const openTasks = tasks.filter((t) => !t.done).slice(0, 6);

  const applyPack = (packId: string) => {
    setPackBusy(true);
    void onApplyPack(packId).finally(() => setPackBusy(false));
  };

  const copyTemplate = async (template: WorkTemplate) => {
    const text = `${template.subject}\n\n${template.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <p className="text-[11px] text-muted">{workTerm(growthLevel, "deskSubtitle")}</p>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[10px] uppercase tracking-widest text-cursor-glow">Inbox strips</h3>
          <div className="flex gap-1">
            {(["waiting", "snoozed", "done"] as const).map((strip) => (
              <button
                key={strip}
                type="button"
                onClick={() => setInboxStrip(strip)}
                className={`border px-1.5 py-0.5 text-[9px] uppercase ${
                  inboxStrip === strip ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
                }`}
              >
                {strip} ({stripCounts[strip]})
              </button>
            ))}
          </div>
        </div>
        {waitingRows.length === 0 ? (
          <p className="text-[11px] text-muted">No messages in {inboxStrip} — scan inbox or check comms.</p>
        ) : (
          <ul className="space-y-1">
            {waitingRows.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelectWaitingMail?.(m.id)}
                  className={`w-full border px-2 py-1 text-left hover:border-cursor-glow/50 ${
                    focusMailId === m.id ? "border-cursor-glow bg-surface" : "border-line/60"
                  }`}
                >
                  <span className="text-stark">{m.from || "Message"}</span>
                  <span className="ml-2 text-[10px] text-muted">{m.subject?.slice(0, 48)}</span>
                  {m.snoozedUntil ? (
                    <span className="ml-2 text-[9px] text-amber-400">snoozed</span>
                  ) : m.doneAt || m.archivedAt ? (
                    <span className="ml-2 text-[9px] text-muted">done</span>
                  ) : null}
                </button>
                {focusMailId === m.id && inboxStrip === "waiting" ? (
                  <div className="mt-1 flex flex-wrap gap-1 pl-1">
                    <button
                      type="button"
                      onClick={() => onDraftReply?.(m.id)}
                      className="border border-cursor-glow/60 px-1.5 py-0.5 text-[9px] uppercase text-cursor-glow"
                    >
                      Draft reply
                    </button>
                  </div>
                ) : null}
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
          <div className="space-y-2">
            <pre className="whitespace-pre-wrap border border-line/60 p-2 text-[10px] text-stark">
              {selectedTemplate.subject}
              {"\n\n"}
              {selectedTemplate.body}
            </pre>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyTemplate(selectedTemplate)}
                className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted hover:text-stark"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => onUseTemplateInDraft?.(selectedTemplate)}
                className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow"
              >
                Use in draft
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted">Tap a template below — copy or wire into a reply draft.</p>
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
