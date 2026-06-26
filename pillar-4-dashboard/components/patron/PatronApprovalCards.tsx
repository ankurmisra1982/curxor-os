"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { OsApprovalItem, OsApprovalKind } from "@/lib/os-approval-inbox-types";
import { getOotbApp } from "@/lib/ootb-apps";

const KIND_LABEL: Record<OsApprovalKind, string> = {
  trade: "Trade",
  send: "Send",
  post: "Post",
  reply: "Reply",
};

interface PatronApprovalCardsProps {
  compact?: boolean;
}

export function PatronApprovalCards({ compact = false }: PatronApprovalCardsProps) {
  const [items, setItems] = useState<OsApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/patron/approvals", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: OsApprovalItem[]; total?: number };
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onRefresh() {
      void load();
    }
    window.addEventListener("curxor:patron-approvals-changed", onRefresh);
    return () => window.removeEventListener("curxor:patron-approvals-changed", onRefresh);
  }, [load]);

  const resolve = useCallback(
    async (item: OsApprovalItem, action: "approve" | "reject") => {
      const key = `${item.kind}:${item.id}`;
      setBusyKey(key);
      setFlash(null);
      try {
        const res = await fetch("/api/patron/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appId: item.appId,
            kind: item.kind,
            id: item.id,
            action,
            note: action === "reject" ? "Rejected via Patron Ask" : undefined,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          label?: string;
          inbox?: { items?: OsApprovalItem[]; total?: number };
        };
        if (!res.ok || !data.ok) {
          setFlash(data.error ?? "Approval failed");
          return;
        }
        setFlash(data.label ?? (action === "approve" ? "Approved" : "Rejected"));
        if (data.inbox) {
          setItems(Array.isArray(data.inbox.items) ? data.inbox.items : []);
          setTotal(typeof data.inbox.total === "number" ? data.inbox.total : 0);
        } else {
          await load();
        }
        window.dispatchEvent(new Event("curxor:patron-approvals-changed"));
      } catch {
        setFlash("Patron approval unreachable");
      } finally {
        setBusyKey(null);
      }
    },
    [load],
  );

  if (loading) return null;
  if (total === 0) return null;

  const visible = compact ? items.slice(0, 2) : items.slice(0, 6);

  return (
    <div className="border-b border-line bg-panel/80 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-widest text-cursor-glow">
          Confirm · {total} pending
        </p>
        {total > visible.length ? (
          <span className="font-mono text-[9px] text-muted">+{total - visible.length} more in ops board</span>
        ) : null}
      </div>
      {flash ? <p className="mb-2 font-mono text-[10px] text-muted">{flash}</p> : null}
      <ul className={`space-y-2 ${compact ? "max-h-40 overflow-y-auto" : ""}`}>
        {visible.map((item) => {
          const clawShort = getOotbApp(item.appId).short;
          const busy = busyKey === `${item.kind}:${item.id}`;
          return (
            <li
              key={`${item.kind}:${item.id}`}
              className="border border-[#bc13fe]/30 border-l-2 border-l-[#bc13fe] bg-surface px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
                    {KIND_LABEL[item.kind]} · {clawShort}
                  </p>
                  <p className="font-sans text-sm font-medium text-stark">{item.label}</p>
                  <p className="mt-0.5 line-clamp-2 font-sans text-xs text-muted">{item.detail}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void resolve(item, "approve")}
                  className="border border-cursor-glow px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void resolve(item, "reject")}
                  className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted hover:border-amber-400/60 hover:text-amber-400/80 disabled:opacity-40"
                >
                  Reject
                </button>
                <Link
                  href={item.href}
                  className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted transition hover:border-cursor-glow hover:text-cursor-glow"
                >
                  Open desk
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 font-mono text-[9px] text-muted">
        Patron proposes — you confirm. Mutations never run without your tap.
      </p>
    </div>
  );
}
