"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { PatronWeeklyBundle } from "@/lib/patron-weekly-bundle-types";

export function PatronWeeklyBundlePanel({ className = "" }: { className?: string }) {
  const [bundle, setBundle] = useState<PatronWeeklyBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/patron/weekly-bundle", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { bundle?: PatronWeeklyBundle };
      if (data.bundle) setBundle(data.bundle);
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

  const confirm = useCallback(async () => {
    setConfirming(true);
    setFlash(null);
    try {
      const res = await fetch("/api/patron/weekly-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      const data = (await res.json()) as { ok?: boolean; bundle?: PatronWeeklyBundle };
      if (!res.ok || !data.ok) {
        setFlash("Could not confirm plan");
        return;
      }
      if (data.bundle) setBundle(data.bundle);
      setFlash("Weekly plan acknowledged — open each Claw to execute.");
    } finally {
      setConfirming(false);
    }
  }, []);

  if (loading) {
    return (
      <section className={`border border-line bg-panel p-4 ${className}`}>
        <p className="font-mono text-[10px] text-muted">Loading weekly bundle…</p>
      </section>
    );
  }

  if (!bundle) return null;

  return (
    <section className={`border border-line bg-panel ${className}`}>
      <header className="border-b border-line px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">COS2</p>
        <h2 className="font-sans text-sm font-semibold text-stark">Weekly multi-Claw plan</h2>
        <p className="mt-1 font-sans text-xs text-muted">Week of {bundle.weekOf} · {bundle.headline}</p>
      </header>
      <div className="space-y-3 p-4">
        <p className="font-sans text-sm text-stark">{bundle.planSummary}</p>
        {flash ? <p className="font-mono text-[10px] text-muted">{flash}</p> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bundle.claws.map((claw) => (
            <div key={claw.appId} className="border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-sans text-sm font-medium text-stark">{claw.headline}</p>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted">{claw.short}</span>
              </div>
              <ul className="mt-2 space-y-1 font-sans text-xs text-muted">
                {claw.bullets.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
              <Link
                href={claw.href}
                className="mt-2 inline-block font-mono text-[9px] uppercase tracking-widest text-cursor-glow hover:underline"
              >
                Open {claw.short}
              </Link>
            </div>
          ))}
        </div>
        {bundle.crossActions.length > 0 ? (
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Cross-Claw confirms</p>
            <ul className="mt-2 space-y-1">
              {bundle.crossActions.map((a) => (
                <li key={a.id} className="font-sans text-xs text-muted">
                  {a.clawShort ? `[${a.clawShort}] ` : ""}
                  {a.title}
                  {a.href ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link href={a.href} className="text-cursor-glow hover:underline">
                        review
                      </Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <button
          type="button"
          disabled={confirming || bundle.confirmed}
          onClick={() => void confirm()}
          className="border border-cursor-glow px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
        >
          {bundle.confirmed ? "Plan acknowledged this week" : "Acknowledge weekly plan"}
        </button>
      </div>
    </section>
  );
}
