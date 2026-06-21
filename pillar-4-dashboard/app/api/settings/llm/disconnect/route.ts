export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getFrontierProvider } from "@/lib/frontier-providers";
import { requireLanAuth } from "@/lib/lan-auth";
import { removeAllProviderCredentials } from "@/lib/llm-credentials";
import { readUserSettings, sanitizeSettingsForClient, updateUserSettings } from "@/lib/user-settings";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { providerId?: string };
  try {
    body = (await request.json()) as { providerId?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const providerId = typeof body.providerId === "string" ? body.providerId.trim() : "";
  if (!getFrontierProvider(providerId)) {
    return Response.json({ error: "Unknown provider" }, { status: 400 });
  }

  await removeAllProviderCredentials(providerId);

  const current = await readUserSettings();
  const nextProviders = { ...current.intelligence.connectedProviders };
  delete nextProviders[providerId];

  const clearActive = current.intelligence.frontierProviderId === providerId;

  const settings = await updateUserSettings({
    intelligence: {
      frontierProviderId: clearActive ? null : current.intelligence.frontierProviderId,
      frontierModel: clearActive ? null : current.intelligence.frontierModel,
      connectedProviders: nextProviders,
    },
  });

  const sanitized = await sanitizeSettingsForClient(settings);
  return Response.json({ ok: true, settings: sanitized });
}
