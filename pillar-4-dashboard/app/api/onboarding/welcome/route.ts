export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { completeWelcomeWizard } from "@/lib/onboarding";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    displayName?: string;
    city?: string;
    timezone?: string;
    privacyAcknowledged?: boolean;
    privacyDeferred?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName) {
    return Response.json({ error: "displayName required" }, { status: 400 });
  }

  await completeWelcomeWizard({
    displayName,
    city: typeof body.city === "string" ? body.city : undefined,
    timezone: typeof body.timezone === "string" ? body.timezone : undefined,
    privacyAcknowledged: body.privacyAcknowledged === true,
    privacyDeferred: body.privacyDeferred === true,
  });

  return Response.json({ ok: true, welcomeCompleted: true });
}
