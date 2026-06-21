"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";

import type { ExperienceCoachTip } from "@/lib/experience-coach-catalog";
import { primaryCoachTip } from "@/lib/experience-coach-catalog";
import type { ExperienceLevel } from "@/lib/experience-level";
import type { OotbAppId } from "@/lib/ootb-apps";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";

function storageKey(tipId: string): string {
  return `curxor-coach-dismissed:${tipId}`;
}

export function ExperienceCoach({
  appId,
  sectionId,
  tip,
  className = "",
}: {
  appId: OotbAppId;
  sectionId: string;
  tip?: ExperienceCoachTip | null;
  className?: string;
}) {
  const { level } = useExperienceLevel();
  const resolved = tip ?? primaryCoachTip(appId, sectionId, level);
  const [dismissed, setDismissed] = useState(() => {
    if (!resolved) return true;
    try {
      return localStorage.getItem(storageKey(resolved.id)) === "1";
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    if (!resolved) return;
    setDismissed(true);
    try {
      localStorage.setItem(storageKey(resolved.id), "1");
    } catch {
      /* ignore */
    }
  }, [resolved]);

  if (!resolved || dismissed) return null;

  return (
    <div
      className={`mb-3 border border-cursor-glow/30 bg-cursor-glow/5 px-3 py-2 font-mono text-[10px] ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="uppercase tracking-widest text-cursor-glow">{resolved.title}</p>
          <p className="mt-1 text-muted">{resolved.body}</p>
          {resolved.actionHref && resolved.actionLabel ? (
            <Link href={resolved.actionHref} className="mt-2 inline-block text-cursor-glow underline">
              {resolved.actionLabel}
            </Link>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-muted hover:text-stark"
          aria-label="Dismiss tip"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function ExperienceCoachInline({
  children,
  minLevel,
}: {
  children: ReactNode;
  minLevel: ExperienceLevel;
}) {
  const { meetsLevel } = useExperienceLevel();
  if (!meetsLevel(minLevel)) return null;
  return <>{children}</>;
}
