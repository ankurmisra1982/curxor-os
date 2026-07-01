"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { StartNewClawButton } from "@/components/claw/StartNewClawButton";
import { SETTINGS_PATH } from "@/lib/ui-categories";
import { APP_ROUTES } from "@/lib/ootb-apps";

interface FlightCommandHeaderProps {
  onOpenPalette: () => void;
  onOpenHealth: () => void;
  onToggleMode: () => void;
  isExpert: boolean;
  isEssential?: boolean;
}

function headerTitle(pathname: string, isEssential: boolean): string {
  if (pathname === "/home" || pathname === "/") {
    return isEssential ? "Home" : "Flight Command";
  }
  const match = APP_ROUTES.find((r) => pathname === r.href || pathname.startsWith(`${r.href}/`));
  if (match) return match.name;
  if (pathname.startsWith("/my-claw/")) return "Forged desk";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Flight Command";
}

export function FlightCommandHeader({
  onOpenPalette,
  onOpenHealth,
  onToggleMode,
  isExpert,
  isEssential = false,
}: FlightCommandHeaderProps) {
  const pathname = usePathname() ?? "/home";
  const title = headerTitle(pathname, isEssential);
  const layoutToggleLabel = isEssential
    ? isExpert
      ? "Simpler view"
      : "More detail"
    : isExpert
      ? "Simple"
      : "Expert";

  return (
    <header className="curxor-shell-x flex shrink-0 items-center justify-between border-b border-line bg-panel py-3">
      <div>
        <p className="curxor-eyebrow">CurXor OS</p>
        <h1 className="font-sans text-base font-semibold tracking-tight text-stark">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden min-h-11 border border-line px-3 py-1.5 font-sans text-xs text-muted transition hover:border-cursor-glow hover:text-stark sm:inline-flex sm:items-center"
        >
          Search <span className="ml-2 font-mono text-[10px] text-muted">Ctrl K</span>
        </button>
        <button
          type="button"
          onClick={onToggleMode}
          className="min-h-11 border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow"
          title={isExpert ? "Show simpler home layout" : "Show mission control panels"}
        >
          {layoutToggleLabel}
        </button>
        <Link
          href={SETTINGS_PATH}
          className="min-h-11 border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow hover:text-cursor-glow inline-flex items-center"
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={onOpenHealth}
          className="min-h-11 border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow hover:text-cursor-glow"
        >
          Health
        </button>
        <StartNewClawButton />
      </div>
    </header>
  );
}
