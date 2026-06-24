"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { BuildDelegationAccessTier } from "@/lib/build-delegation-policy";

type DelegationStatus = "pending" | "approved" | "rejected" | "completed";

interface DelegationItem {
  id: string;
  title: string;
  detail: string;
  source: "master_ai" | "user" | "webhook";
  status: DelegationStatus;
  appId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface DelegationReport {
  ok: boolean;
  policy: {
    accessTier: BuildDelegationAccessTier;
    ascensionTier: string;
    enabled: boolean;
    allowDelegation: boolean;
    canSuggest: boolean;
    canEnqueue: boolean;
    canResolve: boolean;
    canComplete: boolean;
    gateReason: string | null;
  };
  ascensionTitle: string | null;
  items: DelegationItem[];
  pendingCount: number;
}

interface BuildPlaneDelegationQueueProps {
  enabled: boolean;
  allowDelegation: boolean;
}

function statusClass(status: DelegationStatus): string {
  if (status === "approved" || status === "completed") return "text-cursor-glow";
  if (status === "rejected") return "text-amber-300";
  return "text-stark";
}

export function BuildPlaneDelegationQueue({ enabled, allowDelegation }: BuildPlaneDelegationQueueProps) {
  const [report, setReport] = useState<DelegationReport | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [detailDraft, setDetailDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/build/delegation", { cache: "no-store" });
    if (!res.ok) return;
    setReport((await res.json()) as DelegationReport);
  }, []);

  useEffect(() => {
    void load();
  }, [load, enabled, allowDelegation]);

  const postAction = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const res = await fetch("/api/build/delegation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as DelegationReport & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        setReport(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading delegation queue…</p>;
  }

  const { policy } = report;
  const locked = Boolean(policy.gateReason);

  return (
    <div className="space-y-3 border border-line/60 bg-void/30 px-3 py-2 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="uppercase tracking-widest text-cursor-glow">Master AI delegation (BP4)</p>
        <span className="text-muted">
          {report.pendingCount} pending · {policy.accessTier}
          {report.ascensionTitle ? ` · ${report.ascensionTitle}` : ""}
        </span>
      </div>

      <p className="text-muted">
        G5 suggests build tasks from the patron brief — you confirm before Cursor executes. G6 Infinity unlocks
        direct enqueue and full audit resolve. Master AI orchestrates; Cursor Bridge executes when approved.
      </p>

      {locked ? (
        <p className="border border-amber-500/30 bg-amber-950/20 px-2 py-1.5 text-amber-200">{policy.gateReason}</p>
      ) : null}

      {!locked && policy.canSuggest ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void postAction({ action: "suggest_demo" }).then((d) => {
                if (d) setMessage("Master AI suggestion queued — review and approve below.");
              })
            }
            className="border border-cursor-glow px-2 py-1 uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Suggest from brief (demo)
          </button>
          <Link
            href="/claw-cafe"
            className="border border-line px-2 py-1 uppercase tracking-widest text-muted hover:text-stark"
          >
            Open Cafe chamber
          </Link>
        </div>
      ) : null}

      {!locked && policy.canEnqueue ? (
        <div className="space-y-2 border border-line/40 bg-panel/20 px-2 py-2">
          <p className="uppercase tracking-widest text-muted">Enqueue build task (G6)</p>
          <label className="block font-sans text-xs text-muted">
            Title
            <input
              value={titleDraft}
              disabled={busy}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="Refactor Capital desk health alerts"
              className="mt-1 w-full border border-line bg-void px-2 py-1 font-mono text-[11px] text-stark"
            />
          </label>
          <label className="block font-sans text-xs text-muted">
            Detail (optional)
            <textarea
              value={detailDraft}
              disabled={busy}
              onChange={(e) => setDetailDraft(e.target.value)}
              rows={2}
              className="mt-1 w-full border border-line bg-void px-2 py-1 font-mono text-[11px] text-stark"
            />
          </label>
          <button
            type="button"
            disabled={busy || !titleDraft.trim()}
            onClick={() =>
              void postAction({
                action: "enqueue",
                title: titleDraft.trim(),
                detail: detailDraft.trim(),
              }).then((d) => {
                if (d) {
                  setTitleDraft("");
                  setDetailDraft("");
                  setMessage("Task enqueued.");
                }
              })
            }
            className="border border-line px-2 py-1 uppercase tracking-widest text-muted hover:text-stark disabled:opacity-40"
          >
            Enqueue
          </button>
        </div>
      ) : null}

      {report.items.length === 0 ? (
        <p className="text-muted">No delegation items yet.</p>
      ) : (
        <ul className="space-y-2">
          {[...report.items].reverse().map((item) => (
            <li key={item.id} className="border border-line/40 bg-panel/20 px-2 py-1.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-stark">
                    <span className={statusClass(item.status)}>{item.status}</span>
                    {" · "}
                    {item.source} · {item.id}
                  </p>
                  <p className="mt-0.5 font-sans text-xs text-stark">{item.title}</p>
                  {item.detail ? <p className="mt-1 whitespace-pre-wrap text-muted">{item.detail}</p> : null}
                  <p className="mt-1 text-muted">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                {item.status === "pending" && !locked && policy.canResolve ? (
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void postAction({
                          action: "resolve",
                          delegationId: item.id,
                          status: "approved",
                        }).then((d) => d && setMessage(`Approved ${item.id}`))
                      }
                      className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void postAction({
                          action: "resolve",
                          delegationId: item.id,
                          status: "rejected",
                        }).then((d) => d && setMessage(`Rejected ${item.id}`))
                      }
                      className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
                {item.status === "approved" && !locked && policy.canComplete ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void postAction({
                        action: "resolve",
                        delegationId: item.id,
                        status: "completed",
                      }).then((d) => d && setMessage(`Completed ${item.id}`))
                    }
                    className="shrink-0 border border-line px-2 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-40"
                  >
                    Mark done
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-red-300">{error}</p> : null}
      {message ? <p className="text-cursor-glow">{message}</p> : null}
    </div>
  );
}
