"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVEL_ORDER,
  type ExperienceLevel,
} from "@/lib/experience-level";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";

export function ExperienceGate({
  minLevel,
  children,
  fallback,
  compact,
}: {
  minLevel: ExperienceLevel;
  children: ReactNode;
  /** Custom fallback; default is upgrade prompt */
  fallback?: ReactNode;
  compact?: boolean;
}) {
  const { meetsLevel, level, setLevel } = useExperienceLevel();

  if (meetsLevel(minLevel)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const requiredLabel = EXPERIENCE_LEVEL_LABELS[minLevel];

  if (compact) {
    return (
      <p className="font-mono text-[10px] text-muted">
        Unlock in {requiredLabel} mode —{" "}
        <button
          type="button"
          onClick={() => setLevel(minLevel)}
          className="text-cursor-glow underline"
        >
          switch now
        </button>
      </p>
    );
  }

  return (
    <div className="border border-dashed border-line bg-panel/40 p-4 font-mono text-[10px]">
      <p className="uppercase tracking-widest text-muted">{requiredLabel} feature</p>
      <p className="mt-2 text-stark">
        You&apos;re in {EXPERIENCE_LEVEL_LABELS[level]} mode. Switch to {requiredLabel} to use this
        panel, or change your default in Settings → Appearance.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXPERIENCE_LEVEL_ORDER[minLevel] > EXPERIENCE_LEVEL_ORDER[level] ? (
          <button
            type="button"
            onClick={() => setLevel(minLevel)}
            className="border border-cursor-glow px-3 py-1 uppercase text-cursor-glow"
          >
            Switch to {requiredLabel}
          </button>
        ) : null}
        <Link href="/settings" className="border border-line px-3 py-1 uppercase text-muted hover:text-stark">
          Settings
        </Link>
      </div>
    </div>
  );
}
