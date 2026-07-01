"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { usePatronAsk } from "./PatronAskProvider";

export function PatronAskFab() {
  const { open, unread, toggle } = usePatronAsk();
  const [mounted, setMounted] = useState(false);
  const [hideForPatronDock, setHideForPatronDock] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const shellRoot = document.querySelector("[data-curxor-shell-v2]");
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setHideForPatronDock(!!shellRoot && mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (open || !mounted || hideForPatronDock) return null;

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
