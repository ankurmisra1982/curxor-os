"use client";

import { useState } from "react";

export interface ContentTemplateRow {
  id: string;
  name: string;
  tone: string;
  platforms: string[];
  format: string;
  draftSeed: string;
  brandHashtags: string[];
}

interface ContentTemplateStudioPanelProps {
  templates: ContentTemplateRow[];
  selectedPostId: string | null;
  onRefresh: () => void;
  onApply: (postId: string, templateId: string) => void;
  onCreateFromTemplate: (templateId: string) => void;
  busy?: boolean;
}

export function ContentTemplateStudioPanel({
  templates,
  selectedPostId,
  onRefresh,
  onApply,
  onCreateFromTemplate,
  busy,
}: ContentTemplateStudioPanelProps) {
  const [selectedTpl, setSelectedTpl] = useState("");

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap gap-2">
        <select
          value={selectedTpl}
          onChange={(e) => setSelectedTpl(e.target.value)}
          className="border border-line bg-void px-2 py-1 text-stark"
        >
          <option value="">Pick playbook…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.platforms.join(", ")}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selectedPostId || !selectedTpl || busy}
          onClick={() => selectedPostId && selectedTpl && onApply(selectedPostId, selectedTpl)}
          className="border border-line px-2 py-0.5 uppercase hover:border-cursor-glow disabled:opacity-50"
        >
          Apply to selected
        </button>
        <button
          type="button"
          disabled={!selectedTpl || busy}
          onClick={() => selectedTpl && onCreateFromTemplate(selectedTpl)}
          className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
        >
          New post from playbook
        </button>
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted">
          Refresh
        </button>
      </div>
      {selectedTpl ? (
        <div className="border border-line/60 p-2 text-muted">
          {templates.find((t) => t.id === selectedTpl)?.draftSeed}
        </div>
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {templates.map((t) => (
          <li key={t.id} className="border border-line/60 p-2">
            <p className="text-stark">{t.name}</p>
            <p className="text-muted">{t.tone} · {t.format}</p>
            <p className="mt-1 text-muted">{t.draftSeed.slice(0, 100)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
