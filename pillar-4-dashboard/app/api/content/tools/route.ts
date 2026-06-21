export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  createContentPost,
  getContentPost,
  markPostSubmitted,
  scheduleContentPost,
} from "@/lib/content-queue-store";
import { publishDigitalIntent } from "@/lib/mesh-publish";
import { buildDigitalIntent } from "@/lib/content-tools-bridge";
import { requireLanAuth } from "@/lib/lan-auth";
import { isSocialPlatform, type SocialPlatformId } from "@/lib/social-channels";

/** Agent-facing content tools (MCP-compatible JSON actions). */
export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    tool?: string;
    arguments?: Record<string, unknown>;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tool = body.tool;
  const args = body.arguments ?? {};

  switch (tool) {
    case "content.create": {
      const platform = args.platform;
      if (typeof platform !== "string" || !isSocialPlatform(platform)) {
        return Response.json({ error: "Valid platform required" }, { status: 400 });
      }
      const post = await createContentPost({
        channel: typeof args.channel === "string" ? args.channel : `${platform} post`,
        platform: platform as SocialPlatformId,
        draftText: typeof args.draftText === "string" ? args.draftText : "",
      });
      return Response.json({ ok: true, post });
    }

    case "content.schedule": {
      const postId = typeof args.postId === "string" ? args.postId : "";
      if (!postId) return Response.json({ error: "postId required" }, { status: 400 });
      const post = await scheduleContentPost(
        postId,
        typeof args.scheduledAt === "string" ? args.scheduledAt : undefined,
      );
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      return Response.json({ ok: true, post });
    }

    case "content.publish": {
      const postId = typeof args.postId === "string" ? args.postId : "";
      if (!postId) return Response.json({ error: "postId required" }, { status: 400 });
      const post = await getContentPost(postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const config = { selectedPostId: postId, contentTone: args.tone ?? "technical" };
      const digital = await buildDigitalIntent(config);
      if (!digital) return Response.json({ error: "Post not publish-ready" }, { status: 400 });
      const result = await publishDigitalIntent(digital);
      if (result.ok) await markPostSubmitted(postId, result.id);
      return Response.json({ ok: result.ok, result, postId });
    }

    case "content.list_tools":
      return Response.json({
        ok: true,
        tools: [
          { name: "content.create", description: "Create a queue post" },
          { name: "content.schedule", description: "Schedule post for publish" },
          { name: "content.publish", description: "Publish post via digital bridge" },
        ],
      });

    default:
      return Response.json({ error: "Unknown tool — try content.list_tools" }, { status: 400 });
  }
}

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    tools: ["content.create", "content.schedule", "content.publish", "content.list_tools"],
    endpoint: "/api/content/tools",
  });
}
