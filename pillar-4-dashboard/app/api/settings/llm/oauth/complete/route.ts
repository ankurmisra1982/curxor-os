export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { parseAuthorizationCode } from "@/lib/oauth/pkce";
import { requireLanAuth } from "@/lib/lan-auth";
import { completeOAuthProviderLink } from "@/lib/provider-link-sessions";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { sessionId?: string; callbackUrl?: string; code?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const rawInput =
    (typeof body.callbackUrl === "string" ? body.callbackUrl : "") ||
    (typeof body.code === "string" ? body.code : "");

  const code = parseAuthorizationCode(rawInput);
  if (!code) {
    return Response.json({ error: "Paste the full callback URL or authorization code" }, { status: 400 });
  }

  try {
    const settings = await completeOAuthProviderLink(sessionId, code);
    return Response.json({ ok: true, settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth completion failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
