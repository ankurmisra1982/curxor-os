export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Work Claw Context MCP — sovereign outreach desk tools for Claude / Cursor / any MCP client.
 * Connect: claude mcp add work-claw --transport http http://127.0.0.1:3080/api/work/mcp
 */
import { requireLanAuth } from "@/lib/lan-auth";
import { invokeWorkMcpTool, workMcpToolList } from "@/lib/work-mcp-server";

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    name: "work-claw",
    version: "1.0.0",
    protocol: "mcp-jsonrpc",
    endpoint: "/api/work/mcp",
    tools: workMcpToolList(),
    connect: {
      claudeCode: "claude mcp add work-claw --transport http http://127.0.0.1:3080/api/work/mcp",
      cursor: "Add custom MCP server → http://127.0.0.1:3080/api/work/mcp",
    },
    safety: "Send actions require explicit confirm. Set outboundKillSwitch on desk to block outbound.",
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
      result: { tools: workMcpToolList() },
    });
  }

  if (method === "tools/call" || method === "call_tool") {
    const name = body.params?.name ?? "";
    const args = body.params?.arguments ?? {};
    const out = await invokeWorkMcpTool(name, args);
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
        serverInfo: { name: "work-claw", version: "1.0.0" },
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
