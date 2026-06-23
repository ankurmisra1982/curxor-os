export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Build Plane inbound MCP — read CCP, Cafe ledger, Forge fleet, desk status.
 * Connect: claude mcp add curxor-build --transport http http://127.0.0.1:3080/api/build/mcp
 */
import { requireLanAuth } from "@/lib/lan-auth";
import { buildPlaneMcpToolList, invokeBuildPlaneMcpTool } from "@/lib/build-plane-mcp-server";
import { readUserSettings } from "@/lib/user-settings";

export async function GET(): Promise<Response> {
  const settings = await readUserSettings();
  return Response.json({
    ok: true,
    name: "curxor-build-plane",
    version: "0.8.1",
    protocol: "mcp-jsonrpc",
    endpoint: "/api/build/mcp",
    requiresBuildPlaneEnabled: true,
    buildPlaneEnabled: settings.buildPlane.enabled,
    bridgeLinked: settings.buildPlane.linkStatus === "linked",
    tools: buildPlaneMcpToolList(),
    connect: {
      claudeCode: "claude mcp add curxor-build --transport http http://127.0.0.1:3080/api/build/mcp",
      cursor: "Settings → MCP → Add server → http://127.0.0.1:3080/api/build/mcp",
    },
    policy: "Read-only tools in BP1. Enable Build Plane overlay in Settings before calling tools.",
  });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    jsonrpc?: string;
    id?: number | string;
    method?: string;
    params?: { name?: string; arguments?: Record<string, unknown> };
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }

  const id = body.id ?? null;
  const method = body.method ?? "";

  if (method === "tools/list" || method === "list_tools") {
    return Response.json({
      jsonrpc: "2.0",
      id,
      result: { tools: buildPlaneMcpToolList() },
    });
  }

  if (method === "tools/call" || method === "call_tool") {
    const name = body.params?.name ?? "";
    const args = body.params?.arguments ?? {};
    const out = await invokeBuildPlaneMcpTool(name, args);
    if (!out.ok) {
      return Response.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: out.error ?? "Tool failed" },
      });
    }
    return Response.json({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(out.content, null, 2) }],
        isError: false,
      },
    });
  }

  if (method === "initialize") {
    return Response.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "curxor-build-plane", version: "0.8.1" },
        capabilities: { tools: {} },
      },
    });
  }

  return Response.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
}
