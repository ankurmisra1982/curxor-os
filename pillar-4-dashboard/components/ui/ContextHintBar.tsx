"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { hintForPath } from "@/lib/ui-hints";

function storageKey(id: string): string {
  return `curxor-hint-dismissed:${id}`;
}

export function ContextHintBar() {
  const pathname = usePathname();
  const hint = hintForPath(pathname ?? "");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hint) {
      setVisible(false);
      return;
    }
    try {
      setVisible(localStorage.getItem(storageKey(hint.id)) !== "1");
    } catch {
      setVisible(true);
    }
  }, [hint]);

  if (!hint || !visible) return null;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="font-sans text-sm font-medium text-stark">{hint.title}</p>
        <p className="mt-1 font-sans text-xs leading-relaxed text-muted">{hint.body}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(storageKey(hint.id), "1");
          } catch {
            /* ignore */
          }
          setVisible(false);
        }}
        className="shrink-0 font-sans text-xs text-cursor-glow hover:underline"
      >
        Got it
      </button>
    </div>
  );
}
