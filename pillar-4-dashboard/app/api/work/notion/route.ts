export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import {
  getNotionOAuthConfig,
  isWorkNotionConfigured,
  readWorkNotionOAuth,
  unlinkWorkNotion,
  writeWorkNotionToken,
} from "@/lib/work-notion-client";

export async function GET(): Promise<Response> {
  const oauth = await readWorkNotionOAuth();
  const config = getNotionOAuthConfig();
  const linked = await isWorkNotionConfigured();

  return Response.json({
    ok: true,
    linked,
    workspaceName: oauth.workspaceName,
    clientConfigured: Boolean(config.clientId && config.clientSecret),
    detail: linked ? "Notion linked" : "OAuth scaffold — POST link with access token or complete OAuth flow",
  });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { action?: string; accessToken?: string; workspaceName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "start") {
    const config = getNotionOAuthConfig();
    if (!config.clientId) {
      return Response.json({
        ok: true,
        authorizeUrl: null,
        detail: "Set NOTION_CLIENT_ID in digital.env — or POST link with internal integration token",
      });
    }
    const redirectUri = process.env.NOTION_REDIRECT_URI?.trim() || "http://127.0.0.1:3080/api/work/notion";
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: "code",
      owner: "user",
      redirect_uri: redirectUri,
    });
    return Response.json({
      ok: true,
      authorizeUrl: `https://api.notion.com/v1/oauth/authorize?${params.toString()}`,
    });
  }

  if (body.action === "link") {
    const token = body.accessToken?.trim();
    if (!token) return Response.json({ error: "accessToken required" }, { status: 400 });
    const state = await writeWorkNotionToken(token, body.workspaceName);
    return Response.json({ ok: true, linked: true, workspaceName: state.workspaceName });
  }

  if (body.action === "unlink") {
    await unlinkWorkNotion();
    return Response.json({ ok: true, linked: false });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
