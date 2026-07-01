import "server-only";

import { createHmac, randomUUID } from "node:crypto";

import { classifyNetworkUrl, assertNetworkPathAllowed } from "./network-path";
import { resolveDigitalEnvVar } from "./digital-env";
import { readUserSettings } from "./user-settings";
import type { BuildPlaneSettings } from "./user-settings-types";
import { appendOsEventRecord } from "./os-event-log-store";
import type { EmitOsEventResult, OsEventKind, OsEventPayload } from "./os-event-bus-types";

export type { EmitOsEventResult, OsEventKind, OsEventPayload, OsEventRecord } from "./os-event-bus-types";
export { OS_EVENT_KINDS } from "./os-event-bus-types";

async function resolveBuildPlaneWebhookUrl(buildPlane: BuildPlaneSettings): Promise<string | null> {
  const fromSettings = buildPlane.webhookUrl?.trim();
  if (fromSettings?.startsWith("http")) return fromSettings;
  const fromEnv = await resolveDigitalEnvVar("CURXOR_BUILD_PLANE_WEBHOOK_URL");
  return fromEnv?.startsWith("http") ? fromEnv : null;
}

function signWebhookBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

async function deliverBuildPlaneWebhook(
  buildPlane: BuildPlaneSettings,
  envelope: { id: string; event: OsEventKind; timestamp: string; payload: OsEventPayload },
): Promise<EmitOsEventResult["webhook"]> {
  if (!buildPlane.enabled) {
    return { attempted: false, ok: true, demo: true, detail: "Build Plane overlay disabled — webhook skipped" };
  }

  const url = await resolveBuildPlaneWebhookUrl(buildPlane);
  if (!url) {
    return {
      attempted: false,
      ok: true,
      demo: true,
      detail: "No webhook URL — set buildPlane.webhookUrl or CURXOR_BUILD_PLANE_WEBHOOK_URL",
    };
  }

  const pathTag = classifyNetworkUrl(url);
  try {
    assertNetworkPathAllowed(pathTag, buildPlane);
  } catch (err) {
    return {
      attempted: false,
      ok: false,
      demo: false,
      detail: err instanceof Error ? err.message : "Network path blocked",
    };
  }

  const body = JSON.stringify({
    source: "curxor-os",
    ...envelope,
  });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = buildPlane.webhookSecret?.trim();
  if (secret) {
    headers["X-CurXor-Signature"] = `sha256=${signWebhookBody(secret, body)}`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        attempted: true,
        ok: false,
        demo: false,
        detail: `HTTP ${res.status}: ${text.slice(0, 120)}`,
      };
    }
    return { attempted: true, ok: true, demo: false, detail: `Delivered ${envelope.event}` };
  } catch (err) {
    return {
      attempted: true,
      ok: false,
      demo: false,
      detail: err instanceof Error ? err.message : "Webhook delivery failed",
    };
  }
}

async function ingestOsEventToCafe(event: OsEventKind, payload: OsEventPayload): Promise<boolean> {
  const { ingestCafeEvent } = await import("./claw-cafe-events");

  const appId =
    typeof payload.appId === "string" && payload.appId.trim()
      ? payload.appId.trim()
      : event.startsWith("forge.")
        ? "claw-forge"
        : "claw-cafe";

  const cafeKindByEvent: Partial<Record<OsEventKind, import("./claw-cafe-events").CafeEventKind>> = {
    "forge.claw_minted": "forge.claw_minted",
    "go_live.failed": "os.go_live_failed",
    "ota.available": "os.ota_available",
    "eno2.down": "os.eno2_down",
    "claw.skill_completed": "forge.desk_activity",
    "claw.approval_required": "work.approval_pending",
    "scheduler.heartbeat": "forge.desk_activity",
    "bridge.receipt": "forge.desk_activity",
  };

  const cafeKind = cafeKindByEvent[event];
  if (!cafeKind) return false;

  const bubbleByEvent: Partial<Record<OsEventKind, string>> = {
    "go_live.failed": "Go Live blocked — check desk checklist",
    "ota.available": "OS update available",
    "eno2.down": "eno2 paused — outbound hold",
  };

  const label =
    typeof payload.name === "string"
      ? payload.name
      : typeof payload.appId === "string"
        ? payload.appId
        : event;

  await ingestCafeEvent({
    kind: cafeKind,
    appId,
    xp: event === "forge.claw_minted" ? { ascension: 0, knowledge: 0 } : { ascension: 8, knowledge: 5 },
    bubble: bubbleByEvent[event] ?? event,
    sourceRef: `os-bus:${event}:${Date.now()}`,
    label,
  });

  return true;
}

export async function emitOsEvent(
  event: OsEventKind,
  payload: OsEventPayload = {},
  options?: { skipCafe?: boolean; skipWebhook?: boolean },
): Promise<EmitOsEventResult> {
  const settings = await readUserSettings();
  const id = `os-${randomUUID()}`;
  const timestamp = new Date().toISOString();
  const envelope = { id, event, timestamp, payload };

  let cafeIngested = false;
  if (!options?.skipCafe && event !== "forge.claw_minted") {
    try {
      cafeIngested = await ingestOsEventToCafe(event, payload);
    } catch {
      cafeIngested = false;
    }
  }

  const webhook = options?.skipWebhook
    ? { attempted: false, ok: true, demo: true, detail: "Webhook skipped" }
    : await deliverBuildPlaneWebhook(settings.buildPlane, envelope);

  await appendOsEventRecord({ ...envelope, webhook });

  return {
    ok: true,
    id,
    event,
    logged: true,
    cafeIngested,
    webhook,
  };
}
