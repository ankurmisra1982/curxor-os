"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVEL_ORDER,
  type ExperienceLevel,
} from "@/lib/experience-level";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";

function upgradeHint(level: ExperienceLevel, required: ExperienceLevel): string {
  if (level === "essential" && required !== "essential") {
    return required === "standard"
      ? "Unlock in Standard mode for full desk tooling."
      : "Show more detail in Settings → Appearance when you want this panel.";
  }
  return `You're in ${EXPERIENCE_LEVEL_LABELS[level]} mode. Unlock in ${EXPERIENCE_LEVEL_LABELS[required]} mode to use this panel, or change your default in Settings → Appearance.`;
}

export function ExperienceGate({
  minLevel,
  children,
  fallback,
  compact,
}: {
  minLevel: ExperienceLevel;
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean;
}) {
  const { meetsLevel, level, setLevel } = useExperienceLevel();

  if (meetsLevel(minLevel)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const requiredLabel = EXPERIENCE_LEVEL_LABELS[minLevel];
  const canUpgrade = EXPERIENCE_LEVEL_ORDER[minLevel] > EXPERIENCE_LEVEL_ORDER[level];
  const actionLabel =
    level === "essential" && minLevel === "beginner"
      ? "Show more detail"
      : `Switch to ${requiredLabel}`;

  if (compact) {
    return (
      <p className="font-mono text-[10px] text-muted">
        Unlock in {requiredLabel} mode —{" "}
        {canUpgrade ? (
          <button
            type="button"
            onClick={() => setLevel(minLevel)}
            className="text-cursor-glow underline"
          >
            switch now
          </button>
        ) : (
          <Link href="/settings" className="text-cursor-glow underline">
            Settings
          </Link>
        )}
      </p>
    );
  }

  return (
    <div className="border border-dashed border-line bg-panel/40 p-4 font-mono text-[10px]">
      <p className="uppercase tracking-widest text-muted">
        {level === "essential" ? "More detail available" : `${requiredLabel} feature`}
      </p>
      <p className="mt-2 text-stark">{upgradeHint(level, minLevel)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {canUpgrade ? (
          <button
            type="button"
            onClick={() => setLevel(minLevel)}
            className="border border-cursor-glow px-3 py-1 uppercase text-cursor-glow"
          >
            {actionLabel}
          </button>
        ) : null}
        <Link href="/settings" className="border border-line px-3 py-1 uppercase text-muted hover:text-stark">
          Settings
        </Link>
      </div>
    </div>
  );
}
