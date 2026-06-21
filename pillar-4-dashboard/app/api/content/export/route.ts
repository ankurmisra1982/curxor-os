export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildContentExportBundle, readExportFile } from "@/lib/content-export";
import { requireLanAuth } from "@/lib/lan-auth";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const { manifestPath, archivePath } = await buildContentExportBundle();
  if (!archivePath) {
    return Response.json({ ok: true, manifestPath });
  }

  const rel = path.relative(
    process.env.CURXOR_CONTENT_EXPORT_PATH ?? "/tmp/curxor-content-exports",
    archivePath,
  );

  return Response.json({
    ok: true,
    manifestPath,
    downloadPath: `/api/content/export?file=${encodeURIComponent(rel.replace(/\\/g, "/"))}`,
  });
}

export async function GET(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const file = new URL(request.url).searchParams.get("file");
  if (!file) {
    return Response.json({ error: "file query required" }, { status: 400 });
  }

  const buf = await readExportFile(file);
  if (!buf) return Response.json({ error: "Not found" }, { status: 404 });

  const contentType = file.endsWith(".gz")
    ? "application/gzip"
    : file.endsWith(".tar.gz")
      ? "application/gzip"
      : "application/json";

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${path.basename(file)}"`,
    },
  });
}
