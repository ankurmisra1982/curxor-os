export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { CCP_REGISTRY } from "@/lib/claw-mesh-protocol";
import {
  buildContextPromptBlock,
  getMergedContextForAgent,
  publishAppContext,
  syncFamilyContextToMesh,
} from "@/lib/claw-context-service";
import { queryClawContext } from "@/lib/claw-context-store";
import { requireLanAuth } from "@/lib/lan-auth";
import { publishClawContextMesh } from "@/lib/mesh-publish";
import { syncVitalContextToMesh } from "@/lib/vital-health-store";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import type { ClawContextScope } from "@/lib/claw-mesh-protocol";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const appId = url.searchParams.get("appId") ?? "";
  const profileId = url.searchParams.get("profileId");
  const registry = url.searchParams.get("registry") === "1";

  if (registry) {
    return Response.json({ ok: true, registry: CCP_REGISTRY });
  }

  if (!isValidAppId(appId)) {
    return Response.json({ error: "Valid appId required" }, { status: 400 });
  }

  const merged = await getMergedContextForAgent(appId, profileId);
  const promptBlock = await buildContextPromptBlock(appId, profileId);

  return Response.json({
    ok: true,
    appId,
    profileId,
    context: merged,
    promptBlock,
  });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    appId?: string;
    scope?: ClawContextScope;
    key?: string;
    payload?: Record<string, unknown>;
    profileId?: string | null;
    syncMesh?: boolean;
    resyncFamily?: boolean;
    resyncVital?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.resyncFamily) {
    await syncFamilyContextToMesh();
    return Response.json({ ok: true, action: "family_resync" });
  }

  if (body.resyncVital) {
    await syncVitalContextToMesh(body.profileId);
    return Response.json({ ok: true, action: "vital_resync" });
  }

  const appId = typeof body.appId === "string" ? body.appId.trim() : "";
  if (!isValidAppId(appId)) {
    return Response.json({ error: "Valid appId required" }, { status: 400 });
  }

  const scope = body.scope;
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

  if (!scope || !key) {
    return Response.json({ error: "scope and key required" }, { status: 400 });
  }

  try {
    const result = await publishAppContext(appId, scope, key, payload, body.profileId);

    if (body.syncMesh !== false) {
      const records = await queryClawContext({ appId, scopes: [scope], keyPrefix: key, limit: 1 });
      const envelope = records[0]?.envelope;
      if (envelope) {
        await publishClawContextMesh({ envelope: envelope as unknown as Record<string, unknown> });
      }
    }

    return Response.json({ ok: true, id: result.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
