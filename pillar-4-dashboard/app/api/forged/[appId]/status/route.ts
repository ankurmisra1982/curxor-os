export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  armForgedCapitalRule,
  createForgedCapitalRule,
  fetchForgedCapitalStatus,
  researchForgedTicker,
  seedForgedCapitalDemoIfEmpty,
} from "@/lib/forged-capital-store";
import {
  createForgedSequence,
  fetchForgedWorkStatus,
  seedForgedWorkDemoIfEmpty,
  sendForgedSequenceStep,
  upsertForgedLead,
} from "@/lib/forged-work-store";
import {
  fetchForgedCreatorStatus,
  scheduleForgedPost,
  seedForgedCreatorDemoIfEmpty,
  upsertForgedDraftPost,
} from "@/lib/forged-creator-store";
import type { ForgedCreatorPlatform } from "@/lib/forged-creator-types";
import type { ForgedCapitalAction } from "@/lib/forged-capital-types";
import { getForgedAppById } from "@/lib/forged-apps-store";
import type { ForgedAppRecord } from "@/lib/forged-apps-types";
import { requireLanAuth } from "@/lib/lan-auth";
import { isForgedAppId } from "@/lib/workspace-app-id";
import type { ForgeTemplateId } from "@/lib/forge-templates";

type RouteParams = { params: Promise<{ appId: string }> };

const DESK_TEMPLATES = new Set<ForgeTemplateId>(["work-desk", "creator-desk", "capital-desk"]);

async function resolveForgedAppRecord(appId: string): Promise<
  | { record: ForgedAppRecord }
  | { error: string; status: 400 | 404 }
> {
  if (!isForgedAppId(appId)) return { error: "Invalid forged app id", status: 400 };
  const record = await getForgedAppById(appId);
  if (!record) return { error: "Forged app not found", status: 404 };
  if (record.status === "archived") return { error: "Forged app is archived", status: 400 };
  return { record };
}

async function resolveForgedDesk(appId: string): Promise<
  | { record: ForgedAppRecord }
  | { error: string; status: 400 | 404 }
> {
  const resolved = await resolveForgedAppRecord(appId);
  if ("error" in resolved) return resolved;
  if (!DESK_TEMPLATES.has(resolved.record.templateId as ForgeTemplateId)) {
    return {
      error: `Desk API only available for work-desk, creator-desk, and capital-desk (got ${resolved.record.templateId})`,
      status: 400,
    };
  }
  return resolved;
}

async function fetchDeskStatus(appId: string, templateId: string) {
  if (templateId === "work-desk") return fetchForgedWorkStatus(appId);
  if (templateId === "creator-desk") return fetchForgedCreatorStatus(appId);
  return fetchForgedCapitalStatus(appId);
}

async function seedDeskDemo(appId: string, templateId: string) {
  if (templateId === "work-desk") return seedForgedWorkDemoIfEmpty(appId);
  if (templateId === "creator-desk") return seedForgedCreatorDemoIfEmpty(appId);
  return seedForgedCapitalDemoIfEmpty(appId);
}

export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { appId } = await params;
  const resolved = await resolveForgedDesk(appId);
  if ("error" in resolved) {
    return Response.json({ ok: false, error: resolved.error }, { status: resolved.status });
  }

  const status = await fetchDeskStatus(appId, resolved.record.templateId);
  return Response.json(
    { ok: true, templateId: resolved.record.templateId, status },
    { headers: { "Cache-Control": "no-store" } },
  );
}

