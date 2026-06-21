"use client";

import { useState } from "react";

export interface EngageSuggestionRow {
  id: string;
  channel: string;
  author: string;
  text: string;
  platform: string | null;
  eventKind?: string | null;
  anchorPostId?: string | null;
  channelType?: string | null;
  routedAppId?: string | null;
  convertedReplyId?: string | null;
  priorityScore?: number;
  triageStatus?: string;
  triageReasons?: string[];
  slaBreached?: boolean;
}

interface EngageInboxPanelProps {
  suggestions: EngageSuggestionRow[];
  anchorPostId: string;
  onConvert: (id: string) => void;
  onReplyQueued: (pendingApproval?: boolean) => void;
}

export function EngageInboxPanel({
  suggestions,
  anchorPostId,
  onConvert,
  onReplyQueued,
}: EngageInboxPanelProps) {
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (suggestions.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted">
        No engage suggestions — comments/DMs routed here. Reply flow needs a published anchor post.
      </p>
    );
  }

  const startDraft = async (id: string) => {
    setBusy(true);
    setDraftingId(id);
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "engage_draft_reply", suggestionId: id }),
      });
      const data = (await res.json()) as { draft?: string };
      setReplyDraft(data.draft ?? "");
    } finally {
      setBusy(false);
    }
  };

  const queueAndPublish = async (id: string) => {
    if (!replyDraft.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "engage_enqueue_reply",
          suggestionId: id,
          replyText: replyDraft,
          postId: anchorPostId || undefined,
          autoPublish: true,
        }),
      });
      const data = (await res.json()) as { reply?: { status?: string } };
      setDraftingId(null);
      setReplyDraft("");
      onReplyQueued(data.reply?.status === "pending_approval");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ul className="space-y-2 font-mono text-[10px]">
      {suggestions.map((s) => (
        <li key={s.id} className="border border-line bg-panel p-2">
          <p className="text-muted">
            {s.triageStatus === "priority" ? (
              <span className="mr-1 border border-amber-500/50 px-1 text-amber-400">PRIORITY {s.priorityScore ?? ""}</span>
            ) : null}
            {s.slaBreached ? (
              <span className="mr-1 border border-red-500/40 px-1 text-red-400">SLA</span>
            ) : null}
            {s.eventKind ? (
              <span className="mr-1 border border-cursor-glow/40 px-1 text-cursor-glow">{s.eventKind}</span>
            ) : null}
            {s.channelType ? `${s.channelType} · ` : ""}
            {s.channel} · @{s.author}
            {s.platform ? ` · ${s.platform}` : ""}
            {s.anchorPostId ? ` · anchor ${s.anchorPostId}` : ""}
            {s.convertedReplyId ? ` · replied` : ""}
          </p>
          <p className="mt-1 text-stark line-clamp-2">{s.text}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onConvert(s.id)}
              className="border border-line px-2 py-0.5 text-[9px] uppercase text-muted hover:text-stark"
            >
              → Creator draft
            </button>
            <button
              type="button"
              disabled={busy || Boolean(s.convertedReplyId)}
              onClick={() => void startDraft(s.id)}
              className="border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow disabled:opacity-50"
            >
              Draft reply
            </button>
          </div>
          {draftingId === s.id && (
            <div className="mt-2 space-y-2">
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                rows={2}
                className="w-full border border-line bg-void p-2 text-stark"
              />
              <button
                type="button"
                disabled={busy || !replyDraft.trim()}
                onClick={() => void queueAndPublish(s.id)}
                className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
              >
                Queue reply
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
