"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SETTINGS_PATH } from "@/lib/ui-categories";

const STORAGE_KEY = "curxor-setup-complete";

export function WelcomeSettingsBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("setup") === "complete") {
        localStorage.setItem(STORAGE_KEY, "1");
        window.history.replaceState({}, "", window.location.pathname);
      }
      setVisible(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="border border-cursor-glow/50 bg-surface px-4 py-4 shadow-cursor">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">Setup complete</p>
          <p className="mt-1 font-sans text-sm text-stark">
            You&apos;re all set. Change Claws, intelligence, or themes anytime in Settings — nothing is locked
            in from first-run.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={SETTINGS_PATH}
            className="border border-cursor-glow px-3 py-1.5 font-sans text-xs text-stark hover:text-cursor-glow"
          >
            Open Settings
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="font-sans text-xs text-muted hover:text-stark"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
