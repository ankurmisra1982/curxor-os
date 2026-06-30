"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { hintForPath } from "@/lib/ui-hints";

const DISMISS_ALL_KEY = "curxor-hint-dismissed:__all__";

function storageKey(id: string): string {
  return `curxor-hint-dismissed:${id}`;
}

function hintsGloballyOff(): boolean {
  try {
    return localStorage.getItem(DISMISS_ALL_KEY) === "1";
  } catch {
    return false;
  }
}

export function ContextHintBar() {
  const pathname = usePathname();
  const { level } = useExperienceLevel();
  const hint = hintForPath(pathname ?? "");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hint || level !== "beginner") {
      setVisible(false);
      return;
    }
    if (hintsGloballyOff()) {
      setVisible(false);
      return;
    }
    try {
      setVisible(localStorage.getItem(storageKey(hint.id)) !== "1");
    } catch {
      setVisible(true);
    }
  }, [hint, level]);

  if (!hint || !visible) return null;

  function dismissCurrent() {
    try {
      localStorage.setItem(storageKey(hint!.id), "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  function dismissAll() {
    try {
      localStorage.setItem(DISMISS_ALL_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="font-sans text-sm font-medium text-stark">{hint.title}</p>
        <p className="mt-1 font-sans text-xs leading-relaxed text-muted">{hint.body}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          type="button"
          onClick={dismissCurrent}
          className="font-sans text-xs text-cursor-glow hover:underline"
        >
          Got it
        </button>
        <button
          type="button"
          onClick={dismissAll}
          className="font-sans text-[10px] text-muted hover:text-stark"
        >
          Don&apos;t show tips
        </button>
      </div>
    </div>
  );
}
