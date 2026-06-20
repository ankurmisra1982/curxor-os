"use client";

import { useEffect, useState } from "react";

import type { ClawProfile } from "@/lib/claw-recommend";

export function ActiveClawBadge() {
  const [active, setActive] = useState<ClawProfile | null>(null);

  useEffect(() => {
    fetch("/api/claw/profiles", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { claws: ClawProfile[]; activeClawId: string | null }) => {
        const claw = data.claws.find((c) => c.id === data.activeClawId) ?? data.claws.at(-1) ?? null;
        setActive(claw);
      })
      .catch(() => setActive(null));
  }, []);

  if (!active) {
    return (
      <p className="font-mono text-[10px] text-muted">No claw profile — tap ✚ New Claw</p>
    );
  }

  return (
    <div className="font-mono text-[10px]">
      <span className="text-muted">ACTIVE · </span>
      <span className="text-cursor-glow">{active.name}</span>
      <div className="mt-1 truncate text-muted">{active.models.vision.split(":")[0]}</div>
    </div>
  );
}
