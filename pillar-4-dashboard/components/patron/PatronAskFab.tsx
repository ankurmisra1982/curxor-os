"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { usePatronAsk } from "./PatronAskProvider";

export function PatronAskFab() {
  const { open, unread, toggle } = usePatronAsk();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (open || !mounted) return null;

  return createPortal(
    <button
      type="button"
      onClick={toggle}
      aria-label="Open Patron Ask"
      className="fixed bottom-6 right-6 z-[45] flex h-14 w-14 items-center justify-center rounded-full border border-cursor-glow bg-panel shadow-[0_0_48px_rgba(188,19,254,0.15)] transition hover:bg-void"
    >
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border font-display text-sm font-semibold text-cursor-glow ${
          unread ? "animate-pulse border-cursor-glow" : "border-line"
        }`}
      >
        P
        {unread ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#bc13fe]" aria-hidden />
        ) : null}
      </span>
      <span className="sr-only">Ask</span>
    </button>,
    document.body,
  );
}
