"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useUiMode } from "@/components/ui/UiModeProvider";
import type { ForgedAppRecord } from "@/lib/forged-apps-types";
import type { TeamClawState } from "@/lib/team-status";
import {
  buildOperateNavEntries,
  honestyTierClass,
  type ClawHonestyTier,
  type ShellNavEntry,
} from "@/lib/shell-nav";
import { CLAW_CATEGORIES } from "@/lib/ui-categories";
import type { OotbAppId } from "@/lib/ootb-apps";

interface OperateRailProps {
  selectedApps: OotbAppId[];
  forgedApps?: ForgedAppRecord[];
}

function railLinkClass(active: boolean, tier: ClawHonestyTier, expanded: boolean): string {
  return `flex min-h-11 w-full items-center rounded-sm border px-2 transition ${
    active
      ? "border-cursor-glow bg-panel text-cursor-glow"
      : "border-transparent text-muted hover:border-line hover:bg-void hover:text-stark"
  } ${honestyTierClass(tier)} ${expanded ? "justify-start gap-3" : "justify-center"}`;
}

const STATE_DOT: Record<TeamClawState, string> = {
  idle: "bg-muted",
  running: "bg-cursor-glow",
  awaiting: "bg-amber-400",
  paused: "bg-amber-600",
};

function OperateNavLink({
  item,
  active,
  expanded,
  teamState,
}: {
  item: ShellNavEntry;
  active: boolean;
  expanded: boolean;
  teamState?: TeamClawState;
}) {
  return (
    <Link
      href={item.href}
      className={railLinkClass(active, item.honestyTier, expanded)}
      title={item.name}
    >
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wide">
        {item.short}
      </span>
      {expanded ? (
        <span className="min-w-0 flex-1 truncate font-sans text-xs">
          {item.layer === "home" ? "Home" : item.name.replace(/ Claw$/, "")}
          {item.honestyTier === "preview" ? (
            <span className="ml-1 text-[9px] uppercase text-amber-400/90">Preview</span>
          ) : null}
        </span>
      ) : null}
      {teamState && teamState !== "idle" ? (
        <span className={`h-2 w-2 shrink-0 rounded-full ${STATE_DOT[teamState]}`} aria-hidden />
      ) : null}
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-cursor-glow"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}

export function OperateRail({ selectedApps, forgedApps = [] }: OperateRailProps) {
  const pathname = usePathname();
  const { isExpert } = useUiMode();
  const [expanded, setExpanded] = useState(false);
  const [teamByApp, setTeamByApp] = useState<Record<string, TeamClawState>>({});

  const loadTeam = useCallback(async () => {
    if (!isExpert) return;
    try {
      const res = await fetch("/api/shell/team-status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { claws: { appId: string; state: TeamClawState }[] };
      const map: Record<string, TeamClawState> = {};
      for (const row of data.claws ?? []) map[row.appId] = row.state;
      setTeamByApp(map);
    } catch {
      /* ignore */
    }
  }, [isExpert]);

  useEffect(() => {
    void loadTeam();
    const timer = setInterval(() => void loadTeam(), 30_000);
    return () => clearInterval(timer);
  }, [loadTeam]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setExpanded(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const entries = buildOperateNavEntries(selectedApps, forgedApps);
  const operateOnly = entries.filter((e) => e.layer !== "home");
  const home = entries.find((e) => e.layer === "home");

  const grouped = CLAW_CATEGORIES.map((category) => ({
    category,
    items: operateOnly.filter((e) => e.category === category.id),
  })).filter((g) => g.items.length > 0);

  const widthClass = expanded ? "w-64" : "w-16";

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-r border-line bg-void ${widthClass} transition-[width] duration-200`}
      aria-label="Operate plane"
    >
      <div className="border-b border-line px-2 py-2">
        <div className="mb-1 hidden font-mono text-[9px] uppercase tracking-widest text-muted lg:block">
          {expanded ? "Operate plane" : "Ops"}
        </div>
        {home ? (
          <div className="relative">
            <OperateNavLink
              item={home}
              active={pathname === home.href}
              expanded={expanded}
            />
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-2 py-3">
        {isExpert && expanded
          ? grouped.map(({ category, items }) => (
              <div key={category.id}>
                <p className="mb-1 px-1 font-mono text-[9px] uppercase tracking-widest text-muted">
                  {category.label}
                </p>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div key={item.href} className="relative">
                      <OperateNavLink
                        item={item}
                        active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                        expanded={expanded}
                        teamState={item.appId ? teamByApp[item.appId] : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          : operateOnly.map((item) => (
              <div key={item.href} className="relative">
                <OperateNavLink
                  item={item}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  expanded={expanded}
                  teamState={item.appId ? teamByApp[item.appId] : undefined}
                />
              </div>
            ))}
      </div>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-h-11 w-full items-center justify-center rounded-sm border border-line font-mono text-[10px] uppercase tracking-widest text-muted transition hover:border-cursor-glow hover:text-stark"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse operate rail" : "Expand operate rail"}
        >
          {expanded ? "«" : "»"}
        </button>
      </div>
    </aside>
  );
}
