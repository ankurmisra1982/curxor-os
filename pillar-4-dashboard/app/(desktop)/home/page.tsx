export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { HomePageClient } from "@/components/desktop/HomePageClient";
import { normalizeSelectedApps } from "@/lib/fre-routing";
import { readUserSettings } from "@/lib/user-settings";

export default async function HomePage() {
  const settings = await readUserSettings();
  const selectedApps = normalizeSelectedApps(settings.selectedApps);
  return <HomePageClient selectedApps={selectedApps} />;
}
