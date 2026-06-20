export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { HomePageClient } from "@/components/desktop/HomePageClient";
import { normalizeSelectedApps } from "@/lib/fre-routing";
import { readFreState } from "@/lib/fre-state";

export default async function HomePage() {
  const fre = await readFreState();
  const selectedApps = normalizeSelectedApps(fre.selectedApps);
  return <HomePageClient selectedApps={selectedApps} />;
}
