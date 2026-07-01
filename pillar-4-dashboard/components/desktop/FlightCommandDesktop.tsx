"use client";



import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";



import { LegacyFlightCommandLayout } from "@/components/desktop/LegacyFlightCommandLayout";
import { DesktopRouteGuard } from "@/components/desktop/DesktopRouteGuard";

import { CommandPalette } from "@/components/ui/CommandPalette";
import { ExpertBodyClass } from "@/components/ui/ExpertBodyClass";
import { SettingsBootstrap } from "@/components/ui/SettingsBootstrap";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

import { PatronAskProvider } from "@/components/patron/PatronAskProvider";

import { SystemHealthDrawer } from "@/components/system/SystemHealthDrawer";

import { TelemetryProvider } from "@/components/telemetry/TelemetryProvider";

import { ShellLayout } from "@/components/shell/ShellLayout";

import { UiModeProvider, useUiMode } from "@/components/ui/UiModeProvider";

import { isShellV2Enabled } from "@/lib/shell-config";
import type { ForgedAppRecord } from "@/lib/forged-apps-types";
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

  const shellV2 = isShellV2Enabled();



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



  const chromeProps = {
    onOpenPalette: () => setPaletteOpen(true),
    onOpenHealth: openHealth,
    onToggleMode: toggleMode,
  };



  return (

    <>

      <PatronAskProvider>

      <DesktopRouteGuard selectedApps={selectedApps} />

      {shellV2 ? (
        <ShellLayout
          selectedApps={selectedApps}
          forgedApps={forgedApps}
          {...chromeProps}
        >
          {children}
        </ShellLayout>
      ) : (
        <LegacyFlightCommandLayout selectedApps={selectedApps} {...chromeProps}>
          {children}
        </LegacyFlightCommandLayout>
      )}



      <SystemHealthDrawer open={healthOpen} onClose={() => setHealthOpen(false)} />

      </PatronAskProvider>

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
    <ThemeProvider initialScheme={initialColorScheme ?? "curxor"} initialThemeMode={initialThemeMode ?? "dark"}>
      <UiModeProvider initialMode={initialUiMode ?? "simple"} initialLevel={initialExperienceLevel}>
        <TelemetryProvider>
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
        </TelemetryProvider>
      </UiModeProvider>
    </ThemeProvider>
  );
}

