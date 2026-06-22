export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { readAppFreState, writeAppFreState } from "@/lib/app-fre-state";
import { parseDigitalReceipt } from "@/lib/digital-protocol";
import { syncCrmBothWays, getCrmStatus } from "@/lib/work-crm-sync";
import { fetchWorkCalendarPreview, fetchWorkMailPreview } from "@/lib/work-google-client";
import { buildDayBrief, draftSequenceWithLlm } from "@/lib/work-inference";
import { buildMorningBrief, buildPrepMeetingBrief } from "@/lib/work-morning-brief";
import { pushLeadNotesToNotion } from "@/lib/work-notion-client";
import { sendSlackDigest } from "@/lib/work-slack-digest";
import { notifySlackInterestedReply } from "@/lib/work-slack-notify";
import { buildWorkGoLiveReport } from "@/lib/work-go-live";
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
          await pauseSequencesOnReply(entry.from);
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
        return Response.json({ ok: true, ...sync, status: await fetchWorkStatus() });
      }

      default:
        return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
