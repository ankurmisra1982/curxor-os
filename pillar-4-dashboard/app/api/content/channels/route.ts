export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readAppFreState } from "@/lib/app-fre-state";
import { fetchCreatorChannelStatuses, fetchSocialChannelStatuses } from "@/lib/content-channels-status";
import { SOCIAL_BRIDGE_ROADMAP, currentBuildStep } from "@/lib/social-bridge-roadmap";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "creator";

  const fre = await readAppFreState("my-content-creator");
  const channels = Array.isArray(fre.config.channels)
    ? fre.config.channels.filter((x): x is string => typeof x === "string")
    : [];

  if (scope === "all") {
    const platforms = await fetchSocialChannelStatuses(channels);
    return Response.json(
      { ok: true, platforms, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const vault = await fetchCreatorChannelStatuses(channels);
  return Response.json(
    {
      ok: true,
      ...vault,
      roadmap: SOCIAL_BRIDGE_ROADMAP,
      currentStep: currentBuildStep(),
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
