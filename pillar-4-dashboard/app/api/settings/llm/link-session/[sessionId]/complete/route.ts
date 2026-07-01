export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { privacyEgressDeniedResponse } from "@/lib/egress-policy";
import { completeProviderLinkSession } from "@/lib/provider-link-sessions";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const privacyDenied = await privacyEgressDeniedResponse();
  if (privacyDenied) return privacyDenied;

  const { sessionId } = await context.params;
  try {
    const settings = await completeProviderLinkSession(sessionId);
    return Response.json({ ok: true, settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not complete link";
    return Response.json({ error: message }, { status: 400 });
  }
}
