export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { assistPatron } from "@/lib/patron-assist";
import { appendPatronTurn, readPatronHistory } from "@/lib/patron-session";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";

export async function POST(request: Request): Promise<Response> {
  let body: {
    message?: string;
    routeAppId?: string | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  const routeAppId =
    body.routeAppId && isValidAppId(body.routeAppId) ? (body.routeAppId as OotbAppId) : null;

  const priorHistory = await readPatronHistory();
  const result = await assistPatron({ message, history: priorHistory, routeAppId });

  await appendPatronTurn({ role: "user", text: message });
  await appendPatronTurn({ role: "assistant", text: result.reply });

  return Response.json({
    reply: result.reply,
    inference: result.inference,
    routeAppId: result.routeAppId ?? routeAppId,
  });
}
