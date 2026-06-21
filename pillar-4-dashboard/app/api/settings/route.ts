export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { FRONTIER_PROVIDERS } from "@/lib/frontier-providers";
import { resolveInferenceStatus } from "@/lib/inference-router";
import { isLocalInferenceAvailable } from "@/lib/local-inference";
import { requireLanAuth } from "@/lib/lan-auth";
import { getProviderApiKey } from "@/lib/llm-credentials";
import {
  readUserSettings,
  sanitizeSettingsForClient,
  updateUserSettings,
} from "@/lib/user-settings";
import type { UserSettings, UserSettingsPatch } from "@/lib/user-settings-types";

async function buildSettingsResponse() {
  const settings = await readUserSettings();
  const localAvailable = await isLocalInferenceAvailable();
  const inference = await resolveInferenceStatus(localAvailable);
  const sanitized = await sanitizeSettingsForClient(settings);

  return {
    settings: sanitized,
    providers: FRONTIER_PROVIDERS,
    inference,
  };
}

export async function GET(): Promise<Response> {
  const payload = await buildSettingsResponse();
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: UserSettingsPatch;
  try {
    body = (await request.json()) as Partial<UserSettings>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: UserSettingsPatch = {};
  if (body.appearance) patch.appearance = body.appearance;
  if (body.intelligence) patch.intelligence = body.intelligence;
  if (body.multiModel) patch.multiModel = body.multiModel;
  if (body.mcp) patch.mcp = body.mcp;
  if (body.egress) patch.egress = body.egress;

  if (!patch.appearance && !patch.intelligence && !patch.multiModel && !patch.mcp && !patch.egress) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  await updateUserSettings(patch);
  const payload = await buildSettingsResponse();
  return Response.json({ ok: true, ...payload });
}
