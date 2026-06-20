export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";

import { FlightCommandDesktop } from "@/components/desktop/FlightCommandDesktop";
import { requireFreInitialized } from "@/lib/fre-guard";
import { normalizeSelectedApps } from "@/lib/fre-routing";
import { readUserSettings } from "@/lib/user-settings";

export default async function DesktopLayout({ children }: { children: ReactNode }) {
  await requireFreInitialized();
  const settings = await readUserSettings();
  const selectedApps = normalizeSelectedApps(settings.selectedApps);

  return (
    <FlightCommandDesktop
      selectedApps={selectedApps}
      initialUiMode={settings.appearance.uiMode}
      initialColorScheme={settings.appearance.colorScheme}
      initialThemeMode={settings.appearance.themeMode ?? "dark"}
    >
      {children}
    </FlightCommandDesktop>
  );
}
