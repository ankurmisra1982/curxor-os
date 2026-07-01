export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getFrontierProvider } from "@/lib/frontier-providers";
import { privacyEgressDeniedResponse } from "@/lib/egress-policy";
import { requireLanAuth } from "@/lib/lan-auth";
import { createProviderLinkSession } from "@/lib/provider-link-sessions";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const privacyDenied = await privacyEgressDeniedResponse();
  if (privacyDenied) return privacyDenied;

  let body: { providerId?: string; frontierModel?: string | null };
  try {
    body = (await request.json()) as { providerId?: string; frontierModel?: string | null };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const providerId = typeof body.providerId === "string" ? body.providerId.trim() : "";
  const provider = getFrontierProvider(providerId);
  if (!provider || !provider.supportsSubscriptionLogin) {
    return Response.json({ error: "Provider does not support subscription login" }, { status: 400 });
  }

  const frontierModel = typeof body.frontierModel === "string" ? body.frontierModel : null;
  const origin = new URL(request.url).origin;
  const session = await createProviderLinkSession(providerId, frontierModel, origin);

  return Response.json({
    ok: true,
    sessionId: session.id,
    linkPath: `/settings/link/${session.id}`,
    linkMode: session.linkMode,
    authorizeUrl: session.authorizeUrl,
  });
}
