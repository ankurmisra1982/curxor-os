"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUiMode } from "@/components/ui/UiModeProvider";
import { buildNavItems, groupedNavItems } from "@/lib/ui-categories";
import type { OotbAppId } from "@/lib/ootb-apps";

interface AppNavProps {
  selectedApps: OotbAppId[];
}

export function AppNav({ selectedApps }: AppNavProps) {
  const pathname = usePathname();
  const { isExpert } = useUiMode();
  const items = buildNavItems(selectedApps);
  const groups = groupedNavItems(items);

  return (
    <nav className="shrink-0 border-b border-line bg-surface">
      <div className="hidden overflow-x-auto px-4 py-2 md:block">
        {groups.map(({ category, items: groupItems }) => (
          <div key={category.id} className="mb-2 last:mb-0">
            {isExpert ? (
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted">{category.label}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1">
              {groupItems.map((route) => {
                const active = pathname === route.href;
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={`rounded-sm border px-3 py-1.5 font-sans text-xs transition ${
                      active
                        ? "border-cursor-glow bg-panel font-medium text-cursor-glow"
                        : "border-transparent text-muted hover:border-line hover:bg-void hover:text-stark"
                    }`}
                  >
                    {route.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto px-3 py-2 md:hidden">
        {items.map((route) => {
          const active = pathname === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`shrink-0 border px-3 py-2 font-sans text-xs ${
                active
                  ? "border-cursor-glow bg-panel text-cursor-glow"
                  : "border-line bg-void text-muted"
              }`}
            >
              {route.short === "HOME" ? "Home" : route.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
