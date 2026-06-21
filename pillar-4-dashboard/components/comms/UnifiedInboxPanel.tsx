"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface InboxSession {
  id: string;
  channel: string;
  channelLabel: string;
  appId: string;
  clawName: string;
  profileId: string | null;
  profileName: string | null;
  lastPreview: string | null;
  updatedAt: string;
  href: string;
}

interface InboxResponse {
  ok: boolean;
  enabled: boolean;
  stats: { total: number; external: number; webchat: number };
  sessions: InboxSession[];
}

interface UnifiedInboxPanelProps {
  /** Compact mode for Home — fewer rows, no mesh footer */
  compact?: boolean;
  title?: string;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function UnifiedInboxPanel({ compact = false, title = "Unified inbox" }: UnifiedInboxPanelProps) {
  const [data, setData] = useState<InboxResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/channels/inbox", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load inbox");
      setData((await res.json()) as InboxResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), compact ? 60_000 : 30_000);
    return () => clearInterval(timer);
  }, [load, compact]);

  const limit = compact ? 5 : 12;
  const sessions = data?.sessions.slice(0, limit) ?? [];

  return (
    <section className="border border-line bg-panel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-sans text-sm font-medium text-stark">{title}</h2>
          <p className="mt-0.5 font-sans text-xs text-muted">
            Telegram, Slack, WhatsApp, iMessage, and dashboard chat — synced to Claw Context Protocol
          </p>
        </div>
        {data ? (
          <p className="font-mono text-[10px] text-muted">
            {data.stats.external} external · {data.stats.webchat} dashboard
          </p>
        ) : null}
      </header>

      {error ? <p className="px-4 py-3 font-sans text-xs text-red-400">{error}</p> : null}

      {!error && sessions.length === 0 ? (
        <p className="px-4 py-6 font-sans text-sm text-muted">
          No conversations yet. Message a Claw from the dashboard or link a channel in Settings → Agent runtime.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={s.href}
                className="flex flex-wrap items-start gap-3 px-4 py-3 transition hover:bg-void"
              >
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-cursor-glow">
                  {s.channelLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-sm font-medium text-stark">{s.clawName}</span>
                    {s.profileName ? (
                      <span className="font-sans text-xs text-muted">· {s.profileName}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate font-sans text-xs text-muted">
                    {s.lastPreview ?? "No preview"}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted">{formatRelative(s.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!compact ? (
        <footer className="border-t border-line px-4 py-2">
          <Link href="/my-work" className="font-sans text-xs text-cursor-glow hover:underline">
            Open Outreach Claw for full comms desk →
          </Link>
        </footer>
      ) : null}
    </section>
  );
}
