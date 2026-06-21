export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { listFamilyProfiles, removeFamilyProfile, upsertFamilyProfile } from "@/lib/family-profiles";
import { syncFamilyContextToMesh } from "@/lib/claw-context-service";
import { requireLanAuth } from "@/lib/lan-auth";
import type { FamilyProfile } from "@/lib/family-types";

export async function GET(): Promise<Response> {
  const data = await listFamilyProfiles();
  return Response.json({ ok: true, ...data });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: Partial<FamilyProfile> & { action?: string; profileId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "delete" && body.profileId) {
    await removeFamilyProfile(body.profileId);
    await syncFamilyContextToMesh();
    return Response.json({ ok: true });
  }

  if (!body.displayName || typeof body.displayName !== "string") {
    return Response.json({ error: "displayName required" }, { status: 400 });
  }

  const member = await upsertFamilyProfile({
    ...body,
    displayName: body.displayName,
  });
  await syncFamilyContextToMesh();
  return Response.json({ ok: true, member });
}
