export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getCcpConsentState, setCcpConsent } from "@/lib/ccp-consent-store";
import type { ClawContextScope } from "@/lib/claw-mesh-protocol";
import { CCP_REGISTRY } from "@/lib/claw-mesh-protocol";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(): Promise<Response> {
  const consent = await getCcpConsentState();
  return Response.json({ ok: true, consent, registry: CCP_REGISTRY });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { subscriberAppId?: string; scope?: string; allowed?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.subscriberAppId || !isValidAppId(body.subscriberAppId) || !body.scope) {
    return Response.json({ error: "Missing subscriberAppId or scope" }, { status: 400 });
  }

  const consent = await setCcpConsent(
    body.subscriberAppId as OotbAppId,
    body.scope as ClawContextScope,
    body.allowed !== false,
  );
  return Response.json({ ok: true, consent });
}
