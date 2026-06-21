"use client";

import type { WorkSequence } from "@/lib/work-queue-types";

function statusClass(status: WorkSequence["status"]): string {
  if (status === "active") return "text-cursor-glow";
  if (status === "replied") return "text-emerald-400";
  if (status === "paused") return "text-amber-400";
  if (status === "completed") return "text-muted";
  return "text-stark";
}

interface WorkSequencePanelProps {
  sequences: WorkSequence[];
  selectedSequenceId: string;
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
  onPause: (id: string) => void;
  onMarkReplied: (id: string) => void;
  onDraft: () => void;
}

export function WorkSequencePanel({
  sequences,
  selectedSequenceId,
  onSelect,
  onActivate,
  onPause,
  onMarkReplied,
  onDraft,
}: WorkSequencePanelProps) {
  const selected = sequences.find((s) => s.id === selectedSequenceId);

  return (
    <div className="space-y-2 font-mono text-xs">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onDraft} className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow">
          Draft sequence
        </button>
      </div>
      {sequences.length === 0 ? (
        <p className="text-[11px] text-muted">No sequences — draft one with the agent or tap Draft sequence.</p>
      ) : (
        sequences.map((seq) => (
          <button
            key={seq.id}
            type="button"
            onClick={() => onSelect(seq.id)}
            className={`grid w-full grid-cols-[1fr_auto] gap-2 border px-3 py-2 text-left ${
              selectedSequenceId === seq.id ? "border-cursor-glow bg-surface" : "border-line bg-panel"
            }`}
          >
            <div>
              <p className="text-stark">{seq.name}</p>
              <p className="text-[10px] text-muted">
                Step {seq.currentStepIndex + 1}/{seq.steps.length} · pause on reply
              </p>
            </div>
            <span className={`text-[10px] uppercase ${statusClass(seq.status)}`}>{seq.status}</span>
          </button>
        ))
      )}
      {selected ? (
        <div className="border border-line/60 p-2 space-y-2">
          <p className="text-[10px] uppercase text-muted">Steps</p>
          {selected.steps.map((step, i) => (
            <div key={step.id} className="border-l-2 border-line pl-2 text-[10px]">
              <p className={i === selected.currentStepIndex ? "text-cursor-glow" : "text-stark"}>
                {step.kind === "email" ? step.subject || "(no subject)" : step.kind}
              </p>
              <p className="text-muted">
                {step.sentAt ? `Sent ${new Date(step.sentAt).toLocaleString()}` : step.scheduledAt ? `Scheduled ${new Date(step.scheduledAt).toLocaleString()}` : "Pending"}
              </p>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {selected.status === "draft" ? (
              <button type="button" onClick={() => onActivate(selected.id)} className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow">
                Activate
              </button>
            ) : null}
            {selected.status === "active" ? (
              <>
                <button type="button" onClick={() => onPause(selected.id)} className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted">
                  Pause
                </button>
                <button type="button" onClick={() => onMarkReplied(selected.id)} className="border border-line px-2 py-0.5 text-[10px] uppercase text-emerald-400">
                  Mark replied
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
