import "server-only";

import { probeEno2Health } from "@/lib/eno2-health";
import { isPrivacyAcknowledged } from "@/lib/onboarding";
import { PRIVACY_EGRESS_MESSAGE } from "@/lib/privacy-messages";
import { readUserSettings } from "@/lib/user-settings";

export { PRIVACY_EGRESS_MESSAGE };

export interface EgressState {
  paused: boolean;
  privacyBlocked: boolean;
  eno2Down: boolean;
  reason: string;
}

/** Combined eno2 health + operator privacy ack for UI and API gates. */
export async function resolveEgressState(): Promise<EgressState> {
  const settings = await readUserSettings();
  if (!isPrivacyAcknowledged(settings.operatorProfile)) {
    return {
      paused: true,
      privacyBlocked: true,
      eno2Down: false,
      reason: PRIVACY_EGRESS_MESSAGE,
    };
  }

  const probe = await probeEno2Health();
  return {
    paused: probe.down,
    privacyBlocked: false,
    eno2Down: probe.down,
    reason: probe.reason,
  };
}

/** Returns a 403 Response when outbound connector actions must be blocked. */
export async function privacyEgressDeniedResponse(): Promise<Response | null> {
  const state = await resolveEgressState();
  if (!state.privacyBlocked) return null;
  return Response.json(
    { error: "privacy_required", detail: state.reason },
    { status: 403 },
  );
}
