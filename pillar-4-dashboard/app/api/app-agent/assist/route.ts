export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { assistAppAgent, type AgentChatTurn } from "@/lib/app-agent-assist";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";

function isTurn(v: unknown): v is AgentChatTurn {
  if (!v || typeof v !== "object") return false;
  const t = v as AgentChatTurn;
  return (t.role === "user" || t.role === "assistant") && typeof t.text === "string";
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    appId?: string;
    message?: string;
    history?: unknown[];
    config?: Record<string, unknown>;
    skillId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.appId || !isValidAppId(body.appId)) {
    return Response.json({ error: "Invalid appId" }, { status: 400 });
  }

  const result = await assistAppAgent({
    appId: body.appId as OotbAppId,
    message: typeof body.message === "string" ? body.message : "",
    history: Array.isArray(body.history) ? body.history.filter(isTurn) : [],
    config: body.config,
    skillId: body.skillId,
  });

  return Response.json(result);
}
