"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { StartNewClawButton } from "@/components/claw/StartNewClawButton";
import { SystemHealthDrawer } from "@/components/system/SystemHealthDrawer";
import { AppNav } from "./AppNav";
import { MasterClawSidebar } from "./MasterClawSidebar";
import { LiveTelemetryStrip } from "@/components/telemetry/LiveTelemetryStrip";

export function FlightCommandDesktop({ children }: { children: ReactNode }) {
  const [healthOpen, setHealthOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <aside className="h-full w-[30%] min-w-[300px] max-w-[480px] shrink-0 border-r border-line">
        <MasterClawSidebar />
      </aside>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cursor-glow">CurXor OS</p>
            <h1 className="font-display text-sm uppercase tracking-[0.18em] text-stark">Flight Command Desktop</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHealthOpen(true)}
              className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-stark transition hover:border-cursor-glow hover:text-cursor-glow"
            >
              System Health
            </button>
            <StartNewClawButton />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">OFFLINE SOVEREIGN</span>
          </div>
        </header>
        <AppNav />
        <LiveTelemetryStrip />
        <main className="flex-1 overflow-y-auto bg-panel p-4">{children}</main>
      </div>
      <SystemHealthDrawer open={healthOpen} onClose={() => setHealthOpen(false)} />
    </div>
  );
}
