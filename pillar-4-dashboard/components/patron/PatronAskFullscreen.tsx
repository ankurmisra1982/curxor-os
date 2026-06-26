"use client";

import Link from "next/link";

import { HOME_PATH } from "@/lib/ui-categories";

import { usePatronAsk } from "./PatronAskProvider";
import { PatronAskThread } from "./PatronAskThread";
import { PatronOpsBoard } from "./PatronOpsBoard";
import { PatronAskHeaderBadges } from "./PatronAskHeaderBadges";

export function PatronAskFullscreen() {
  const { clawLabel, inferenceStatus, collapseToSheet, minimize } = usePatronAsk();

  return (
    <div className="-m-4 flex min-h-[calc(100dvh-9rem)] flex-col md:-m-6">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border border-line bg-panel px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Patron</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-sans text-base font-semibold text-stark">Ask</h1>
            <PatronAskHeaderBadges clawLabel={clawLabel} inferenceStatus={inferenceStatus} />
          </div>
          <p className="mt-1 font-sans text-xs text-muted">Your patron on the appliance — ops board + thread.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={collapseToSheet}
            className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition hover:border-cursor-glow hover:text-cursor-glow"
          >
            Sheet
          </button>
          <button
            type="button"
            onClick={minimize}
            className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition hover:border-cursor-glow hover:text-cursor-glow"
          >
            Minimize
          </button>
          <Link
            href={HOME_PATH}
            className="border border-cursor-glow px-3 py-1.5 font-sans text-xs text-cursor-glow transition hover:bg-void"
          >
            Flight Command
          </Link>
        </div>
      </header>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <PatronOpsBoard className="min-h-[320px] lg:min-h-0 lg:flex-1" />
        <aside className="flex min-h-[420px] w-full flex-col border border-line bg-void shadow-[0_0_48px_rgba(188,19,254,0.12)] lg:max-w-md lg:shrink-0">
          <div className="border-b border-line bg-panel px-4 py-2">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Patron thread</p>
          </div>
          <PatronAskThread compactApprovals={false} />
        </aside>
      </div>
    </div>
  );
}
