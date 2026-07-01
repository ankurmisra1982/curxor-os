"use client";

import { useEffect, useState } from "react";

import type { ClawProfile } from "@/lib/claw-recommend";
import type { ForgedAppRecord } from "@/lib/forged-apps-types";

export function ActiveClawBadge() {
  const [active, setActive] = useState<ClawProfile | null>(null);
  const [forgedCount, setForgedCount] = useState(0);
  const [forgedSample, setForgedSample] = useState<ForgedAppRecord | null>(null);

  useEffect(() => {
    void fetch("/api/claw/profiles", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { claws: ClawProfile[]; activeClawId: string | null }) => {
        const claw = data.claws.find((c) => c.id === data.activeClawId) ?? data.claws.at(-1) ?? null;
        setActive(claw);
      })
      .catch(() => setActive(null));

    void fetch("/api/forge/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { forgedApps?: ForgedAppRecord[] } | null) => {
        const apps = data?.forgedApps ?? [];
        setForgedCount(apps.length);
        setForgedSample(apps[0] ?? null);
      })
      .catch(() => {
        setForgedCount(0);
        setForgedSample(null);
      });
  }, []);

  if (forgedCount > 0) {
    const label = forgedCount === 1 ? forgedSample?.name ?? "Forged desk" : `${forgedCount} forged desks`;
    return (
      <div className="font-mono text-[10px]">
        <span className="text-muted">FLEET · </span>
        <span className="text-cursor-glow">{label}</span>
        {active ? (
          <div className="mt-1 truncate text-muted">Active profile · {active.name}</div>
        ) : null}
      </div>
    );
  }

  if (active) {
    return (
      <div className="font-mono text-[10px]">
        <span className="text-muted">ACTIVE · </span>
        <span className="text-cursor-glow">{active.name}</span>
        <div className="mt-1 truncate text-muted">{active.models.vision.split(":")[0]}</div>
      </div>
    );
  }

  return (
    <p className="font-mono text-[10px] text-muted">No claw profile — tap ✚ New Claw</p>
  );
}
