"use client";

import type { FamilyProfile } from "@/lib/family-types";
import {
  KIN_PREVIEW_FOOTNOTE,
  KIN_SHOWCASE_THESIS,
  KIN_SHOWCASE_USE_CASES,
  kinShowcaseMemberLine,
} from "@/lib/kin-showcase";

interface KinShowcasePanelProps {
  members: FamilyProfile[];
}

export function KinShowcasePanel({ members }: KinShowcasePanelProps) {
  return (
    <section className="space-y-4 border border-line bg-panel/40 p-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cursor-glow">Why Kin matters</p>
        <h3 className="mt-2 font-sans text-base font-semibold leading-snug text-stark">{KIN_SHOWCASE_THESIS}</h3>
        <p className="mt-2 font-sans text-sm text-muted">{kinShowcaseMemberLine(members)}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {KIN_SHOWCASE_USE_CASES.map((item) => (
          <article key={item.id} className="border border-line bg-void p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stark">{item.claw}</span>
              {item.clawStatus === "preview" ? (
                <span className="border border-amber-500/30 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-amber-300/90">
                  Coming soon
                </span>
              ) : (
                <span className="border border-cursor-glow/30 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-cursor-glow/90">
                  On mesh today
                </span>
              )}
            </div>
            <h4 className="mt-3 font-sans text-sm font-medium text-stark">{item.headline}</h4>
            <p className="mt-2 font-sans text-xs leading-relaxed text-muted">{item.body}</p>
            <p className="mt-3 border-l-2 border-cursor-glow/40 pl-3 font-sans text-xs italic text-stark/90">
              {item.example}
            </p>
          </article>
        ))}
      </div>

      <p className="font-sans text-xs text-muted">{KIN_PREVIEW_FOOTNOTE}</p>
    </section>
  );
}
