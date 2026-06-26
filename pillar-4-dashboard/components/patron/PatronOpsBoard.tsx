"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  patronOpsColumnLabel,
  PATRON_OPS_COLUMN_ORDER,
  type PatronOpsColumn,
  type PatronOpsItem,
} from "@/lib/patron-ops-board-types";

interface PatronOpsBoardProps {
  className?: string;
}

interface OpsBoardPayload {
  ok?: boolean;
  columns?: Record<PatronOpsColumn, PatronOpsItem[]>;
  topActions?: PatronOpsItem[];
  stats?: {
    pendingApprovals: number;
    channelSessions: number;
    engagePending: number;
  };
}

const COLUMN_ORDER = PATRON_OPS_COLUMN_ORDER;

export function PatronOpsBoard({ className = "" }: PatronOpsBoardProps) {
  const [data, setData] = useState<OpsBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/patron/ops-board", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as OpsBoardPayload;
      setData(json);
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

  if (loading) {
    return (
      <div className={`border border-line bg-void p-4 ${className}`}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Loading ops board…</p>
      </div>
    );
  }

  const columns = data?.columns;
  const topActions = data?.topActions ?? [];

  return (
    <section className={`flex min-h-0 flex-col border border-line bg-void ${className}`}>
      <header className="border-b border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">COS0</p>
        <h2 className="font-sans text-sm font-semibold text-stark">Patron ops board</h2>
        <p className="mt-1 font-sans text-xs text-muted">
          Approvals · channels · engage — stub for MA-COS triage (CH3 adds confirm cards).
        </p>
        {data?.stats ? (
          <p className="mt-2 font-mono text-[9px] text-muted">
            {data.stats.pendingApprovals} pending · {data.stats.channelSessions} sessions ·{" "}
            {data.stats.engagePending} engage
          </p>
        ) : null}
      </header>

      {topActions.length > 0 ? (
        <div className="border-b border-line px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Top actions</p>
          <ul className="mt-2 space-y-2">
            {topActions.map((item) => (
              <OpsBoardCard key={item.id} item={item} compact />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMN_ORDER.map((column) => (
          <div key={column} className="flex min-h-[140px] flex-col border border-line bg-panel">
            <div className="border-b border-line px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-widest text-cursor-glow">
                {patronOpsColumnLabel(column)}
              </p>
            </div>
            <ul className="flex-1 space-y-2 overflow-y-auto p-2">
              {(columns?.[column] ?? []).map((item) => (
                <li key={item.id}>
                  <OpsBoardCard item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function OpsBoardCard({ item, compact = false }: { item: PatronOpsItem; compact?: boolean }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-sans text-stark ${compact ? "text-xs" : "text-sm"}`}>{item.title}</p>
        {item.clawShort ? (
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">
            {item.clawShort}
          </span>
        ) : null}
      </div>
      {!compact ? <p className="mt-1 font-sans text-xs text-muted">{item.detail}</p> : null}
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="block border border-line bg-surface px-3 py-2 transition hover:border-cursor-glow"
      >
        {body}
      </Link>
    );
  }

  return <div className="border border-line bg-surface px-3 py-2">{body}</div>;
}
