"use client";

import { useState } from "react";

export interface ContentOpsStateRow {
  publishingPaused: boolean;
  pauseReason: string | null;
  pausedAt: string | null;
  pausedBy: string | null;
  lastDigestAt: string | null;
}

interface ContentOpsPanelProps {
  ops: ContentOpsStateRow | null;
  onRefresh: () => void;
}

async function opsAction(subAction: string, extra?: Record<string, unknown>) {
  const res = await fetch("/api/content/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "ops_status", subAction, ...extra }),
  });
  return res.json();
}

export function ContentOpsPanel({ ops, onRefresh }: ContentOpsPanelProps) {
  const [busy, setBusy] = useState(false);
  const [digestMsg, setDigestMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="uppercase tracking-widest text-muted">Publishing</span>
        {ops?.publishingPaused ? (
          <span className="border border-red-500/60 px-1 text-red-400">PAUSED</span>
        ) : (
          <span className="border border-cursor-glow/50 px-1 text-cursor-glow">ACTIVE</span>
        )}
      </div>

      {ops?.publishingPaused ? (
        <p className="text-muted">
          {ops.pauseReason ?? "Paused"} · {ops.pausedBy ?? "operator"}
          {ops.pausedAt ? ` · ${new Date(ops.pausedAt).toLocaleString()}` : ""}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {ops?.publishingPaused ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await opsAction("resume");
              })
            }
            className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
          >
            Resume all
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const reason = window.prompt("Pause reason (optional)") ?? "Crisis pause";
                await opsAction("pause", { reason });
              })
            }
            className="border border-red-500/50 px-2 py-0.5 uppercase text-red-400 disabled:opacity-50"
          >
            Crisis pause
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const res = await fetch("/api/content/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "ops_digest", force: true }),
              });
              const data = (await res.json()) as { sent?: boolean; text?: string };
              setDigestMsg(data.sent ? "Digest sent to operator chats." : "Digest generated (no chat IDs).");
            })
          }
          className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-50"
        >
          Send digest now
        </button>
      </div>

      {digestMsg ? <p className="text-cursor-glow">{digestMsg}</p> : null}
      {ops?.lastDigestAt ? (
        <p className="text-muted">Last digest: {new Date(ops.lastDigestAt).toLocaleString()}</p>
      ) : null}

      <p className="text-muted">
        Telegram/Slack: /pause · /resume · /approvals
      </p>
    </div>
  );
}
