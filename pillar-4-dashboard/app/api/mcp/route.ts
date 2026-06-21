export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { listMcpTools } from "@/lib/mcp/mcp-client";
import { readUserSettings, updateUserSettings } from "@/lib/user-settings";
import type { UserSettingsPatch } from "@/lib/user-settings-types";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(): Promise<Response> {
  const settings = await readUserSettings();
  const tools = await listMcpTools(settings.mcp.servers);
  return Response.json({
    ok: true,
    mcp: settings.mcp,
    tools,
    egress: settings.egress,
  });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: {
    action?: string;
    enabled?: boolean;
    server?: { id: string; url: string; enabled?: boolean };
    allowHosts?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const settings = await readUserSettings();

  if (body.action === "ping" && body.server?.id) {
    const { invokeMcpTool } = await import("@/lib/mcp/mcp-client");
    const target = settings.mcp.servers.find((s) => s.id === body.server!.id);
    if (!target) return Response.json({ error: "Server not found" }, { status: 404 });
    const result = await invokeMcpTool(target, `${target.id}.ping`, {});
    return Response.json({ ok: result.ok, result });
  }

  const patch: UserSettingsPatch = {};

  if (typeof body.enabled === "boolean") {
    patch.mcp = { ...settings.mcp, enabled: body.enabled };
  }

  if (body.server?.id && body.server.url) {
    const servers = [...settings.mcp.servers];
    const idx = servers.findIndex((s) => s.id === body.server!.id);
    const entry = {
      id: body.server.id,
      url: body.server.url,
      enabled: body.server.enabled ?? true,
    };
    if (idx >= 0) servers[idx] = entry;
    else servers.push(entry);
    patch.mcp = { ...(patch.mcp ?? settings.mcp), servers };
  }

  if (Array.isArray(body.allowHosts)) {
    patch.egress = { allowHosts: body.allowHosts.map(String) };
  }

  if (!patch.mcp && !patch.egress) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const next = await updateUserSettings(patch);
  const tools = await listMcpTools(next.mcp.servers);
  return Response.json({ ok: true, mcp: next.mcp, egress: next.egress, tools });
}
