export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getFrontierProvider } from "@/lib/frontier-providers";
import { validateFrontierApiKey } from "@/lib/frontier-validate";
import { privacyEgressDeniedResponse } from "@/lib/egress-policy";
import { requireLanAuth } from "@/lib/lan-auth";
import { getProviderApiKey, setProviderApiKey } from "@/lib/llm-credentials";
import { readUserSettings, sanitizeSettingsForClient, updateUserSettings } from "@/lib/user-settings";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const privacyDenied = await privacyEgressDeniedResponse();
  if (privacyDenied) return privacyDenied;

  let body: {
    providerId?: string;
    apiKey?: string;
    subscriptionLinked?: boolean;
    frontierModel?: string | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const providerId = typeof body.providerId === "string" ? body.providerId.trim() : "";
  const provider = getFrontierProvider(providerId);
  if (!provider) {
    return Response.json({ error: "Unknown provider" }, { status: 400 });
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const subscriptionLinked = body.subscriptionLinked === true;

  if (!apiKey && !subscriptionLinked) {
    return Response.json({ error: "Provide an API key or link a subscription" }, { status: 400 });
  }

  if (subscriptionLinked && !provider.supportsSubscriptionLogin) {
    return Response.json({ error: "This provider requires an API key" }, { status: 400 });
  }

  if (apiKey) {
    const validation = await validateFrontierApiKey(providerId, apiKey);
    if (!validation.ok) {
      return Response.json({ error: validation.error ?? "Invalid API key" }, { status: 400 });
    }
    await setProviderApiKey(providerId, apiKey);
  }

  const current = await readUserSettings();
  const hasKey = apiKey ? true : Boolean(await getProviderApiKey(providerId));

  const frontierModel =
    typeof body.frontierModel === "string"
      ? body.frontierModel
      : current.intelligence.frontierModel ?? provider.models[0]?.id ?? null;

  const settings = await updateUserSettings({
    intelligence: {
      frontierProviderId: providerId,
      frontierModel,
      connectedProviders: {
        ...current.intelligence.connectedProviders,
        [providerId]: {
          connectedAt: new Date().toISOString(),
          label: provider.name,
          hasApiKey: hasKey,
          oauthLinked: current.intelligence.connectedProviders[providerId]?.oauthLinked === true,
          subscriptionLinked: subscriptionLinked || current.intelligence.connectedProviders[providerId]?.subscriptionLinked === true,
        },
      },
    },
  });

  const sanitized = await sanitizeSettingsForClient(settings);
  return Response.json({ ok: true, settings: sanitized });
}
