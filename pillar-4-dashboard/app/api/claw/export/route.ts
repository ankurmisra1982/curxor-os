export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { exportClawBundle, exportFleetBundles } from "@/lib/forge-export";
import { requireLanAuth } from "@/lib/lan-auth";

interface ExportBody {
  forgedAppId?: string;
  profileId?: string;
  exportAll?: boolean;
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: ExportBody;
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.exportAll) {
    const fleet = await exportFleetBundles();
    return Response.json({
      ok: true,
      manifest: {
        count: fleet.bundles.length,
        errors: fleet.errors,
      },
      bundles: fleet.bundles,
    });
  }

  const result = await exportClawBundle({
    forgedAppId: body.forgedAppId,
    profileId: body.profileId,
  });

  if ("error" in result) {
    return Response.json({ ok: false, error: result.error }, { status: 404 });
  }

  return Response.json({ ok: true, bundle: result });
}
