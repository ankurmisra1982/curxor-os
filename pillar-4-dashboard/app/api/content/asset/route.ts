export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readAssetFile } from "@/lib/content-assets-store";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const file = url.searchParams.get("file");
  if (!file) {
    return Response.json({ error: "file query required" }, { status: 400 });
  }

  const asset = await readAssetFile(file);
  if (!asset) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(asset.buf), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
