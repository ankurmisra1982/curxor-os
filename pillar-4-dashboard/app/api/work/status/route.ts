export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { readAppFreState, writeAppFreState } from "@/lib/app-fre-state";
import { parseDigitalReceipt } from "@/lib/digital-protocol";
import { syncCrmBothWays, getCrmStatus } from "@/lib/work-crm-sync";
import { fetchWorkCalendarPreview, fetchWorkMailPreview } from "@/lib/work-google-client";
import { buildDayBrief, draftReplyWithLlm, draftSequenceWithLlm } from "@/lib/work-inference";
import { enrichLead } from "@/lib/work-lead-enrichment";
import { bookMeeting } from "@/lib/work-calcom";
import { hubspotPreviewContacts } from "@/lib/work-hubspot-client";
import { pullNotionLeads } from "@/lib/work-notion-sync";
import { appendAgentAudit } from "@/lib/work-agent-audit";
import { emitWorkWebhook } from "@/lib/work-webhook-emitter";
import { buildMorningBrief, buildPrepMeetingBrief } from "@/lib/work-morning-brief";
import { pushLeadNotesToNotion } from "@/lib/work-notion-client";
import { sendSlackDigest } from "@/lib/work-slack-digest";
import { notifySlackInterestedReply } from "@/lib/work-slack-notify";
import { buildWorkGoLiveReport } from "@/lib/work-go-live";
import { applyTemplatePack, MINI_SEQUENCE_PRESETS } from "@/lib/work-template-packs";
import { handleWorkEmailReceipt } from "@/lib/work-receipt-handler";
import { resolveAutoSendOnActivate, readWorkSendPolicy, type AutoSendPolicy } from "@/lib/work-send-policy";
import {
  executeOutboundSend,
  processDueSequenceSteps,
  sendSequenceStep,
} from "@/lib/work-send-executor";
import {
  activateSequence,
  appendWorkSyncLog,
  approveSend,
  assignMailToLead,
  createSequence,
  createTask,
  deferSequenceStepSend,
  ensureWorkQueue,
  fetchWorkStatus,
  getLead,
  getSequenceNextDueAt,
  importLeadsFromCsv,
  isWorkEmailBridgeConfigured,
  markSequenceReplied,
  pauseSequence,
  rejectSend,
  scanLocalMailQueue,
  tagMailReplyIntent,
  toggleTaskDone,
  trackSendOpen,
  updateLeadStage,
  upsertLead,
} from "@/lib/work-store";
import type { LeadStage, ReplyIntent, TaskPriority } from "@/lib/work-queue-types";

