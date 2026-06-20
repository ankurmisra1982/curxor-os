"use client";

import Link from "next/link";

export function StartNewClawButton() {
  return (
    <Link
      href="/claw-forge?new=1"
      title="The Forge — mint a new Claw"
      className="group flex items-center gap-2 border border-cursor-glow/60 bg-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cursor-glow shadow-cursor transition hover:border-cursor-glow hover:bg-panel"
    >
      <span className="flex h-5 w-5 items-center justify-center border border-cursor-glow text-sm leading-none">
        +
      </span>
      <span className="hidden sm:inline">Forge</span>
    </Link>
  );
}
