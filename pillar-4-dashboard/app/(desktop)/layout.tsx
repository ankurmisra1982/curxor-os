export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";

import { FlightCommandDesktop } from "@/components/desktop/FlightCommandDesktop";
import { requireFreInitialized, requireWelcomeCompleted } from "@/lib/fre-guard";
import { readForgedApps } from "@/lib/forged-apps-store";
import { normalizeSelectedApps } from "@/lib/fre-routing";
import { readUserSettings } from "@/lib/user-settings";

export default async function DesktopLayout({ children }: { children: ReactNode }) {
  await requireFreInitialized();
  await requireWelcomeCompleted();
  const settings = await readUserSettings();
  const selectedApps = normalizeSelectedApps(settings.selectedApps);
  const forgedState = await readForgedApps();
  const forgedApps = forgedState.apps.filter(
    (a) => settings.forgedAppSlugs?.includes(a.slug) && a.status !== "archived",
  );

  return (
    <FlightCommandDesktop
      selectedApps={selectedApps}
      forgedApps={forgedApps}
      initialUiMode={settings.appearance.uiMode}
      initialExperienceLevel={settings.appearance.experienceLevel}
      initialColorScheme={settings.appearance.colorScheme}
      initialThemeMode={settings.appearance.themeMode ?? "dark"}
    >
      {children}
    </FlightCommandDesktop>
  );
}
