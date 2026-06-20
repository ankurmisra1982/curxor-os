export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { updateSelectedClaws, sanitizeSettingsForClient } from "@/lib/user-settings";
import type { OotbAppId } from "@/lib/ootb-apps";
import { isValidAppId } from "@/lib/ootb-apps";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { selectedApps?: unknown };
  try {
    body = (await request.json()) as { selectedApps?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.selectedApps)) {
    return Response.json({ error: "selectedApps must be an array" }, { status: 400 });
  }

  const ids = body.selectedApps.filter((id): id is OotbAppId => typeof id === "string" && isValidAppId(id));

  try {
    const settings = await updateSelectedClaws(ids);
    const sanitized = await sanitizeSettingsForClient(settings);
    return Response.json({ ok: true, settings: sanitized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update Claws";
    return Response.json({ error: message }, { status: 400 });
  }
}
