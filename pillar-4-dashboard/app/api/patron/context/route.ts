export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { isLocalInferenceAvailable } from "@/lib/local-inference";
import { buildOsApprovalInbox } from "@/lib/os-approval-inbox";
import { getOotbApp, isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import { readUserSettings } from "@/lib/user-settings";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const routeParam = url.searchParams.get("routeAppId");
  const routeAppId =
    routeParam && isValidAppId(routeParam) ? (routeParam as OotbAppId) : null;

  const [localAvailable, settings, approvals] = await Promise.all([
    isLocalInferenceAvailable(),
    readUserSettings(),
    buildOsApprovalInbox(6),
  ]);

  const clawLabel = routeAppId ? getOotbApp(routeAppId).short : null;

  return Response.json(
    {
      routeAppId,
      clawLabel,
      inferenceAvailable: localAvailable,
      pendingApprovalsCount: approvals.total,
      patronAsk: settings.patronAsk ?? { ui: "minimized", lastReadAt: null },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
