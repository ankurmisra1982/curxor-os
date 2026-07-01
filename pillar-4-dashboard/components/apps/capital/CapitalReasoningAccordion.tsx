"use client";

import { useState } from "react";

import type { AgentAuditEntry } from "@/lib/capital-queue-types";

interface CapitalReasoningAccordionProps {
  entries: AgentAuditEntry[];
}

function formatWhen(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CapitalReasoningAccordion({ entries }: CapitalReasoningAccordionProps) {
  const [open, setOpen] = useState(false);
  const recent = entries.slice(-8).reverse();

  if (recent.length === 0) {
    return (
      <div className="border border-line bg-void p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Agent reasoning</p>
        <p className="mt-2 font-sans text-xs text-muted">
          Trade decisions and tool calls will appear here — collapsed by default for calm desks.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-void">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-panel"
        aria-expanded={open}
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Agent reasoning</p>
          <p className="mt-1 font-sans text-xs text-muted">
            {recent.length} recent audit entries · expand for evidence
          </p>
        </div>
        <span className="font-mono text-sm text-muted">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <ul className="max-h-64 divide-y divide-line overflow-y-auto border-t border-line">
          {recent.map((e) => (
            <li key={e.id} className="px-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[9px] uppercase text-cursor-glow">{e.kind}</span>
                <span className="font-mono text-[9px] text-muted">{formatWhen(e.at)}</span>
              </div>
              <p className="mt-1 font-sans text-xs text-stark">{e.note}</p>
              {e.ticker ? (
                <p className="mt-0.5 font-mono text-[10px] text-muted">
                  {e.action?.toUpperCase()} {e.qty} {e.ticker}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
