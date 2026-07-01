"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { StartNewClawButton } from "@/components/claw/StartNewClawButton";
import { AppNav } from "@/components/desktop/AppNav";
import { ContextHintBar } from "@/components/ui/ContextHintBar";
import { LiveTelemetryStrip } from "@/components/telemetry/LiveTelemetryStrip";
import { useUiMode } from "@/components/ui/UiModeProvider";
import { SETTINGS_PATH } from "@/lib/ui-categories";
import type { OotbAppId } from "@/lib/ootb-apps";

interface LegacyFlightCommandLayoutProps {
  children: ReactNode;
  selectedApps: OotbAppId[];
  onOpenPalette: () => void;
  onOpenHealth: () => void;
  onToggleMode: () => void;
}

export function LegacyFlightCommandLayout({
  children,
  selectedApps,
  onOpenPalette,
  onOpenHealth,
  onToggleMode,
}: LegacyFlightCommandLayoutProps) {
  const { isLayoutExpert, isEssential } = useUiMode();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-void">
      <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">CurXor OS</p>
          <h1 className="font-sans text-base font-semibold tracking-tight text-stark">Flight Command</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden border border-line px-3 py-1.5 font-sans text-xs text-muted transition hover:border-cursor-glow hover:text-stark sm:inline-flex"
          >
            Search <span className="ml-2 font-mono text-[10px] text-muted">Ctrl K</span>
          </button>
          <button
            type="button"
            onClick={onToggleMode}
            className="border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow"
            title={isLayoutExpert ? "Show simpler home layout" : "Show mission control panels"}
          >
            {isEssential
              ? isLayoutExpert
                ? "Simpler view"
                : "More detail"
              : isLayoutExpert
                ? "Simple"
                : "Expert"}
          </button>
          <Link
            href={SETTINGS_PATH}
            className="border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow hover:text-cursor-glow"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={onOpenHealth}
            className="border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow hover:text-cursor-glow"
          >
            Health
          </button>
          <StartNewClawButton />
        </div>
      </header>

      <AppNav selectedApps={selectedApps} />
      <ContextHintBar />
      {isLayoutExpert ? <LiveTelemetryStrip /> : null}
      <main className="curxor-shell-x min-h-0 flex-1 overflow-y-auto bg-panel py-4 md:py-6">{children}</main>
    </div>
  );
}
