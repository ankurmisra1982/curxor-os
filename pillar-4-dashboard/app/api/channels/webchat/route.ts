export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { handleWebchatMessage } from "@/lib/agent-runtime/channel-router";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import type { AgentChatTurn } from "@/lib/app-agent-types";

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

  const result = await handleWebchatMessage({
    appId: body.appId as OotbAppId,
    message: typeof body.message === "string" ? body.message : "",
    history: Array.isArray(body.history) ? body.history.filter(isTurn) : [],
    config: body.config,
    skillId: body.skillId,
  });

  return Response.json({
    reply: result.text,
    appId: result.appId,
    sessionId: result.sessionId,
    profileId: result.profileId,
    activity: result.activity,
    mesh: result.mesh,
  });
}
