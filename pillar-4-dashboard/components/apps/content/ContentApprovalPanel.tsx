"use client";

import { useState } from "react";

import type { ContentPost } from "@/lib/content-queue-types";
import type { ContentReply } from "@/lib/content-replies-store";

export interface ContentAuditEntryRow {
  id: string;
  at: string;
  action: string;
  targetType: string;
  targetId: string;
  actor: string;
  detail: string;
}

interface ContentApprovalPanelProps {
  posts: ContentPost[];
  replies: ContentReply[];
  auditEntries: ContentAuditEntryRow[];
  requirePublishApproval: boolean;
  requireReplyApproval: boolean;
  approvalTelegram?: {
    configured: boolean;
    notifyEnabled: boolean;
    chatIdCount: number;
  };
  onRefresh: () => void;
}

async function postAction(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/content/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json() as Promise<{ ok?: boolean; error?: string }>;
}

export function ContentApprovalPanel({
  posts,
  replies,
  auditEntries,
  requirePublishApproval,
  requireReplyApproval,
  approvalTelegram,
  onRefresh,
}: ContentApprovalPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const gateOn = requirePublishApproval || requireReplyApproval;
  const empty = posts.length === 0 && replies.length === 0;

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center gap-2 text-muted">
        <span className="uppercase tracking-widest">Approval gate</span>
        {gateOn ? (
          <>
            {requirePublishApproval ? (
              <span className="border border-cursor-glow/50 px-1 text-cursor-glow">posts</span>
            ) : null}
            {requireReplyApproval ? (
              <span className="border border-cursor-glow/50 px-1 text-cursor-glow">replies</span>
            ) : null}
          </>
        ) : (
          <span className="text-stark">Off — enable in FRE or env</span>
        )}
        {gateOn && approvalTelegram ? (
          <span className="text-muted">
            · Telegram{" "}
            {approvalTelegram.configured ? (
              approvalTelegram.notifyEnabled ? (
                <span className="text-cursor-glow">notify on ({approvalTelegram.chatIdCount} chat(s))</span>
              ) : (
                <span className="text-stark">configured · notify off</span>
              )
            ) : (
              <span className="text-stark">not configured</span>
            )}
          </span>
        ) : null}
      </div>

      {gateOn && approvalTelegram?.configured ? (
        <p className="text-muted">
          Operators: /approvals · /approve POST-001 · /reject POST-001 · /approve reply &lt;id&gt;
        </p>
      ) : null}

      {empty ? (
        <p className="text-muted">No items awaiting approval.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {posts.length > 0 ? (
            <div className="border border-line bg-panel p-3">
              <p className="mb-2 uppercase tracking-widest text-muted">Posts ({posts.length})</p>
              <ul className="space-y-2">
                {posts.map((p) => (
                  <li key={p.id} className="border border-line/60 p-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-stark">{p.platform}</span>
                      <span className="text-cursor-glow">PENDING</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-muted">{p.draftText.slice(0, 140)}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() =>
                          void run(p.id, async () => {
                            await postAction("approve_post", { postId: p.id });
                          })
                        }
                        className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() =>
                          void run(p.id, async () => {
                            const note = window.prompt("Reject reason (optional)") ?? undefined;
                            await postAction("reject_post", { postId: p.id, note });
                          })
                        }
                        className="border border-line px-2 py-0.5 uppercase text-muted hover:text-red-400 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {replies.length > 0 ? (
            <div className="border border-line bg-panel p-3">
              <p className="mb-2 uppercase tracking-widest text-muted">Replies ({replies.length})</p>
              <ul className="space-y-2">
                {replies.map((r) => (
                  <li key={r.id} className="border border-line/60 p-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-stark">{r.platform}</span>
                      <span className="text-cursor-glow">PENDING</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-muted">{r.replyText.slice(0, 140)}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() =>
                          void run(r.id, async () => {
                            await postAction("approve_reply", { replyId: r.id });
                          })
                        }
                        className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() =>
                          void run(r.id, async () => {
                            const note = window.prompt("Reject reason (optional)") ?? undefined;
                            await postAction("reject_reply", { replyId: r.id, note });
                          })
                        }
                        className="border border-line px-2 py-0.5 uppercase text-muted hover:text-red-400 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {auditEntries.length > 0 ? (
        <div className="border border-line bg-panel p-3">
          <p className="mb-2 uppercase tracking-widest text-muted">Audit trail</p>
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {auditEntries.slice(0, 12).map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-2 text-muted">
                <span className="text-stark">{e.action}</span>
                <span>{e.targetType}:{e.targetId.slice(0, 8)}</span>
                <span className="truncate">{e.detail}</span>
                <span className="opacity-60">{new Date(e.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