export async function GET(): Promise<Response> {
  const status = await fetchWorkStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    action?: string;
    leadId?: string;
    taskId?: string;
    sequenceId?: string;
    sendId?: string;
    name?: string;
    email?: string;
    company?: string;
    title?: string;
    stage?: string;
    priority?: string;
    titleTask?: string;
    prompt?: string;
    receipt?: Record<string, unknown>;
    steps?: Array<{ subject?: string; subjectAlt?: string; body?: string; delayDays?: number }>;
    csv?: string;
    intent?: string;
    mailId?: string;
    outboundKillSwitch?: boolean;
    autoSendOnActivate?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "";

  try {
    switch (action) {
      case "bootstrap":
      case "dashboard_bootstrap": {
        await ensureWorkQueue();
        const status = await fetchWorkStatus();
        const goLive = await buildWorkGoLiveReport();
        return Response.json({ ok: true, status, goLive });
      }

      case "go_live": {
        const goLive = await buildWorkGoLiveReport();
        return Response.json({ ok: true, goLive, status: await fetchWorkStatus() });
      }

      case "run_demo_tour": {
        const { runWorkDemoTour } = await import("@/lib/work-demo-tour");
        const tour = await runWorkDemoTour();
        return Response.json({ ...tour, status: await fetchWorkStatus(), goLive: await buildWorkGoLiveReport() });
      }

      case "create_lead": {
        if (!body.name?.trim() || !body.email?.trim()) {
          return Response.json({ ok: false, error: "name and email required" }, { status: 400 });
        }
        const lead = await upsertLead({
          id: body.leadId,
          name: body.name,
          email: body.email,
          company: body.company,
          title: body.title,
          stage: body.stage as LeadStage | undefined,
        });
        return Response.json({ ok: true, lead, status: await fetchWorkStatus() });
      }

      case "update_lead_stage": {
        if (!body.leadId || !body.stage) {
          return Response.json({ ok: false, error: "leadId and stage required" }, { status: 400 });
        }
        const lead = await updateLeadStage(body.leadId, body.stage as LeadStage);
        return Response.json({ ok: true, lead, status: await fetchWorkStatus() });
      }

      case "create_task": {
        if (!body.titleTask?.trim()) {
          return Response.json({ ok: false, error: "title required" }, { status: 400 });
        }
        const task = await createTask(
          body.titleTask,
          (body.priority as TaskPriority) ?? "P2",
          body.leadId,
        );
        return Response.json({ ok: true, task, status: await fetchWorkStatus() });
      }

      case "toggle_task": {
        if (!body.taskId) return Response.json({ ok: false, error: "taskId required" }, { status: 400 });
        const task = await toggleTaskDone(body.taskId);
        return Response.json({ ok: true, task, status: await fetchWorkStatus() });
      }

      case "create_sequence": {
        if (!body.leadId) return Response.json({ ok: false, error: "leadId required" }, { status: 400 });
        const sequence = await createSequence({
          name: body.name ?? "New sequence",
          leadId: body.leadId,
          steps: body.steps,
        });
        return Response.json({ ok: true, sequence, status: await fetchWorkStatus() });
      }

      case "draft_sequence": {
        const draft = await draftSequenceWithLlm({
          leadId: body.leadId,
          prompt: body.prompt,
          name: body.name,
        });
        return Response.json({ ok: true, ...draft, status: await fetchWorkStatus() });
      }

      case "activate_sequence": {
        if (!body.sequenceId) {
          return Response.json({ ok: false, error: "sequenceId required" }, { status: 400 });
        }
        const bridgeConfigured = await isWorkEmailBridgeConfigured();
        const autoSendEnabled = await resolveAutoSendOnActivate(bridgeConfigured);
        const sequence = await activateSequence(body.sequenceId);
        let autoSendPolicy: AutoSendPolicy = "deferred";
        let nextDueAt: string | null = null;
        let send;

        if (autoSendEnabled) {
          const sendResult = await sendSequenceStep(body.sequenceId);
          send = sendResult.send;
          autoSendPolicy = sendResult.ok ? "immediate" : "deferred";
          nextDueAt = sendResult.ok ? null : await getSequenceNextDueAt(body.sequenceId);
        } else {
          const policy = await readWorkSendPolicy();
          const delayMs = policy.sendStaggerMinutes > 0 ? policy.sendStaggerMinutes * 60_000 : 0;
          nextDueAt = await deferSequenceStepSend(body.sequenceId, delayMs);
          autoSendPolicy = "deferred";
        }

        return Response.json({
          ok: true,
          sequence,
          send,
          autoSendPolicy,
          nextDueAt,
          status: await fetchWorkStatus(),
        });
      }

      case "pause_sequence": {
        if (!body.sequenceId) {
          return Response.json({ ok: false, error: "sequenceId required" }, { status: 400 });
        }
        const sequence = await pauseSequence(body.sequenceId);
        return Response.json({ ok: true, sequence, status: await fetchWorkStatus() });
      }

      case "mark_replied": {
        if (!body.sequenceId) {
          return Response.json({ ok: false, error: "sequenceId required" }, { status: 400 });
        }
        const sequence = await markSequenceReplied(body.sequenceId);
        return Response.json({ ok: true, sequence, status: await fetchWorkStatus() });
      }

      case "send_step": {
        if (!body.sequenceId) {
          return Response.json({ ok: false, error: "sequenceId required" }, { status: 400 });
        }
        const result = await sendSequenceStep(body.sequenceId);
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "send_now": {
        if (!body.sendId) return Response.json({ ok: false, error: "sendId required" }, { status: 400 });
        const result = await executeOutboundSend(body.sendId);
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "process_due": {
        const processed = await processDueSequenceSteps();
        return Response.json({ ok: true, processed, status: await fetchWorkStatus() });
      }

      case "import_leads": {
        if (!body.csv?.trim()) {
          return Response.json({ ok: false, error: "csv required" }, { status: 400 });
        }
        const result = await importLeadsFromCsv(body.csv);
        return Response.json({ ok: true, ...result, status: await fetchWorkStatus() });
      }

      case "tag_reply_intent": {
        if (!body.mailId || !body.intent) {
          return Response.json({ ok: false, error: "mailId and intent required" }, { status: 400 });
        }
        const entry = await tagMailReplyIntent(body.mailId, body.intent as ReplyIntent);
        if (!entry) return Response.json({ ok: false, error: "Mail entry not found" }, { status: 404 });
        if (body.intent === "interested" && entry.leadId) {
          const lead = await getLead(entry.leadId);
          if (lead) await notifySlackInterestedReply(lead, entry.subject);
        }
        return Response.json({ ok: true, entry, status: await fetchWorkStatus() });
      }

      case "track_open": {
        if (!body.sendId) return Response.json({ ok: false, error: "sendId required" }, { status: 400 });
        const send = await trackSendOpen(body.sendId);
        if (!send) return Response.json({ ok: false, error: "Send not found" }, { status: 404 });
        return Response.json({ ok: true, send, status: await fetchWorkStatus() });
      }

      case "analytics": {
        const status = await fetchWorkStatus();
        return Response.json({ ok: true, analytics: status.analytics, sendPolicy: status.sendPolicy, status });
      }

      case "scan_inbox": {
        const entries = await scanLocalMailQueue();
        const { pauseSequencesOnReply } = await import("@/lib/work-send-executor");
        for (const entry of entries.filter((e) => e.matchedReply && e.from)) {
          await pauseSequencesOnReply(entry.from, entry.replyIntent);
        }
        return Response.json({ ok: true, indexed: entries.length, status: await fetchWorkStatus() });
      }

      case "summarize_day": {
        const brief = await buildDayBrief();
        return Response.json({ ok: true, brief, status: await fetchWorkStatus() });
      }

      case "receipt": {
        const receipt = body.receipt ? parseDigitalReceipt(JSON.stringify(body.receipt)) : null;
        if (receipt) await handleWorkEmailReceipt(receipt);
        return Response.json({ ok: true, status: await fetchWorkStatus() });
      }

      case "recovery_list": {
        const file = await ensureWorkQueue();
        const failed = file.sends.filter((s) => s.status === "failed");
        return Response.json({ ok: true, failed, status: await fetchWorkStatus() });
      }

      case "recovery_retry": {
        if (!body.sendId) return Response.json({ ok: false, error: "sendId required" }, { status: 400 });
        const result = await executeOutboundSend(body.sendId);
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "update_send_policy": {
        const fre = await readAppFreState("my-work");
        const autoSendOnActivate =
          typeof (body as { autoSendOnActivate?: boolean }).autoSendOnActivate === "boolean"
            ? (body as { autoSendOnActivate: boolean }).autoSendOnActivate
            : undefined;
        if (autoSendOnActivate === undefined) {
          return Response.json({ ok: false, error: "autoSendOnActivate boolean required" }, { status: 400 });
        }
        await writeAppFreState("my-work", {
          ...fre,
          config: { ...fre.config, autoSendOnActivate },
        });
        return Response.json({ ok: true, status: await fetchWorkStatus() });
      }

      case "google_mail_preview": {
        const preview = await fetchWorkMailPreview();
        return Response.json({ ok: true, ...preview, status: await fetchWorkStatus() });
      }

      case "google_calendar_preview": {
        const preview = await fetchWorkCalendarPreview();
        return Response.json({ ok: true, ...preview, status: await fetchWorkStatus() });
      }

      case "morning_brief": {
        const brief = await buildMorningBrief();
        return Response.json({ ok: true, brief, status: await fetchWorkStatus() });
      }

      case "prep_meeting": {
        const brief = await buildPrepMeetingBrief(body.email);
        return Response.json({ ok: true, brief, status: await fetchWorkStatus() });
      }

      case "sync_notion_lead": {
        if (!body.leadId) return Response.json({ ok: false, error: "leadId required" }, { status: 400 });
        const lead = await getLead(body.leadId);
        if (!lead) return Response.json({ ok: false, error: "Lead not found" }, { status: 404 });
        const result = await pushLeadNotesToNotion({
          leadName: lead.name,
          leadEmail: lead.email,
          notes: lead.notes || `Stage: ${lead.stage}`,
        });
        await appendWorkSyncLog({
          connector: "notion",
          action: "sync_notion_lead",
          detail: result.detail,
        });
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "slack_digest": {
        const result = await sendSlackDigest();
        await appendWorkSyncLog({
          connector: "slack",
          action: "slack_digest",
          detail: result.detail,
        });
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "crm_status": {
        const crm = await getCrmStatus();
        return Response.json({ ok: true, crm, status: await fetchWorkStatus() });
      }

      case "sync_crm": {
        const sync = await syncCrmBothWays();
        await appendAgentAudit({ kind: "sync", source: "desk", note: "sync_crm" });
        return Response.json({ ok: true, ...sync, status: await fetchWorkStatus() });
      }

      case "assign_mail_to_lead": {
        if (!body.mailId || !body.leadId) {
          return Response.json({ ok: false, error: "mailId and leadId required" }, { status: 400 });
        }
        const entry = await assignMailToLead(body.mailId, body.leadId);
        if (!entry) return Response.json({ ok: false, error: "Mail entry not found" }, { status: 404 });
        return Response.json({ ok: true, entry, status: await fetchWorkStatus() });
      }

      case "draft_reply": {
        const draft = await draftReplyWithLlm({
          mailId: body.mailId,
          leadId: body.leadId,
          prompt: body.prompt,
        });
        return Response.json({ ok: true, ...draft, status: await fetchWorkStatus() });
      }

      case "enrich_lead": {
        if (!body.leadId) return Response.json({ ok: false, error: "leadId required" }, { status: 400 });
        const result = await enrichLead(body.leadId);
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "book_meeting": {
        const lead = body.leadId ? await getLead(body.leadId) : null;
        if (!lead) return Response.json({ ok: false, error: "leadId required" }, { status: 400 });
        const result = await bookMeeting({
          leadEmail: lead.email,
          leadName: lead.name,
          slotHint: body.prompt,
        });
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "approve_send": {
        if (!body.sendId) return Response.json({ ok: false, error: "sendId required" }, { status: 400 });
        const approved = await approveSend(body.sendId);
        if (!approved) return Response.json({ ok: false, error: "Send not pending approval" }, { status: 404 });
        const result = await executeOutboundSend(body.sendId);
        await appendAgentAudit({
          kind: "approval",
          source: "desk",
          sendId: body.sendId,
          note: "approve_send",
        });
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "reject_send": {
        if (!body.sendId) return Response.json({ ok: false, error: "sendId required" }, { status: 400 });
        const rejected = await rejectSend(body.sendId);
        if (!rejected) return Response.json({ ok: false, error: "Send not found" }, { status: 404 });
        await appendAgentAudit({
          kind: "approval",
          source: "desk",
          sendId: body.sendId,
          note: "reject_send",
        });
        return Response.json({ ok: true, send: rejected, status: await fetchWorkStatus() });
      }

      case "hubspot_preview": {
        const preview = await hubspotPreviewContacts();
        return Response.json({ ...preview, status: await fetchWorkStatus() });
      }

      case "pull_notion_leads": {
        const pull = await pullNotionLeads();
        await appendWorkSyncLog({
          connector: "notion",
          action: "pull_notion_leads",
          detail: `imported=${pull.imported} demo=${pull.demo}`,
        });
        return Response.json({ ok: true, ...pull, status: await fetchWorkStatus() });
      }

      case "set_outbound_kill_switch": {
        const fre = await readAppFreState("my-work");
        const enabled = (body as { outboundKillSwitch?: boolean }).outboundKillSwitch === true;
        await writeAppFreState("my-work", {
          ...fre,
          config: { ...fre.config, outboundKillSwitch: enabled },
        });
        await appendAgentAudit({
          kind: "kill_switch",
          source: "desk",
          note: enabled ? "Outbound kill switch ON" : "Outbound kill switch cleared",
        });
        return Response.json({ ok: true, outboundKillSwitch: enabled, status: await fetchWorkStatus() });
      }

      case "webhook_test": {
        const result = await emitWorkWebhook("lead.stage_changed", { test: true, leadId: body.leadId ?? "test" });
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "get_growth_profile": {
        const status = await fetchWorkStatus();
        return Response.json({ ok: true, growthProfile: status.growthProfile, status });
      }

      case "apply_template_pack": {
        const packId = typeof (body as { packId?: string }).packId === "string"
          ? (body as { packId: string }).packId
          : "";
        try {
          const result = await applyTemplatePack(packId);
          return Response.json({ ok: true, ...result, status: await fetchWorkStatus() });
        } catch (err) {
          const message = err instanceof Error ? err.message : "apply_template_pack failed";
          return Response.json({ ok: false, error: message }, { status: 400 });
        }
      }

      case "create_mini_sequence": {
        const leadId = body.leadId ?? "";
        const presetId = typeof (body as { presetId?: string }).presetId === "string"
          ? (body as { presetId: string }).presetId
          : MINI_SEQUENCE_PRESETS[0]?.id ?? "";
        const lead = leadId ? await getLead(leadId) : null;
        if (!lead) {
          return Response.json({ ok: false, error: "Lead not found" }, { status: 400 });
        }
        const preset = MINI_SEQUENCE_PRESETS.find((p) => p.id === presetId) ?? MINI_SEQUENCE_PRESETS[0];
        const seq = await createSequence({
          name: `${preset.label} · ${lead.name}`,
          leadId: lead.id,
          steps: preset.steps.map((s) => ({
            subject: s.subject,
            body: s.body,
            delayDays: s.delayDays,
          })),
        });
        return Response.json({ ok: true, sequenceId: seq.id, status: await fetchWorkStatus() });
      }

      default:
        return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
