"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildUniversalNavEntries, honestyTierClass } from "@/lib/shell-nav";

function navClass(active: boolean, tier: "production" | "mint" | "preview"): string {
  const tierTone = honestyTierClass(tier);
  return `shrink-0 min-h-11 rounded-sm border px-3 py-2 font-sans text-xs transition ${tierTone} ${
    active
      ? "border-cursor-glow bg-panel font-medium text-cursor-glow"
      : "border-line bg-void hover:border-cursor-glow/60 hover:bg-panel"
  }`;
}

export function UniversalStrip() {
  const pathname = usePathname();
  const items = buildUniversalNavEntries();

  return (
    <div className="shrink-0 border-b border-line bg-surface px-3 py-2 md:px-4">
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted">
        Universal · always on
      </div>
      <nav className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label="Universal apps">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={navClass(active, item.honestyTier)}>
              <span>{item.name}</span>
              {item.honestyTier === "preview" ? (
                <span className="ml-1.5 text-[9px] uppercase text-amber-400/90">Preview</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
