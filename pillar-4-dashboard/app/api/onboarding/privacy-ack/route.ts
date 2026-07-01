export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { acknowledgeOperatorPrivacy } from "@/lib/onboarding";
import { readUserSettings, updateUserSettings } from "@/lib/user-settings";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { defer?: boolean } = {};
  try {
    const raw = await request.text();
    if (raw.trim()) body = JSON.parse(raw) as { defer?: boolean };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.defer === true) {
    const settings = await readUserSettings();
    await updateUserSettings({
      operatorProfile: {
        ...settings.operatorProfile,
        privacyDeferred: true,
      },
    });
    return Response.json({ ok: true, privacyAcknowledged: false, privacyDeferred: true });
  }

  await acknowledgeOperatorPrivacy();
  return Response.json({ ok: true, privacyAcknowledged: true, privacyDeferred: false });
}
