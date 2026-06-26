"use client";

import { usePatronAsk } from "./PatronAskProvider";

export function PatronAskFab() {
  const { open, unread, toggle } = usePatronAsk();

  if (open) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Open Patron Ask"
      className="fixed bottom-6 right-6 z-[45] flex h-14 w-14 items-center justify-center rounded-full border border-cursor-glow bg-panel shadow-[0_0_48px_rgba(188,19,254,0.15)] transition hover:bg-void relative"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full border font-display text-sm font-semibold text-cursor-glow ${
          unread ? "animate-pulse border-cursor-glow" : "border-line"
        }`}
      >
        P
      </span>
      {unread ? (
        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#bc13fe]" aria-hidden />
      ) : null}
      <span className="sr-only">Ask</span>
    </button>
  );
}
