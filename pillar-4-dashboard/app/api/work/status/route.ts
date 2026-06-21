export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { parseDigitalReceipt } from "@/lib/digital-protocol";
import { buildDayBrief, draftSequenceWithLlm } from "@/lib/work-inference";
import { buildWorkGoLiveReport } from "@/lib/work-go-live";
import { handleWorkEmailReceipt } from "@/lib/work-receipt-handler";
import {
  executeOutboundSend,
  processDueSequenceSteps,
  sendSequenceStep,
} from "@/lib/work-send-executor";
import {
  activateSequence,
  createSequence,
  createTask,
  ensureWorkQueue,
  fetchWorkStatus,
  importLeadsFromCsv,
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
        const sequence = await activateSequence(body.sequenceId);
        const send = await sendSequenceStep(body.sequenceId);
        return Response.json({ ok: true, sequence, send, status: await fetchWorkStatus() });
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

      default:
        return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
