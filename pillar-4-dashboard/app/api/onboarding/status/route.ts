export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { isWelcomeCompleted, isPrivacyAcknowledged } from "@/lib/onboarding";
import { readUserSettings } from "@/lib/user-settings";

export async function GET(): Promise<Response> {
  const settings = await readUserSettings();
  const profile = settings.operatorProfile;
  return Response.json(
    {
      welcomeCompleted: isWelcomeCompleted(profile),
      privacyAcknowledged: isPrivacyAcknowledged(profile),
      privacyDeferred: profile?.privacyDeferred === true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
