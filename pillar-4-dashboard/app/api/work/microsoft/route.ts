export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { getWorkMicrosoftStatus, isWorkMicrosoftConfigured } from "@/lib/work-microsoft-client";

export async function GET(): Promise<Response> {
  const status = await getWorkMicrosoftStatus();
  return Response.json({ ok: true, ...status });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = await getWorkMicrosoftStatus();

  if (body.action === "start") {
    if (!isWorkMicrosoftConfigured()) {
      return Response.json({
        ok: true,
        demo: true,
        message: "Microsoft 365 OAuth scaffold — set MICROSOFT_CLIENT_ID + MICROSOFT_CLIENT_SECRET in digital.env",
        status,
      });
    }
    return Response.json({
      ok: false,
      error: "M365 OAuth flow ships in next milestone — use demo mail preview via morning brief",
    });
  }

  if (body.action === "unlink") {
    return Response.json({ ok: true, linked: false, demo: true });
  }

  return Response.json({ ok: true, ...status });
}
