"use client";

import Link from "next/link";

import { StartNewClawButton } from "@/components/claw/StartNewClawButton";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { SETTINGS_PATH } from "@/lib/ui-categories";

interface FlightCommandHeaderProps {
  onOpenPalette: () => void;
  onOpenHealth: () => void;
  onToggleMode: () => void;
  isExpert: boolean;
  isEssential?: boolean;
}

export function FlightCommandHeader({
  onOpenPalette,
  onOpenHealth,
  onToggleMode,
  isExpert,
  isEssential = false,
}: FlightCommandHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel px-3 py-3 md:px-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">CurXor OS</p>
        <h1 className="font-sans text-base font-semibold tracking-tight text-stark">
          {isEssential ? "Home" : "Flight Command"}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden min-h-11 border border-line px-3 py-1.5 font-sans text-xs text-muted transition hover:border-cursor-glow hover:text-stark sm:inline-flex sm:items-center"
        >
          Search <span className="ml-2 font-mono text-[10px] text-muted">Ctrl K</span>
        </button>
        {!isEssential ? (
          <button
            type="button"
            onClick={onToggleMode}
            className="min-h-11 border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow"
            title={isExpert ? "Show simpler home layout" : "Show mission control panels"}
          >
            {isExpert ? "Simple" : "Expert"}
          </button>
        ) : null}
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