interface ForgedDeskPostBody {
  action?: string;
  name?: string;
  email?: string;
  company?: string;
  leadId?: string;
  sequenceId?: string;
  sequenceName?: string;
  postId?: string;
  draftText?: string;
  channel?: string;
  platform?: string;
  scheduledAt?: string;
  ticker?: string;
  note?: string;
  asset?: string;
  ruleId?: string;
  conditionType?: string;
  ruleAction?: string;
  qty?: number;
}

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const { appId } = await params;

  let body: ForgedDeskPostBody;
  try {
    body = (await request.json()) as ForgedDeskPostBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "publish_context") {
    const resolved = await resolveForgedAppRecord(appId);
    if ("error" in resolved) {
      return Response.json({ ok: false, error: resolved.error }, { status: resolved.status });
    }
    const { publishForgedDeskContext } = await import("@/lib/forged-context-mesh");
    try {
      const key = await publishForgedDeskContext(resolved.record);
      return Response.json({ ok: true, publishedKey: key });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      return Response.json({ ok: false, error: message }, { status: 400 });
    }
  }

  const resolved = await resolveForgedDesk(appId);
  if ("error" in resolved) {
    return Response.json({ ok: false, error: resolved.error }, { status: resolved.status });
  }

  const templateId = resolved.record.templateId;

  if (action === "dashboard_bootstrap") {
    await seedDeskDemo(appId, templateId);
    const status = await fetchDeskStatus(appId, templateId);
    return Response.json({ ok: true, status });
  }

  if (templateId === "work-desk") {
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

    if (action === "send_sequence_step") {
      const sequenceId = typeof body.sequenceId === "string" ? body.sequenceId.trim() : undefined;
      const result = await sendForgedSequenceStep(appId, { sequenceId });
      if (!result) {
        return Response.json(
          { ok: false, error: "No sendable sequence step — draft a sequence first" },
          { status: 400 },
        );
      }
      const { ingestForgedDeskCafeEvent } = await import("@/lib/claw-cafe-events");
      void ingestForgedDeskCafeEvent({
        forgedAppId: appId,
        deskLabel: resolved.record.name,
        action: "send_sequence_step",
        detail: "Sequence step sent",
      });
      const status = await fetchForgedWorkStatus(appId);
      return Response.json({ ok: true, send: result.send, sequence: result.sequence, status });
    }
  }

  if (templateId === "creator-desk") {
    if (action === "draft_post") {
      const draftText = typeof body.draftText === "string" ? body.draftText : "";
      if (!draftText.trim()) {
        return Response.json({ ok: false, error: "draftText required" }, { status: 400 });
      }
      const post = await upsertForgedDraftPost(appId, {
        postId: typeof body.postId === "string" ? body.postId : undefined,
        draftText,
        channel: typeof body.channel === "string" ? body.channel : undefined,
        platform: typeof body.platform === "string" ? (body.platform as ForgedCreatorPlatform) : undefined,
      });
      const status = await fetchForgedCreatorStatus(appId);
      return Response.json({ ok: true, post, status });
    }

    if (action === "schedule_post") {
      const postId = typeof body.postId === "string" ? body.postId.trim() : "";
      if (!postId) {
        return Response.json({ ok: false, error: "postId required" }, { status: 400 });
      }
      const post = await scheduleForgedPost(appId, {
        postId,
        scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : undefined,
      });
      if (!post) {
        return Response.json({ ok: false, error: "Post not found" }, { status: 404 });
      }
      const { ingestForgedDeskCafeEvent } = await import("@/lib/claw-cafe-events");
      void ingestForgedDeskCafeEvent({
        forgedAppId: appId,
        deskLabel: resolved.record.name,
        action: "schedule_post",
        detail: `Scheduled · ${post.channel}`,
      });
      const status = await fetchForgedCreatorStatus(appId);
      return Response.json({ ok: true, post, status });
    }
  }

  if (templateId === "capital-desk") {
    if (action === "research_ticker") {
      const ticker = typeof body.ticker === "string" ? body.ticker.trim() : "";
      if (!ticker) {
        return Response.json({ ok: false, error: "ticker required" }, { status: 400 });
      }
      const watch = await researchForgedTicker(appId, {
        ticker,
        note: typeof body.note === "string" ? body.note : undefined,
      });
      const status = await fetchForgedCapitalStatus(appId);
      return Response.json({ ok: true, watch, status });
    }

    if (action === "create_rule") {
      const asset = typeof body.asset === "string" ? body.asset.trim() : "";
      if (!asset) {
        return Response.json({ ok: false, error: "asset required" }, { status: 400 });
      }
      const rule = await createForgedCapitalRule(appId, {
        name: typeof body.name === "string" ? body.name : "",
        asset,
        conditionType: typeof body.conditionType === "string" ? body.conditionType : undefined,
        action: body.ruleAction === "sell" ? "sell" : ("buy" as ForgedCapitalAction),
        qty: typeof body.qty === "number" ? body.qty : undefined,
      });
      const status = await fetchForgedCapitalStatus(appId);
      return Response.json({ ok: true, rule, status });
    }

    if (action === "arm_rule") {
      const ruleId = typeof body.ruleId === "string" ? body.ruleId.trim() : "";
      if (!ruleId) {
        return Response.json({ ok: false, error: "ruleId required" }, { status: 400 });
      }
      const rule = await armForgedCapitalRule(appId, ruleId);
      if (!rule) {
        return Response.json({ ok: false, error: "Rule not found" }, { status: 404 });
      }
      const { ingestForgedDeskCafeEvent } = await import("@/lib/claw-cafe-events");
      void ingestForgedDeskCafeEvent({
        forgedAppId: appId,
        deskLabel: resolved.record.name,
        action: "arm_rule",
        detail: `Rule armed · ${rule.asset}`,
        asset: rule.asset,
      });
      const status = await fetchForgedCapitalStatus(appId);
      return Response.json({ ok: true, rule, status });
    }
  }

  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
