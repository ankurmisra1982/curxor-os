export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import {
  isRobinhoodMcpEnabled,
  markRobinhoodMcpConnected,
  readRobinhoodMcpState,
  unlinkRobinhoodMcp,
} from "@/lib/capital-robinhood-mcp";

export async function GET(): Promise<Response> {
  const [enabled, state] = await Promise.all([isRobinhoodMcpEnabled(), readRobinhoodMcpState()]);
  return Response.json({ ok: true, enabled, state });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { action?: string; accountLabel?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "mark_connected") {
    const state = await markRobinhoodMcpConnected({ accountLabel: body.accountLabel });
    return Response.json({ ok: true, state });
  }

  if (body.action === "unlink") {
    await unlinkRobinhoodMcp();
    return Response.json({ ok: true, state: await readRobinhoodMcpState() });
  }

  if (body.action === "start") {
    return Response.json({
      ok: true,
      mcpUrl: "https://agent.robinhood.com/mcp/trading",
      instructions: [
        "Open Robinhood Agentic Trading on desktop",
        "Add MCP URL to your agent (Cursor / Claude / ChatGPT)",
        "Complete OAuth in browser",
        "Return here and click Mark connected",
      ],
    });
  }

  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
