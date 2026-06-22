export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { syncHubSpotLeads } from "@/lib/work-hubspot-sync";
import { fetchWorkStatus } from "@/lib/work-store";

export async function GET(): Promise<Response> {
  const { hubspotPreviewContacts } = await import("@/lib/work-hubspot-client");
  const preview = await hubspotPreviewContacts(5);
  return Response.json({ ...preview, status: await fetchWorkStatus() });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "sync" || body.action === "sync_hubspot" || !body.action) {
    const result = await syncHubSpotLeads();
    return Response.json({ ...result, status: await fetchWorkStatus() });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
