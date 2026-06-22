"use client";

import { useState } from "react";

import { MINI_SEQUENCE_PRESETS } from "@/lib/work-template-packs-data";

interface WorkMiniSequenceWizardProps {
  leadId: string;
  leadName?: string;
  onCreate: (presetId: string) => Promise<void>;
}

export function WorkMiniSequenceWizard({ leadId, leadName, onCreate }: WorkMiniSequenceWizardProps) {
  const [busy, setBusy] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  if (!leadId) {
    return <p className="font-mono text-[11px] text-muted">Select an inquiry first to create a follow-up sequence.</p>;
  }

  return (
    <div className="space-y-2 font-mono text-xs">
      <p className="text-[10px] text-muted">
        Mini-sequence for {leadName ?? "selected contact"} — 2–3 polite steps, pause on reply.
      </p>
      <div className="flex flex-wrap gap-2">
        {MINI_SEQUENCE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onCreate(preset.id)
                .then(() => setLastCreated(preset.label))
                .finally(() => setBusy(false));
            }}
            className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow"
          >
            {preset.label}
          </button>
        ))}
      </div>
      {lastCreated ? <p className="text-[10px] text-emerald-400">Created: {lastCreated}</p> : null}
    </div>
  );
}
