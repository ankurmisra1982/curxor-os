export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { decodeTrackedClickToken } from "@/lib/content-utm";
import { recordClick } from "@/lib/content-click-store";
import { getContentPost } from "@/lib/content-queue-store";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("c");
  if (!token) {
    return Response.json({ error: "Missing click token" }, { status: 400 });
  }

  const decoded = decodeTrackedClickToken(token);
  if (!decoded) {
    return Response.json({ error: "Invalid click token" }, { status: 400 });
  }

  const post = await getContentPost(decoded.postId);
  await recordClick({
    postId: decoded.postId,
    platform: post?.platform ?? "unknown",
    destination: decoded.to,
    utmCampaign: post?.utmCampaign ?? post?.campaignId ?? null,
    userAgent: request.headers.get("user-agent"),
  });

  return Response.redirect(decoded.to, 302);
}
