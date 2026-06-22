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
import { listCrmConflicts, resolveCrmConflict } from "@/lib/work-crm-conflicts";
import { buildWorkExecutiveBrief } from "@/lib/work-executive-brief";
import { handoffToWork, type HandoffSourceClaw } from "@/lib/work-handoff";
import { listWorkAgentAudit, appendAgentAudit } from "@/lib/work-agent-audit";
import { detectWorkStalls } from "@/lib/work-stall-detection";
import { emitWorkXpEvent } from "@/lib/work-xp-events";
import { emitWorkWebhook } from "@/lib/work-webhook-emitter";
import { buildMorningBrief, buildPrepMeetingBrief } from "@/lib/work-morning-brief";
import { buildWorkLiveProofReport } from "@/lib/work-live-proof";
import { pushLeadNotesToNotion } from "@/lib/work-notion-client";
import { sendSlackDigest } from "@/lib/work-slack-digest";
import { notifySlackInterestedReply } from "@/lib/work-slack-notify";
import { buildWorkGoLiveReport } from "@/lib/work-go-live";
import { applyTemplatePack, MINI_SEQUENCE_PRESETS } from "@/lib/work-template-packs";
import { handleWorkEmailReceipt } from "@/lib/work-receipt-handler";
import {
  isWorkActionAllowed,
  readWorkDeskPermissions,
  resolveWorkDeskRole,
  workPermissionDeniedMessage,
  type WorkPermissionAction,
} from "@/lib/work-permissions";
import { setMailInternalNote } from "@/lib/work-mail-notes";
import { resolveAutoSendOnActivate, readWorkSendPolicy, type AutoSendPolicy } from "@/lib/work-send-policy";
import {
  executeOutboundSend,
  sendSequenceStep,
  undoOutboundSend,
} from "@/lib/work-send-executor";
import {
  claimOutboundWorkerLock,
  isOutboundWorkerLockHeld,
  readOutboundWorkerLock,
  releaseOutboundWorkerLock,
  verifyOutboundWorkerCaller,
} from "@/lib/work-outbound-lock";
import {
  ensureWorkOutboundHeartbeatJob,
  runDashboardProcessDue,
  runOutboundWorkerTick,
} from "@/lib/work-outbound-tick";
import {
  activateSequence,
  appendWorkSyncLog,
  approveSend,
  archiveMail,
  assignMailToLead,
  clearMailSnooze,
  createSequence,
  createTask,
  deferSequenceStepSend,
  ensureWorkQueue,
  fetchWorkStatus,
  getLead,
  getSequenceNextDueAt,
  importLeadsFromCsv,
  isWorkEmailBridgeConfigured,
  markMailDone,
  markSequenceReplied,
  pauseSequence,
  rejectSend,
  scanLocalMailQueue,
  sendComposeReply,
  snoozeMail,
  listMailThreadsFromStore,
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
    workerPid?: number;
    scanInbox?: boolean;
    deskRole?: string;
    deskOperatorId?: string;
    force?: boolean;
    assignedTo?: string;
    note?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "";

  async function denyUnlessWorkPermission(perm: WorkPermissionAction): Promise<Response | null> {
    const perms = await readWorkDeskPermissions();
    if (!isWorkActionAllowed(perms, perm)) {
      return Response.json(
        {
          ok: false,
          code: "WORK_PERMISSION_DENIED",
          error: workPermissionDeniedMessage(perm, perms.role),
          role: perms.role,
        },
        { status: 403 },
      );
    }
    return null;
  }

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
        if (goLive.demoReady) {
          void (async () => {
            const { emitWorkXpEvent } = await import("@/lib/work-xp-events");
            await emitWorkXpEvent("go_live_demo_ready", {
              detail: `demoReady ${goLive.progress.complete}/${goLive.progress.total}`,
            });
          })();
        }
        return Response.json({ ok: true, goLive, status: await fetchWorkStatus() });
      }

      case "live_proof": {
        const liveProof = await buildWorkLiveProofReport();
        return Response.json({ ok: true, liveProof, status: await fetchWorkStatus() });
      }

      case "run_demo_tour": {
        const { runWorkDemoTourForLevel } = await import("@/lib/work-demo-tour");
        const growthLevel = (body as { growthLevel?: string }).growthLevel;
        const tour = await runWorkDemoTourForLevel(growthLevel);
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
        await emitWorkXpEvent("create_lead", { leadId: lead.id, email: lead.email });
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
        {
          const denied = await denyUnlessWorkPermission("send");
          if (denied) return denied;
        }
        const bridgeConfigured = await isWorkEmailBridgeConfigured();
        if (bridgeConfigured) {
          const { checkPreSendGate } = await import("@/lib/work-go-live");
          const gate = await checkPreSendGate();
          if (!gate.ok) {
            return Response.json(
              { ok: false, preSendBlocked: true, gate, error: `Pre-send gate: missing ${gate.missing.join(", ")}` },
              { status: 422 },
            );
          }
        }
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
        const result = await executeOutboundSend(body.sendId, { skipUndo: true });
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "process_due": {
        const tick = await runDashboardProcessDue();
        return Response.json({
          ok: true,
          processed: tick.processed,
          finalizedSends: tick.finalizedSends,
          snoozeReturned: tick.snoozeReturned,
          workerActive: tick.workerActive ?? false,
          skipped: tick.skipped,
          status: await fetchWorkStatus(),
        });
      }

      case "outbound_worker_tick": {
        const workerPid = typeof body.workerPid === "number" ? body.workerPid : Number(body.workerPid);
        if (!Number.isFinite(workerPid) || !(await verifyOutboundWorkerCaller(workerPid))) {
          return Response.json({ ok: false, error: "Outbound worker lock not held by caller" }, { status: 403 });
        }
        const scanInbox = body.scanInbox === true;
        const tick = await runOutboundWorkerTick({ scanInbox });
        return Response.json({ ok: true, ...tick, status: await fetchWorkStatus() });
      }

      case "claim_outbound_worker_lock": {
        const workerPid = typeof body.workerPid === "number" ? body.workerPid : Number(body.workerPid);
        const claim = await claimOutboundWorkerLock(Number.isFinite(workerPid) ? workerPid : process.pid);
        return Response.json({ ...claim, lock: await readOutboundWorkerLock(), status: await fetchWorkStatus() });
      }

      case "release_outbound_worker_lock": {
        const workerPid = typeof body.workerPid === "number" ? body.workerPid : Number(body.workerPid);
        await releaseOutboundWorkerLock(Number.isFinite(workerPid) ? workerPid : process.pid);
        return Response.json({ ok: true, held: await isOutboundWorkerLockHeld(), status: await fetchWorkStatus() });
      }

      case "outbound_worker_lock_status": {
        const lock = await readOutboundWorkerLock();
        const held = await isOutboundWorkerLockHeld();
        return Response.json({ ok: true, held, lock, status: await fetchWorkStatus() });
      }

      case "ensure_outbound_heartbeat_job": {
        await ensureWorkOutboundHeartbeatJob();
        return Response.json({ ok: true, status: await fetchWorkStatus() });
      }

      case "import_leads": {
        if (!body.csv?.trim()) {
          return Response.json({ ok: false, error: "csv required" }, { status: 400 });
        }
        const result = await importLeadsFromCsv(body.csv);
        return Response.json({ ...result, status: await fetchWorkStatus() });
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
        const { scanMailIndexForBounces, scanFailedSendsForSuppression } = await import("@/lib/work-suppression");
        for (const entry of entries.filter((e) => e.matchedReply && e.from)) {
          await pauseSequencesOnReply(entry.from, entry.replyIntent);
        }
        const bounceSuppressed = await scanMailIndexForBounces(entries);
        const failedSuppressed = await scanFailedSendsForSuppression();
        return Response.json({
          ok: true,
          indexed: entries.length,
          bounceSuppressed,
          failedSuppressed,
          status: await fetchWorkStatus(),
        });
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
        const [brief, liveProof] = await Promise.all([buildMorningBrief(), buildWorkLiveProofReport()]);
        return Response.json({
          ok: true,
          brief,
          mailSource: liveProof.mailSourceLabel,
          mailSourceLive: liveProof.mailSourceLive,
          status: await fetchWorkStatus(),
        });
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
        const conflicts = await listCrmConflicts();
        await appendWorkSyncLog({
          connector: "twenty",
          action: "sync_crm",
          detail: `push=${sync.push?.pushed ?? 0} pull=${sync.pull?.imported ?? 0} conflicts=${conflicts.length}`,
        });
        await appendAgentAudit({ kind: "sync", source: "desk", note: "sync_crm" });
        return Response.json({ ok: true, ...sync, conflictCount: conflicts.length, status: await fetchWorkStatus() });
      }

      case "assign_mail_to_lead": {
        if (!body.mailId || !body.leadId) {
          return Response.json({ ok: false, error: "mailId and leadId required" }, { status: 400 });
        }
        {
          const denied = await denyUnlessWorkPermission("assign");
          if (denied) return denied;
        }
        const result = await assignMailToLead(body.mailId, body.leadId, {
          assignedTo: body.assignedTo,
          force: body.force === true,
        });
        if (!result.entry) return Response.json({ ok: false, error: "Mail entry not found" }, { status: 404 });
        if (result.collision) {
          return Response.json(
            {
              ok: false,
              collision: true,
              assignedTo: result.collision.assignedTo,
              entry: result.entry,
              error: `Mail assigned to ${result.collision.assignedTo}`,
              status: await fetchWorkStatus(),
            },
            { status: 409 },
          );
        }
        return Response.json({ ok: true, entry: result.entry, status: await fetchWorkStatus() });
      }

      case "set_mail_internal_note": {
        if (!body.mailId) return Response.json({ ok: false, error: "mailId required" }, { status: 400 });
        {
          const denied = await denyUnlessWorkPermission("assign");
          if (denied) return denied;
        }
        const entry = await setMailInternalNote(body.mailId, body.note ?? "");
        if (!entry) return Response.json({ ok: false, error: "Mail entry not found" }, { status: 404 });
        return Response.json({ ok: true, entry, status: await fetchWorkStatus() });
      }

      case "set_desk_role": {
        const perms = await readWorkDeskPermissions();
        if (!perms.canConfigure && body.force !== true) {
          return Response.json({ ok: false, error: "admin desk role required" }, { status: 403 });
        }
        if (!body.deskRole) {
          return Response.json({ ok: false, error: "deskRole required" }, { status: 400 });
        }
        const fre = await readAppFreState("my-work");
        fre.config.deskRole = resolveWorkDeskRole(body.deskRole);
        if (typeof body.deskOperatorId === "string" && body.deskOperatorId.trim()) {
          fre.config.deskOperatorId = body.deskOperatorId.trim();
        }
        await writeAppFreState("my-work", fre);
        return Response.json({
          ok: true,
          deskPermissions: await readWorkDeskPermissions(),
          status: await fetchWorkStatus(),
        });
      }

      case "draft_reply": {
        const draft = await draftReplyWithLlm({
          mailId: body.mailId,
          leadId: body.leadId,
          prompt: body.prompt,
        });
        if (body.mailId) {
          await emitWorkXpEvent("draft_reply", { mailId: body.mailId, leadId: body.leadId ?? "" });
        }
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
        {
          const denied = await denyUnlessWorkPermission("approve");
          if (denied) return denied;
        }
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
        {
          const denied = await denyUnlessWorkPermission("approve");
          if (denied) return denied;
        }
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
          return Response.json({ ...result, status: await fetchWorkStatus() });
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

      case "snooze_mail": {
        if (!body.mailId) return Response.json({ ok: false, error: "mailId required" }, { status: 400 });
        const days = typeof (body as { days?: number }).days === "number" ? (body as { days: number }).days : 1;
        const result = await snoozeMail(body.mailId, days);
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "clear_snooze": {
        if (!body.mailId) return Response.json({ ok: false, error: "mailId required" }, { status: 400 });
        const force = (body as { force?: boolean }).force === true;
        const entry = await clearMailSnooze(body.mailId, force);
        if (!entry) return Response.json({ ok: false, error: "mail not found" }, { status: 404 });
        return Response.json({ ok: true, entry, status: await fetchWorkStatus() });
      }

      case "undo_send": {
        if (!body.sendId) return Response.json({ ok: false, error: "sendId required" }, { status: 400 });
        const result = await undoOutboundSend(body.sendId);
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "finalize_send": {
        if (!body.sendId) return Response.json({ ok: false, error: "sendId required" }, { status: 400 });
        const result = await executeOutboundSend(body.sendId, { skipUndo: true });
        return Response.json({ ...result, sendStatus: result.send?.status, status: await fetchWorkStatus() });
      }

      case "list_threads": {
        const file = await ensureWorkQueue();
        if (file.mailIndex.length === 0) await scanLocalMailQueue();
        const includeArchived = (body as { includeArchived?: boolean }).includeArchived === true;
        const threads = await listMailThreadsFromStore({ includeArchived });
        return Response.json({ ok: true, threads, status: await fetchWorkStatus() });
      }

      case "archive_mail": {
        if (!body.mailId) return Response.json({ ok: false, error: "mailId required" }, { status: 400 });
        const entry = await archiveMail(body.mailId);
        if (!entry) return Response.json({ ok: false, error: "mail not found" }, { status: 404 });
        return Response.json({ ok: true, entry, status: await fetchWorkStatus() });
      }

      case "mark_mail_done": {
        if (!body.mailId) return Response.json({ ok: false, error: "mailId required" }, { status: 400 });
        const entry = await markMailDone(body.mailId);
        if (!entry) return Response.json({ ok: false, error: "mail not found" }, { status: 404 });
        return Response.json({ ok: true, entry, status: await fetchWorkStatus() });
      }

      case "compose_send":
      case "send_compose_reply": {
        {
          const denied = await denyUnlessWorkPermission("send");
          if (denied) return denied;
        }
        const mailId = body.mailId ?? "";
        const subject = typeof (body as { subject?: string }).subject === "string" ? (body as { subject: string }).subject : "Re:";
        const replyBody = typeof (body as { body?: string }).body === "string" ? (body as { body: string }).body : "";
        if (!mailId || !replyBody.trim()) {
          return Response.json({ ok: false, error: "mailId and body required" }, { status: 400 });
        }
        const result = await sendComposeReply({ mailId, subject, body: replyBody });
        return Response.json({
          ...result,
          sendStatus: result.status,
          status: await fetchWorkStatus(),
        });
      }

      case "suppression_list": {
        const { listSuppressedEmails } = await import("@/lib/work-suppression");
        const suppressed = await listSuppressedEmails();
        return Response.json({ ok: true, suppressed, status: await fetchWorkStatus() });
      }

      case "add_suppression": {
        const email = typeof (body as { email?: string }).email === "string" ? (body as { email: string }).email : "";
        if (!email) return Response.json({ ok: false, error: "email required" }, { status: 400 });
        const { addSuppression } = await import("@/lib/work-suppression");
        const entry = await addSuppression(email, "manual block", "manual");
        return Response.json({ ok: true, entry, status: await fetchWorkStatus() });
      }

      case "remove_suppression": {
        const email = typeof (body as { email?: string }).email === "string" ? (body as { email: string }).email : "";
        if (!email) return Response.json({ ok: false, error: "email required" }, { status: 400 });
        const { removeSuppression } = await import("@/lib/work-suppression");
        const removed = await removeSuppression(email);
        return Response.json({ ok: removed, status: await fetchWorkStatus() });
      }

      case "suppression_block_test": {
        const email = `bounce-test-${Date.now()}@example.com`;
        const { addSuppression, isEmailSuppressed } = await import("@/lib/work-suppression");
        await addSuppression(email, "test bounce", "bounce");
        const blocked = await isEmailSuppressed(email);
        return Response.json({ ok: blocked, email, status: await fetchWorkStatus() });
      }

      case "pre_send_gate": {
        const { checkPreSendGate } = await import("@/lib/work-go-live");
        const gate = await checkPreSendGate();
        return Response.json({ ok: true, gate, status: await fetchWorkStatus() });
      }

      case "check_activate_gate": {
        const assumeLive = (body as { assumeLive?: boolean }).assumeLive === true;
        const bridgeConfigured = assumeLive || (await isWorkEmailBridgeConfigured());
        if (!bridgeConfigured) {
          return Response.json({ ok: true, blocked: false, reason: "demo", status: await fetchWorkStatus() });
        }
        const { checkPreSendGate } = await import("@/lib/work-go-live");
        const gate = await checkPreSendGate();
        return Response.json({ ok: true, blocked: !gate.ok, gate, status: await fetchWorkStatus() });
      }

      case "warmup_chart": {
        const status = await fetchWorkStatus();
        const chart = status.deliverability?.warmupChart ?? [];
        return Response.json({
          ok: true,
          series: chart,
          sendsToday: status.deliverability?.sendsToday ?? status.sendPolicy.sendsToday,
          cap: status.sendPolicy.effectiveDailyLimit,
          status,
        });
      }

      case "ack_suppression_review": {
        const fre = await readAppFreState("my-work");
        fre.config.suppressionAcknowledged = true;
        await writeAppFreState("my-work", fre);
        return Response.json({ ok: true, goLive: await buildWorkGoLiveReport(), status: await fetchWorkStatus() });
      }

      case "sync_hubspot": {
        const { syncHubSpotLeads } = await import("@/lib/work-hubspot-sync");
        const result = await syncHubSpotLeads();
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "lead_activity_timeline": {
        const leadId = (body as { leadId?: string }).leadId?.trim();
        if (!leadId) return Response.json({ ok: false, error: "leadId required" }, { status: 400 });
        const { buildLeadActivityTimeline } = await import("@/lib/work-lead-activity");
        const events = await buildLeadActivityTimeline(leadId);
        const kinds = [...new Set(events.map((e) => e.kind))];
        return Response.json({ ok: true, leadId, events, kinds });
      }

      case "signal_feed_list":
      case "list_signals": {
        const { listWorkSignals } = await import("@/lib/work-signal-feed");
        const signals = await listWorkSignals(10);
        return Response.json({ ok: true, signals, status: await fetchWorkStatus() });
      }

      case "signal_ingest": {
        const payload = body as {
          title?: string;
          source?: string;
          url?: string;
          intent?: string;
          score?: number;
        };
        if (!payload.title?.trim()) return Response.json({ ok: false, error: "title required" }, { status: 400 });
        const { ingestWorkSignal } = await import("@/lib/work-signal-feed");
        const signal = await ingestWorkSignal({
          title: payload.title,
          source: payload.source,
          url: payload.url,
          intent: payload.intent as "hiring" | "funding" | "product" | "community" | "other" | undefined,
          score: payload.score,
        });
        return Response.json({ ok: true, signal, status: await fetchWorkStatus() });
      }

      case "signal_to_opportunity": {
        const signalId = typeof (body as { signalId?: string }).signalId === "string"
          ? (body as { signalId: string }).signalId
          : "";
        const { listWorkSignals, markSignalConverted } = await import("@/lib/work-signal-feed");
        const signals = await listWorkSignals(20);
        const signal = signals.find((s) => s.id === signalId) ?? signals[0];
        if (!signal) return Response.json({ ok: false, error: "no signals" }, { status: 400 });
        const slug = signal.title.slice(0, 24).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        const lead = await upsertLead({
          name: signal.title.slice(0, 48),
          email: `signal-${slug}-${Date.now()}@example.com`,
          company: signal.source,
          source: `signal:${signal.intent}`,
          tags: ["signal", signal.intent],
        });
        const seq = await createSequence({
          name: `Signal · ${lead.name}`,
          leadId: lead.id,
          steps: MINI_SEQUENCE_PRESETS[0]?.steps.map((s) => ({
            subject: s.subject,
            body: s.body,
            delayDays: s.delayDays,
          })) ?? [{ subject: "Following up", body: "Hi — saw your update.", delayDays: 0 }],
        });
        await markSignalConverted(signal.id, lead.id);
        void enrichLead(lead.id);
        return Response.json({ ok: true, lead, sequenceId: seq.id, signalId: signal.id, status: await fetchWorkStatus() });
      }

      case "approval_callback_demo": {
        const status = await fetchWorkStatus();
        const pending = status.sends.find((s) => s.status === "pending_approval");
        if (!pending) {
          return Response.json({ ok: true, demoLogged: false, detail: "no pending approval" });
        }
        const approved = await approveSend(pending.id);
        if (!approved) {
          return Response.json({ ok: true, demoLogged: false, detail: "approve failed" });
        }
        await appendAgentAudit({
          kind: "approval",
          source: "telegram_callback",
          note: `Demo approve ${pending.id}`,
          sendId: pending.id,
        });
        await executeOutboundSend(pending.id);
        return Response.json({ ok: true, demoLogged: true, sendId: pending.id, status: await fetchWorkStatus() });
      }

      case "audit_export": {
        const audit = await listWorkAgentAudit(100);
        return Response.json({ ok: true, audit, exportedAt: new Date().toISOString(), status: await fetchWorkStatus() });
      }

      case "needs_you_digest": {
        const { sendNeedsYouDigest } = await import("@/lib/work-needs-you-digest");
        const digest = await sendNeedsYouDigest();
        return Response.json({ ...digest, status: await fetchWorkStatus() });
      }

      case "os_morning_brief": {
        const { buildOsMorningBrief, readOsBriefCounts } = await import("@/lib/os-morning-brief");
        const [brief, counts] = await Promise.all([buildOsMorningBrief(), readOsBriefCounts()]);
        return Response.json({ ok: true, brief, counts, status: await fetchWorkStatus() });
      }

      case "run_os_playbook": {
        const playbookId = (body as { playbookId?: string }).playbookId?.trim();
        if (!playbookId) return Response.json({ ok: false, error: "playbookId required" }, { status: 400 });
        const { runOsPlaybook } = await import("@/lib/os-playbooks");
        const result = await runOsPlaybook(playbookId);
        if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "mcp_confirm_preview": {
        const sequenceId = (body as { sequenceId?: string }).sequenceId?.trim();
        if (!sequenceId) return Response.json({ ok: false, error: "sequenceId required" }, { status: 400 });
        const { invokeWorkMcpTool } = await import("@/lib/work-mcp-server");
        const out = await invokeWorkMcpTool("send_sequence_preview", { sequenceId, dry_run: true });
        const preview = out.content as { confirmRequired?: string } | null;
        return Response.json({
          ok: out.ok,
          preview: out.content,
          confirmRequired: Boolean(preview?.confirmRequired ?? out.ok),
          error: out.error,
        });
      }

      case "sla_chips_smoke": {
        const { buildNeedsYouSummary } = await import("@/lib/work-needs-you");
        const stalls = await detectWorkStalls();
        const needsYou = await buildNeedsYouSummary();
        const chips = [
          ...needsYou.items.map((i) => i.slaLevel),
          ...stalls.map((s) => s.slaLevel),
        ];
        return Response.json({
          ok: true,
          chips,
          hasAmberOrRed: chips.some((c) => c === "amber" || c === "red"),
          needsYou,
          stalls,
        });
      }

      case "xp_list": {
        const { listWorkXpEvents } = await import("@/lib/work-xp-events");
        const events = await listWorkXpEvents(5);
        return Response.json({ ok: true, events, status: await fetchWorkStatus() });
      }

      case "microsoft_oauth_status": {
        const res = await fetch(new URL("/api/work/microsoft", request.url).toString(), { cache: "no-store" });
        const m365 = (await res.json()) as Record<string, unknown>;
        return Response.json({ ok: true, microsoft: m365, status: await fetchWorkStatus() });
      }

      case "crm_sync_badge": {
        const { crmSyncBadgeForLead } = await import("@/lib/work-hubspot-sync");
        const status = await fetchWorkStatus();
        const lead = status.leads[0];
        const badge = lead ? crmSyncBadgeForLead(lead) : "local_only";
        return Response.json({ ok: true, badge, leadId: lead?.id ?? null, status });
      }

      case "won_pauses_sequences": {
        const lead = await upsertLead({
          name: "Won pause QA",
          email: `won-pause-qa-${Date.now()}@example.com`,
          stage: "qualified",
        });
        const seq = await createSequence({
          name: "Won test seq",
          leadId: lead.id,
          steps: [{ subject: "Test", body: "Test", delayDays: 0 }],
        });
        await activateSequence(seq.id);
        await updateLeadStage(lead.id, "won");
        const after = await fetchWorkStatus();
        const paused = after.sequences.find((s) => s.id === seq.id)?.status === "paused";
        return Response.json({ ok: paused, sequenceId: seq.id, leadId: lead.id, status: after });
      }

      case "crm_conflict_list": {
        const conflicts = await listCrmConflicts();
        return Response.json({ ok: true, conflicts, status: await fetchWorkStatus() });
      }

      case "resolve_crm_conflict": {
        const conflictId = typeof (body as { conflictId?: string }).conflictId === "string"
          ? (body as { conflictId: string }).conflictId
          : "";
        const resolution = (body as { resolution?: string }).resolution;
        const winner =
          resolution === "take_remote" || (body as { winner?: string }).winner === "remote" ? "remote" : "local";
        if (!conflictId) return Response.json({ ok: false, error: "conflictId required" }, { status: 400 });
        const result = await resolveCrmConflict(conflictId, winner);
        if (!result.ok) return Response.json({ ok: false, error: "conflict not found" }, { status: 404 });
        return Response.json({ ok: true, lead: result.lead, status: await fetchWorkStatus() });
      }

      case "microsoft_status": {
        const { getWorkMicrosoftStatus } = await import("@/lib/work-microsoft-client");
        const m365 = await getWorkMicrosoftStatus();
        return Response.json({ ok: true, microsoft: m365, status: await fetchWorkStatus() });
      }

      case "executive_brief": {
        const brief = await buildWorkExecutiveBrief();
        return Response.json({ ok: true, brief, status: await fetchWorkStatus() });
      }

      case "stall_detection":
      case "list_stalls": {
        const stalls = await detectWorkStalls();
        return Response.json({ ok: true, stalls, stalled: stalls, status: await fetchWorkStatus() });
      }

      case "needs_you": {
        const { buildNeedsYouSummary } = await import("@/lib/work-needs-you");
        const needsYou = await buildNeedsYouSummary();
        return Response.json({ ok: true, needsYou, status: await fetchWorkStatus() });
      }

      case "audit_list":
      case "list_agent_audit": {
        const audit = await listWorkAgentAudit(20);
        return Response.json({ ok: true, audit, status: await fetchWorkStatus() });
      }

      case "approval_notify_demo": {
        const status = await fetchWorkStatus();
        const pending = status.sends.find((s) => s.status === "pending_approval");
        if (!pending) {
          return Response.json({ ok: true, demoLogged: false, detail: "no pending approval" });
        }
        const { notifyWorkPendingApproval } = await import("@/lib/work-approval-notify");
        const result = await notifyWorkPendingApproval(pending);
        return Response.json({ ok: true, ...result, sendId: pending.id, status: await fetchWorkStatus() });
      }

      case "handoff_from_claw": {
        const payload = body as {
          sourceClaw?: string;
          source?: HandoffSourceClaw;
          name?: string;
          email?: string;
          company?: string;
          title?: string;
          notes?: string;
          contextLabel?: string;
        };
        const sourceRaw = payload.source ?? payload.sourceClaw ?? "mesh";
        const source: HandoffSourceClaw =
          sourceRaw === "my-content" || sourceRaw === "my-capital" || sourceRaw === "mesh"
            ? sourceRaw
            : "mesh";
        const result = await handoffToWork({
          source,
          name: payload.name ?? "",
          email: payload.email ?? "",
          company: payload.company,
          title: payload.title,
          notes: payload.notes,
          contextLabel: payload.contextLabel,
        });
        if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
        return Response.json({ ...result, status: await fetchWorkStatus() });
      }

      case "xp_event_emit": {
        const kind = typeof (body as { kind?: string }).kind === "string"
          ? (body as { kind: string }).kind
          : "create_lead";
        const valid = [
          "create_lead",
          "draft_reply",
          "go_live_demo_ready",
          "connector_linked",
          "handoff_received",
          "sequence_activated",
          "approval_pending",
        ];
        if (!valid.includes(kind)) {
          return Response.json({ ok: false, error: "invalid xp kind" }, { status: 400 });
        }
        const event = await emitWorkXpEvent(kind as Parameters<typeof emitWorkXpEvent>[0], {
          source: "checklist",
        });
        const { listWorkXpEvents } = await import("@/lib/work-xp-events");
        const events = await listWorkXpEvents(5);
        if (!event) {
          return Response.json({ ok: true, skipped: true, optOut: true, events, status: await fetchWorkStatus() });
        }
        return Response.json({ ok: true, event, events, status: await fetchWorkStatus() });
      }

      default:
        return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
