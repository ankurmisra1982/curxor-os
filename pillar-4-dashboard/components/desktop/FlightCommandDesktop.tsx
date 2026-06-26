"use client";



import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";



import { StartNewClawButton } from "@/components/claw/StartNewClawButton";

import { DesktopRouteGuard } from "@/components/desktop/DesktopRouteGuard";

import { CommandPalette } from "@/components/ui/CommandPalette";
import { ContextHintBar } from "@/components/ui/ContextHintBar";
import { ExpertBodyClass } from "@/components/ui/ExpertBodyClass";
import { SettingsBootstrap } from "@/components/ui/SettingsBootstrap";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

import { SystemHealthDrawer } from "@/components/system/SystemHealthDrawer";

import { TelemetryProvider } from "@/components/telemetry/TelemetryProvider";

import { AppNav } from "./AppNav";

import { LiveTelemetryStrip } from "@/components/telemetry/LiveTelemetryStrip";

import { UiModeProvider, useUiMode } from "@/components/ui/UiModeProvider";

import type { ForgedAppRecord } from "@/lib/forged-apps-types";
import { SETTINGS_PATH } from "@/lib/ui-categories";
import type { OotbAppId } from "@/lib/ootb-apps";
import type { ColorScheme, ThemeMode, UiMode } from "@/lib/user-settings-types";



interface FlightCommandDesktopProps {
  children: ReactNode;
  selectedApps: OotbAppId[];
  forgedApps?: ForgedAppRecord[];
  initialUiMode?: UiMode;
  initialExperienceLevel?: import("@/lib/experience-level").ExperienceLevel;
  initialColorScheme?: ColorScheme;
  initialThemeMode?: ThemeMode;
}



function DesktopInner({ children, selectedApps, forgedApps = [] }: FlightCommandDesktopProps) {

  const [healthOpen, setHealthOpen] = useState(false);

  const [paletteOpen, setPaletteOpen] = useState(false);

  const { isExpert, toggleMode } = useUiMode();



  const openHealth = useCallback(() => setHealthOpen(true), []);



  useEffect(() => {

    function onHealth() {

      setHealthOpen(true);

    }

    window.addEventListener("curxor:open-health", onHealth);

    return () => window.removeEventListener("curxor:open-health", onHealth);

  }, []);



  useEffect(() => {

    function onKey(e: KeyboardEvent) {

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {

        e.preventDefault();

        setPaletteOpen(true);

      }

    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  }, []);



  return (

    <>

      <DesktopRouteGuard selectedApps={selectedApps} />

      <div className="flex h-screen flex-col overflow-hidden bg-void">

        <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel px-4 py-3">

          <div>

            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">CurXor OS</p>

            <h1 className="font-sans text-base font-semibold tracking-tight text-stark">Flight Command</h1>

          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">

            <button

              type="button"

              onClick={() => setPaletteOpen(true)}

              className="hidden border border-line px-3 py-1.5 font-sans text-xs text-muted transition hover:border-cursor-glow hover:text-stark sm:inline-flex"

            >

              Search <span className="ml-2 font-mono text-[10px] text-muted">Ctrl K</span>

            </button>

            <button

              type="button"

              onClick={toggleMode}

              className="border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow"

              title={isExpert ? "Hide technical telemetry" : "Show mesh and telemetry details"}

            >

              {isExpert ? "Simple" : "Expert"}

            </button>

            <Link
              href={SETTINGS_PATH}
              className="border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow hover:text-cursor-glow"
            >
              Settings
            </Link>

            <button
              type="button"
              onClick={openHealth}
              className="border border-line px-3 py-1.5 font-sans text-xs text-stark transition hover:border-cursor-glow hover:text-cursor-glow"
            >
              Health
            </button>

            <StartNewClawButton />

          </div>

        </header>



        <AppNav selectedApps={selectedApps} />

        <ContextHintBar />

        {isExpert ? <LiveTelemetryStrip /> : null}



        <main className="min-h-0 flex-1 overflow-y-auto bg-panel p-4 md:p-6">{children}</main>

      </div>



      <SystemHealthDrawer open={healthOpen} onClose={() => setHealthOpen(false)} />

      <CommandPalette

        open={paletteOpen}

        onClose={() => setPaletteOpen(false)}

        selectedApps={selectedApps}
        forgedApps={forgedApps}

        onOpenHealth={openHealth}

        onToggleMode={toggleMode}

        isExpert={isExpert}

      />

    </>

  );

}



export function FlightCommandDesktop({
  children,
  selectedApps,
  forgedApps = [],
  initialUiMode,
  initialExperienceLevel,
  initialColorScheme,
  initialThemeMode,
}: FlightCommandDesktopProps) {
  return (
    <TelemetryProvider>
      <ThemeProvider initialScheme={initialColorScheme ?? "curxor"} initialThemeMode={initialThemeMode ?? "dark"}>
        <UiModeProvider initialMode={initialUiMode ?? "simple"} initialLevel={initialExperienceLevel}>
          <SettingsBootstrap
            initialUiMode={initialUiMode}
            initialExperienceLevel={initialExperienceLevel}
            initialColorScheme={initialColorScheme}
            initialThemeMode={initialThemeMode}
          />
          <ExpertBodyClass />
          <DesktopInner selectedApps={selectedApps} forgedApps={forgedApps}>
            {children}
          </DesktopInner>
        </UiModeProvider>
      </ThemeProvider>
    </TelemetryProvider>
  );
}


