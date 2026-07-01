"use client";

import type { ReactNode } from "react";

import { ContextHintBar } from "@/components/ui/ContextHintBar";
import { LiveTelemetryStrip } from "@/components/telemetry/LiveTelemetryStrip";
import { useUiMode } from "@/components/ui/UiModeProvider";
import type { ForgedAppRecord } from "@/lib/forged-apps-types";
import type { OotbAppId } from "@/lib/ootb-apps";

import { EgressAirgapBanner } from "./EgressAirgapBanner";
import { FlightCommandHeader } from "./FlightCommandHeader";
import { OperateRail } from "./OperateRail";
import { PatronDock } from "./PatronDock";
import { ShellStatusRail } from "./ShellStatusRail";
import { SovereigntyStrip } from "./SovereigntyStrip";
import { UniversalStrip } from "./UniversalStrip";

interface ShellLayoutProps {
  children: ReactNode;
  selectedApps: OotbAppId[];
  forgedApps?: ForgedAppRecord[];
  onOpenPalette: () => void;
  onOpenHealth: () => void;
  onToggleMode: () => void;
}

export function ShellLayout({
  children,
  selectedApps,
  forgedApps = [],
  onOpenPalette,
  onOpenHealth,
  onToggleMode,
}: ShellLayoutProps) {
  const { isExpert, isEssential } = useUiMode();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-void" data-curxor-shell-v2>
      <SovereigntyStrip />
      <FlightCommandHeader
        onOpenPalette={onOpenPalette}
        onOpenHealth={onOpenHealth}
        onToggleMode={onToggleMode}
        isExpert={isExpert}
        isEssential={isEssential}
      />
      {isExpert ? <LiveTelemetryStrip /> : null}
      <UniversalStrip />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <OperateRail selectedApps={selectedApps} forgedApps={forgedApps} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <EgressAirgapBanner />
          <ContextHintBar />
          <main className="min-h-0 flex-1 overflow-y-auto bg-panel p-4 md:p-6">{children}</main>
          <PatronDock />
        </div>
        {isExpert ? <ShellStatusRail /> : null}
      </div>
    </div>
  );
}
