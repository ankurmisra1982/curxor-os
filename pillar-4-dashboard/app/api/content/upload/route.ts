export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { saveUploadedMedia } from "@/lib/content-assets-store";
import { savePostMedia } from "@/lib/content-queue-store";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const postId = form.get("postId");
  const kind = form.get("kind");
  const file = form.get("file");

  if (typeof postId !== "string" || !postId.trim()) {
    return Response.json({ error: "postId required" }, { status: 400 });
  }
  if (kind !== "image" && kind !== "video") {
    return Response.json({ error: "kind must be image or video" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "file required" }, { status: 400 });
  }

  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    return Response.json({ error: `File too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)` }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const saved = await saveUploadedMedia(postId, buf, file.name, kind);
    const post = await savePostMedia(postId, saved);
    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }
    return Response.json({ ok: true, post, ...saved });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}
