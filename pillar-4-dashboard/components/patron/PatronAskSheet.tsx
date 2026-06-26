"use client";

import { useEffect } from "react";

import { usePatronAsk } from "./PatronAskProvider";
import { PatronAskThread } from "./PatronAskThread";
import { PatronAskHeaderBadges } from "./PatronAskHeaderBadges";

export function PatronAskSheet() {
  const { open, minimize, openFullscreen, clawLabel, inferenceStatus } = usePatronAsk();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") minimize();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, minimize]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Minimize Patron Ask"
        className="fixed inset-0 z-[44] bg-black/20"
        onClick={minimize}
      />
      <aside
        className="fixed bottom-20 right-6 z-[45] flex w-[380px] max-h-[min(520px,70vh)] flex-col overflow-hidden rounded-t-lg border border-line bg-void shadow-[0_0_48px_rgba(188,19,254,0.15)]"
        role="dialog"
        aria-label="Patron Ask"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Patron</p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-sans text-sm font-semibold text-stark">Ask</h2>
              <PatronAskHeaderBadges clawLabel={clawLabel} inferenceStatus={inferenceStatus} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={openFullscreen}
              className="border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted transition hover:border-cursor-glow hover:text-cursor-glow"
              title="Open fullscreen ops board"
            >
              Expand
            </button>
            <button
              type="button"
              onClick={minimize}
              className="border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted transition hover:border-cursor-glow hover:text-cursor-glow"
            >
              Close
            </button>
          </div>
        </header>
        <PatronAskThread />
      </aside>
    </>
  );
}
