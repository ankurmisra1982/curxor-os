"use client";

import { useState } from "react";

export interface ExperimentRow {
  id: string;
  kind: string;
  postIds: string[];
  winnerPostId: string | null;
  viewThreshold: number;
  status: string;
  createdAt: string;
}

interface ContentExperimentsPanelProps {
  experiments: ExperimentRow[];
  selectedPostIds: string[];
  onRefresh: () => void;
}

export function ContentExperimentsPanel({
  experiments,
  selectedPostIds,
  onRefresh,
}: ContentExperimentsPanelProps) {
  const [busy, setBusy] = useState(false);

  const create = async (kind: "hook" | "thumbnail" | "caption") => {
    if (selectedPostIds.length < 2) {
      window.alert("Select at least 2 related posts in the queue for an experiment.");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "experiments_list",
          subAction: "create",
          kind,
          postIds: selectedPostIds.slice(0, 4),
        }),
      });
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const evaluate = async () => {
    setBusy(true);
    try {
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "experiments_evaluate" }),
      });
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void create("hook")}
          className="border border-line px-2 py-0.5 uppercase hover:border-cursor-glow disabled:opacity-50"
        >
          New hook experiment
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void create("thumbnail")}
          className="border border-line px-2 py-0.5 uppercase hover:border-cursor-glow disabled:opacity-50"
        >
          New thumb experiment
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void create("caption")}
          className="border border-line px-2 py-0.5 uppercase hover:border-cursor-glow disabled:opacity-50"
        >
          New caption experiment
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void evaluate()}
          className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
        >
          Evaluate winners
        </button>
      </div>

      {experiments.length === 0 ? (
        <p className="text-muted">No experiments — fan out variants then create an experiment on 2+ posts.</p>
      ) : (
        <ul className="space-y-2">
          {experiments.slice(0, 8).map((e) => (
            <li key={e.id} className="border border-line/60 p-2">
              <div className="flex justify-between gap-2">
                <span className="text-stark">{e.kind}</span>
                <span className="text-cursor-glow">{e.status.toUpperCase()}</span>
              </div>
              <p className="mt-1 text-muted">
                {e.postIds.join(", ")} · threshold {e.viewThreshold} views
              </p>
              {e.winnerPostId ? (
                <p className="text-cursor-glow">Winner: {e.winnerPostId}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
