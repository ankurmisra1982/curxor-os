"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  { href: "/m/home", label: "Home", short: "H" },
  { href: "/m/ask", label: "Ask", short: "A" },
  { href: "/m/act", label: "Act", short: "!" },
  { href: "/m/more", label: "More", short: "…" },
] as const;

export function PatronLinkShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-void pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <header className="shrink-0 border-b border-line bg-panel px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Patron Link</p>
        <h1 className="font-sans text-sm font-semibold text-stark">Sovereign pocket surface</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={`flex flex-col items-center gap-0.5 px-2 py-3 font-mono text-[10px] uppercase tracking-widest ${
                    active ? "text-cursor-glow" : "text-muted"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                      active ? "border-cursor-glow" : "border-line"
                    }`}
                  >
                    {tab.short}
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
