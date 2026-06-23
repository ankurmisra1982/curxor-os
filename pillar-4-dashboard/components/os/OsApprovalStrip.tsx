"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface OsApprovalItem {
  id: string;
  appId: "my-capital" | "my-work" | "my-content-creator";
  kind: "trade" | "send" | "post" | "reply";
  label: string;
  detail: string;
  href: string;
  at: string;
}

interface OsApprovalResponse {
  ok: boolean;
  total: number;
  counts: { capital: number; work: number; creator: number };
  items: OsApprovalItem[];
}

const APP_LABEL: Record<OsApprovalItem["appId"], string> = {
  "my-capital": "Capital",
  "my-work": "Work",
  "my-content-creator": "Creator",
};

const KIND_LABEL: Record<OsApprovalItem["kind"], string> = {
  trade: "trade",
  send: "send",
  post: "post",
  reply: "reply",
};

interface OsApprovalStripProps {
  /** Compact row for Cafe ascension; full card on Home */
  variant?: "home" | "cafe";
  className?: string;
}

export function OsApprovalStrip({ variant = "home", className = "" }: OsApprovalStripProps) {
  const [data, setData] = useState<OsApprovalResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/os/approvals", { cache: "no-store" });
      if (!res.ok) return;
      setData((await res.json()) as OsApprovalResponse);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (!data || data.total === 0) return null;

  const summary = [
    data.counts.capital > 0 ? `${data.counts.capital} trade${data.counts.capital === 1 ? "" : "s"}` : null,
    data.counts.work > 0 ? `${data.counts.work} send${data.counts.work === 1 ? "" : "s"}` : null,
    data.counts.creator > 0 ? `${data.counts.creator} publish${data.counts.creator === 1 ? "" : "es"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (variant === "cafe") {
    return (
      <div className={`border border-amber-500/40 bg-amber-500/5 px-3 py-2 font-mono text-[10px] ${className}`}>
        <p className="uppercase tracking-widest text-amber-400">Needs your OK · {summary}</p>
        <ul className="mt-2 space-y-1 text-stark">
          {data.items.slice(0, 4).map((item) => (
            <li key={`${item.appId}-${item.id}`}>
              <Link href={item.href} className="hover:text-cursor-glow">
                {APP_LABEL[item.appId]} {KIND_LABEL[item.kind]} — {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/home" className="mt-2 inline-block text-muted hover:text-cursor-glow">
          Open home inbox →
        </Link>
      </div>
    );
  }

  return (
    <section className={`border border-amber-500/40 bg-panel ${className}`}>
      <header className="border-b border-line px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">Needs your OK</p>
        <p className="mt-1 font-sans text-sm text-stark">{summary}</p>
        <p className="mt-1 font-sans text-xs text-muted">
          Trades, outbound sends, and publishes waiting on sovereign approval — one tap from Telegram or each desk.
        </p>
      </header>
      <ul className="divide-y divide-line">
        {data.items.map((item) => (
          <li key={`${item.appId}-${item.id}`}>
            <Link
              href={item.href}
              className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 transition hover:bg-void"
            >
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-cursor-glow">
                  {APP_LABEL[item.appId]} · {KIND_LABEL[item.kind]}
                </p>
                <p className="mt-1 font-sans text-sm text-stark">{item.label}</p>
                <p className="mt-0.5 truncate font-sans text-xs text-muted">{item.detail}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted">{item.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
