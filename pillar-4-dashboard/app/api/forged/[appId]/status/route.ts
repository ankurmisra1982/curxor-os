export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  createForgedSequence,
  fetchForgedWorkStatus,
  seedForgedWorkDemoIfEmpty,
  upsertForgedLead,
} from "@/lib/forged-work-store";
import { getForgedAppById } from "@/lib/forged-apps-store";
import { requireLanAuth } from "@/lib/lan-auth";
import { isForgedAppId } from "@/lib/workspace-app-id";

type RouteParams = { params: Promise<{ appId: string }> };

async function resolveWorkDesk(appId: string) {
  if (!isForgedAppId(appId)) return { error: "Invalid forged app id", status: 400 as const };
  const record = await getForgedAppById(appId);
  if (!record) return { error: "Forged app not found", status: 404 as const };
  if (record.templateId !== "work-desk") {
    return { error: "Work desk API only available for work-desk template", status: 400 as const };
  }
  return { record };
}

export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { appId } = await params;
  const resolved = await resolveWorkDesk(appId);
  if ("error" in resolved) {
    return Response.json({ ok: false, error: resolved.error }, { status: resolved.status });
  }
  const status = await fetchForgedWorkStatus(appId);
  return Response.json({ ok: true, status }, { headers: { "Cache-Control": "no-store" } });
}

interface ForgedWorkPostBody {
  action?: string;
  name?: string;
  email?: string;
  company?: string;
  leadId?: string;
  sequenceName?: string;
}

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const { appId } = await params;
  const resolved = await resolveWorkDesk(appId);
  if ("error" in resolved) {
    return Response.json({ ok: false, error: resolved.error }, { status: resolved.status });
  }

  let body: ForgedWorkPostBody;
  try {
    body = (await request.json()) as ForgedWorkPostBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "dashboard_bootstrap") {
    await seedForgedWorkDemoIfEmpty(appId);
    const status = await fetchForgedWorkStatus(appId);
    return Response.json({ ok: true, status });
  }

  if (action === "create_lead") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!name || !email) {
      return Response.json({ ok: false, error: "name and email required" }, { status: 400 });
    }
    const lead = await upsertForgedLead(appId, {
      name,
      email,
      company: typeof body.company === "string" ? body.company : undefined,
    });
    const status = await fetchForgedWorkStatus(appId);
    return Response.json({ ok: true, lead, status });
  }

  if (action === "draft_sequence") {
    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
    if (!leadId) {
      return Response.json({ ok: false, error: "leadId required" }, { status: 400 });
    }
    const sequence = await createForgedSequence(appId, {
      leadId,
      name: typeof body.sequenceName === "string" ? body.sequenceName : undefined,
    });
    if (!sequence) {
      return Response.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }
    const status = await fetchForgedWorkStatus(appId);
    return Response.json({ ok: true, sequence, status });
  }

  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
