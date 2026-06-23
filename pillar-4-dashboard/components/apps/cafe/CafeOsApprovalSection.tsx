"use client";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { OsApprovalStrip } from "@/components/os/OsApprovalStrip";
import { useCallback, useEffect, useState } from "react";

/** Renders ascension approval strip only when cross-Claw queue has items. */
export function CafeOsApprovalSection() {
  const [total, setTotal] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/os/approvals", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { total?: number };
      setTotal(typeof json.total === "number" ? json.total : 0);
    } catch {
      setTotal(0);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (total === null || total === 0) return null;

  return (
    <ExperienceAppSection
      appId="claw-cafe"
      sectionId="os-approvals"
      minLevel="beginner"
      title="Needs your OK"
      subtitle="Cross-Claw trades, sends, and publishes awaiting approval"
    >
      <OsApprovalStrip variant="cafe" />
    </ExperienceAppSection>
  );
}
