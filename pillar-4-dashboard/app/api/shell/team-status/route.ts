export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildTeamStatus } from "@/lib/team-status";
import { readUserSettings } from "@/lib/user-settings";

export async function GET(): Promise<Response> {
  const settings = await readUserSettings();
  const claws = await buildTeamStatus(settings.selectedApps);
  return Response.json(
    { ok: true, generatedAt: new Date().toISOString(), claws },
    { headers: { "Cache-Control": "no-store" } },
  );
}
