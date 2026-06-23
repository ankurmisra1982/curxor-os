export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { emitOsEvent, OS_EVENT_KINDS } from "@/lib/os-event-bus";
import { readOsEventLog } from "@/lib/os-event-log-store";
import { pollOsEventBus } from "@/lib/os-event-bus-status";
import { readUserSettings } from "@/lib/user-settings";
import { sanitizeBuildPlane } from "@/lib/build-plane";

export async function GET(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "24", 10) || 24, 1), 100);
  const events = await readOsEventLog(limit);
  const settings = await readUserSettings();

  return Response.json({
    ok: true,
    kinds: OS_EVENT_KINDS,
    buildPlane: sanitizeBuildPlane(settings.buildPlane),
    events,
  });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { action?: string; event?: string; payload?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "poll") {
    const result = await pollOsEventBus();
    const events = await readOsEventLog(12);
    return Response.json({ ok: true, ...result, events });
  }

  if (body.action === "emit_demo") {
    const settings = await readUserSettings();
    if (!settings.buildPlane.enabled) {
      return Response.json({ ok: false, error: "Enable Build Plane overlay first" }, { status: 403 });
    }
    const result = await emitOsEvent("go_live.failed", {
      appId: "demo",
      dedupeKey: `demo:${Date.now()}`,
      demo: true,
      ...(body.payload ?? {}),
    });
    return Response.json({ ok: true, result });
  }

  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
