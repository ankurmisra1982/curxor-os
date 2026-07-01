"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUiMode } from "@/components/ui/UiModeProvider";
import { previewNavSuffix } from "@/lib/claw-preview-apps";
import { buildNavItems, groupedNavItems, type NavItem } from "@/lib/ui-categories";
import type { OotbAppId } from "@/lib/ootb-apps";

interface AppNavProps {
  selectedApps: OotbAppId[];
}

function navLinkClass(active: boolean): string {
  return `shrink-0 rounded-sm border px-2.5 py-1 font-sans text-xs transition ${
    active
      ? "border-cursor-glow bg-panel font-medium text-cursor-glow"
      : "border-transparent text-muted hover:border-line hover:bg-void hover:text-stark"
  }`;
}

function NavLink({
  route,
  pathname,
  showPreviewSuffix,
}: {
  route: NavItem;
  pathname: string;
  showPreviewSuffix: boolean;
}) {
  const active = pathname === route.href;
  return (
    <Link key={route.href} href={route.href} className={navLinkClass(active)}>
      {route.name}
      {showPreviewSuffix && route.appId && previewNavSuffix(route.appId) ? (
        <span className="ml-1 text-[9px] text-amber-400/80">Soon</span>
      ) : null}
    </Link>
  );
}

export function AppNav({ selectedApps }: AppNavProps) {
  const pathname = usePathname();
  const { isLayoutExpert } = useUiMode();
  const items = buildNavItems(selectedApps);
  const groups = groupedNavItems(items);

  return (
    <nav className="shrink-0 border-b border-line bg-surface">
      <div className="hidden px-4 py-1.5 md:block">
        {isLayoutExpert ? (
          <div className="flex flex-nowrap items-end gap-x-3 overflow-x-auto">
            {groups.map(({ category, items: groupItems }, groupIndex) => {
              const showCategoryLabel = category.id !== "home";
              return (
                <div key={category.id} className="flex shrink-0 items-end gap-3">
                  {groupIndex > 0 ? (
                    <span className="mb-1 h-8 w-px shrink-0 bg-line" aria-hidden />
                  ) : null}
                  <div className="flex shrink-0 flex-col gap-1">
                    {showCategoryLabel ? (
                      <span className="px-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
                        {category.label}
                      </span>
                    ) : null}
                    <div className="flex flex-nowrap items-center gap-1">
                      {groupItems.map((route) => (
                        <NavLink
                          key={route.href}
                          route={route}
                          pathname={pathname}
                          showPreviewSuffix
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-nowrap items-center gap-1 overflow-x-auto">
            {items.map((route) => (
              <NavLink key={route.href} route={route} pathname={pathname} showPreviewSuffix={false} />
            ))}
          </div>
        )}
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
