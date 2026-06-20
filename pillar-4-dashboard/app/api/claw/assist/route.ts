export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { assistClawForge, type ForgeChatTurn } from "@/lib/claw-assist";

function isTurn(v: unknown): v is ForgeChatTurn {
  if (!v || typeof v !== "object") return false;
  const t = v as ForgeChatTurn;
  return (t.role === "user" || t.role === "assistant") && typeof t.text === "string";
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    message?: string;
    imageBase64?: string | null;
    liveVision?: boolean;
    history?: unknown[];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message : "";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : null;
  const liveVision = Boolean(body.liveVision);
  const history = Array.isArray(body.history) ? body.history.filter(isTurn) : [];

  const result = assistClawForge({ message, imageBase64, liveVision, history });
  return Response.json(result);
}
