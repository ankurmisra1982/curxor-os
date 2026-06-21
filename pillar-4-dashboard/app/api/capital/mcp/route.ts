export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Capital Claw Context MCP — sovereign desk tools for Claude / Cursor / any MCP client.
 * Connect: claude mcp add capital-claw --transport http http://127.0.0.1:3080/api/capital/mcp
 */
import { requireLanAuth } from "@/lib/lan-auth";
import { capitalMcpToolList, invokeCapitalMcpTool } from "@/lib/capital-mcp-server";

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    name: "capital-claw",
    version: "1.0.0",
    protocol: "mcp-jsonrpc",
    endpoint: "/api/capital/mcp",
    tools: capitalMcpToolList(),
    connect: {
      claudeCode: "claude mcp add capital-claw --transport http http://127.0.0.1:3080/api/capital/mcp",
      cursor: "Add custom MCP server → http://127.0.0.1:3080/api/capital/mcp",
    },
    safety: "Trades execute on-appliance through risk guard + auto-approval stack. Set agentKillSwitch in desk if needed.",
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
      result: { tools: capitalMcpToolList() },
    });
  }

  if (method === "tools/call" || method === "call_tool") {
    const name = body.params?.name ?? "";
    const args = body.params?.arguments ?? {};
    const out = await invokeCapitalMcpTool(name, args);
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
        serverInfo: { name: "capital-claw", version: "1.0.0" },
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
