"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_ROUTES } from "@/lib/app-routes";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-line bg-surface px-4 py-2">
      <span className="mr-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Canvas</span>
      {APP_ROUTES.map((route) => {
        const active = pathname === route.href;
        return (
          <Link
            key={route.href}
            href={route.href}
            className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition ${
              active
                ? "border-cursor-glow bg-panel text-cursor-glow shadow-cursor"
                : "border-line bg-void text-muted hover:border-cursor/40 hover:text-stark"
            }`}
          >
            {route.name}
          </Link>
        );
      })}
    </nav>
  );
}
