"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Summary {
  health?: "green" | "amber" | "red";
  healthDetail?: string;
  pendingApprovals?: number;
  inferenceAvailable?: boolean;
  briefLines?: string[];
  clawActivity?: Array<{ short: string; label: string; count: number }>;
}

function healthClass(health: Summary["health"]): string {
  if (health === "red") return "text-red-400";
  if (health === "amber") return "text-amber-400";
  return "text-emerald-400";
}

export function MobilePatronHomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/mobile/summary", { cache: "no-store" });
      if (!res.ok) return;
      setSummary((await res.json()) as Summary);
    })();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <section className="border border-line bg-panel p-4">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Appliance</p>
        <p className={`mt-1 font-sans text-sm font-medium ${healthClass(summary?.health)}`}>
          {summary?.healthDetail ?? "Checking health…"}
        </p>
        {summary?.pendingApprovals ? (
          <p className="mt-2 font-mono text-[10px] text-cursor-glow">
            {summary.pendingApprovals} pending confirm
          </p>
        ) : null}
      </section>

      <section className="border border-line bg-surface p-4">
        <p className="font-mono text-[9px] uppercase tracking-widest text-cursor-glow">Patron brief</p>
        <ul className="mt-2 space-y-1 font-sans text-sm text-stark">
          {(summary?.briefLines ?? ["Loading brief…"]).map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      </section>

      {summary?.clawActivity?.length ? (
        <section className="border border-line bg-surface p-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">This week</p>
          <ul className="mt-2 space-y-1 font-mono text-[10px] text-muted">
            {summary.clawActivity.map((c) => (
              <li key={c.short}>
                {c.short} · {c.label} — {c.count} events
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link
        href="/m/ask"
        className="block border border-cursor-glow px-4 py-3 text-center font-sans text-sm text-cursor-glow"
      >
        Open Ask
      </Link>
    </div>
  );
}
