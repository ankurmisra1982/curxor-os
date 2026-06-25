"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AppMetric } from "@/components/app-shared/AppLayout";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { UnifiedInboxPanel } from "@/components/comms/UnifiedInboxPanel";
import { WorkAuditTimelinePanel } from "@/components/apps/work/WorkAuditTimelinePanel";
import { WorkComposeStrip } from "@/components/apps/work/WorkComposeStrip";
import { WorkCrmConflictPanel } from "@/components/apps/work/WorkCrmConflictPanel";
import { WorkDeliverabilityPanel } from "@/components/apps/work/WorkDeliverabilityPanel";
import { WorkPreSendModal } from "@/components/apps/work/WorkPreSendModal";
import { WorkTrustCenterStrip } from "@/components/apps/work/WorkTrustCenterStrip";
import { WorkNeedsYouPanel } from "@/components/apps/work/WorkNeedsYouPanel";
import { WorkGoLivePanel, type WorkGoLiveReportRow } from "@/components/apps/work/WorkGoLivePanel";
import { WorkAnalyticsPanel } from "@/components/apps/work/WorkAnalyticsPanel";
import { WorkApprovalPanel } from "@/components/apps/work/WorkApprovalPanel";
import { WorkApprovalPolicyPanel } from "@/components/apps/work/WorkApprovalPolicyPanel";
import { WorkConnectorVaultPanel } from "@/components/apps/work/WorkConnectorVaultPanel";
import { WorkExecutiveBriefPanel } from "@/components/apps/work/WorkExecutiveBriefPanel";
import { WorkImportPanel } from "@/components/apps/work/WorkImportPanel";
import { WorkInboxTriagePanel } from "@/components/apps/work/WorkInboxTriagePanel";
import { WorkLeadActivityPanel } from "@/components/apps/work/WorkLeadActivityPanel";
import { WorkLevelBadge } from "@/components/apps/work/WorkLevelBadge";
import { WorkLevelUpNudge } from "@/components/apps/work/WorkLevelUpNudge";
import { WorkMailIndexPanel } from "@/components/apps/work/WorkMailIndexPanel";
import { WorkMiniSequenceWizard } from "@/components/apps/work/WorkMiniSequenceWizard";
import { WorkMcpConfirmModal } from "@/components/apps/work/WorkMcpConfirmModal";
import { WorkMorningBriefPanel } from "@/components/apps/work/WorkMorningBriefPanel";
import { WorkOutboundPanel } from "@/components/apps/work/WorkOutboundPanel";
import { WorkPipelineKanban } from "@/components/apps/work/WorkPipelineKanban";
import { WorkPipelinePanel } from "@/components/apps/work/WorkPipelinePanel";
import { WorkRecoveryPanel } from "@/components/apps/work/WorkRecoveryPanel";
import { WorkSendPolicyPanel } from "@/components/apps/work/WorkSendPolicyPanel";
import { WorkSequencePanel } from "@/components/apps/work/WorkSequencePanel";
import { WorkSignalStrip } from "@/components/apps/work/WorkSignalStrip";
import { WorkSetupWizard } from "@/components/apps/work/WorkSetupWizard";
import { WorkStartHomePanel } from "@/components/apps/work/WorkStartHomePanel";
import {
  WorkWorkspaceTabs,
  defaultWorkTab,
  workSectionVisible,
  type WorkWorkspaceTab,
} from "@/components/apps/work/WorkWorkspaceTabs";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import type { GrowthLevel } from "@/lib/os-growth-level";
import { isGrowthLevel, meetsGrowthLevel } from "@/lib/os-growth-level";
import { workTerm } from "@/lib/work-level-copy";
import { workFeatureVisible } from "@/lib/work-level-gates";
import { resolveWorkGrowthLevel } from "@/lib/work-growth";
import { parseOsApprovalFocus, scrollToOsApprovalFocus } from "@/lib/os-approval-href";
import { listTemplatePacksForGrowth } from "@/lib/work-template-packs-data";
import type { WorkExecutiveBrief } from "@/lib/work-executive-brief";
import type { LeadActivityEvent } from "@/lib/work-lead-activity";
import type { LeadStage, OutboundSend, ReplyIntent, WorkAgentAuditEntry, WorkQueueStatus } from "@/lib/work-queue-types";

interface CrmConflictRow {
  id: string;
  email: string;
  field: string;
  localValue: string;
  remoteValue: string;
  leadId: string;
  resolvedAt?: string | null;
}

interface NeedsYouState {
  total: number;
  p1Tasks: number;
  pendingApprovals: number;
  interestedMail: number;
  operatorId?: string;
  items: Array<{
    kind: "task" | "approval" | "mail";
    id: string;
    label: string;
    priority?: string;
    at?: string;
    slaLevel?: "ok" | "amber" | "red";
  }>;
}

interface StallItemState {
  id: string;
  kind: string;
  title: string;
  detail: string;
  leadId: string | null;
  sequenceId: string | null;
  sendId: string | null;
  severity: "high" | "medium" | "low";
  stalledSince: string;
  slaLevel?: "ok" | "amber" | "red";
  slaHours?: number;
}
import { getOotbApp } from "@/lib/ootb-apps";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { useMotorStream } from "@/hooks/useMotorStream";

const BOOTSTRAP_ACTIONS = new Set([
  "create_lead",
  "import_leads",
  "activate_sequence",
  "pause_sequence",
  "send_now",
  "toggle_task",
  "update_lead_stage",
  "update_send_policy",
  "set_outbound_kill_switch",
  "sync_crm",
  "sync_notion_lead",
  "slack_digest",
  "approve_send",
  "reject_send",
  "apply_template_pack",
  "create_mini_sequence",
]);

async function postWork(body: Record<string, unknown>) {
  const res = await fetch("/api/work/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{
    ok: boolean;
    status?: WorkQueueStatus;
    goLive?: WorkGoLiveReportRow;
    failed?: OutboundSend[];
    error?: string;
    preSendBlocked?: boolean;
    gate?: { ok?: boolean; missing?: string[] };
  }>;
}

export function MyWorkApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { connected: motorUp } = useMotorStream();
  const searchParams = useSearchParams();
  const approvalFocus = useMemo(() => parseOsApprovalFocus(searchParams), [searchParams]);
  const highlightSendId = approvalFocus?.kind === "send" ? approvalFocus.sendId : null;
  const { level } = useExperienceLevel();

  const [workspaceTab, setWorkspaceTab] = useState<WorkWorkspaceTab>(() =>
    defaultWorkTab(resolveWorkGrowthLevel(config, level)),
  );
  const [status, setStatus] = useState<WorkQueueStatus | null>(null);
  const [signals, setSignals] = useState<Array<{ id: string; title: string; source: string; intent: string; score: number; receivedAt: string }>>([]);
  const [signalBusy, setSignalBusy] = useState(false);
  const [composeSendBusy, setComposeSendBusy] = useState(false);
  const [composeSendFeedback, setComposeSendFeedback] = useState<{
    sendId: string;
    sendStatus: string;
    undoUntil?: string | null;
    undoPending?: boolean;
    error?: string | null;
  } | null>(null);

  const growthLevel = useMemo((): GrowthLevel => {
    const fromStatus = status?.growthProfile?.growthLevel;
    if (fromStatus && isGrowthLevel(fromStatus)) return fromStatus;
    return resolveWorkGrowthLevel(config, level);
  }, [config, level, status?.growthProfile?.growthLevel]);

  const templatePacks = useMemo(() => listTemplatePacksForGrowth(growthLevel), [growthLevel]);
  const defaultPackId =
    typeof config.defaultTemplatePack === "string"
      ? config.defaultTemplatePack
      : status?.growthProfile?.defaultTemplatePack ?? null;
  const [goLive, setGoLive] = useState<WorkGoLiveReportRow | null>(null);
  const [failedSends, setFailedSends] = useState<OutboundSend[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [dayBrief, setDayBrief] = useState("");
  const [signal, setSignal] = useState("Syncing outreach desk…");
  const [demoTourRunning, setDemoTourRunning] = useState(false);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [draftReplyPreview, setDraftReplyPreview] = useState("");
  const [focusMailId, setFocusMailId] = useState<string | null>(null);
  const [crmConflicts, setCrmConflicts] = useState<CrmConflictRow[]>([]);
  const [needsYou, setNeedsYou] = useState<NeedsYouState | null>(null);
  const [executiveBrief, setExecutiveBrief] = useState<WorkExecutiveBrief | null>(null);
  const [auditLog, setAuditLog] = useState<WorkAgentAuditEntry[]>([]);
  const [syncBadges, setSyncBadges] = useState<Record<string, "synced" | "conflict" | "local_only">>({});
  const [preSendModal, setPreSendModal] = useState<{ sequenceId: string; missing: string[] } | null>(null);
  const [suppressionBusy, setSuppressionBusy] = useState(false);
  const [leadActivity, setLeadActivity] = useState<LeadActivityEvent[]>([]);
  const [leadActivityLoading, setLeadActivityLoading] = useState(false);
  const [stallItems, setStallItems] = useState<StallItemState[]>([]);
  const [mcpConfirm, setMcpConfirm] = useState<{
    sequenceId: string;
    preview: Record<string, unknown> | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  const deskPerms = status?.deskPermissions;
  const canSend = deskPerms?.canSend ?? true;
  const canApprove = deskPerms?.canApprove ?? true;
  const canAssign = deskPerms?.canAssign ?? true;
  const operatorId = deskPerms?.operatorId ?? "operator";

  const draftReplyForMail = useCallback((mailId: string, prompt?: string) => {
    void postWork({ action: "draft_reply", mailId, prompt }).then((json) => {
      const draft = json as { body?: string; subject?: string };
      setDraftReplyPreview(`${draft.subject ?? ""}\n\n${draft.body ?? ""}`);
      setFocusMailId(mailId);
      setSignal("Reply draft ready");
    });
  }, []);

  const workspace = typeof config.workspaceName === "string" ? config.workspaceName : "Outreach Desk";
  const lane = typeof config.clawLane === "string" ? config.clawLane : "A";

  const applyStatus = useCallback((next: WorkQueueStatus) => {
    setStatus(next);
    if (!selectedLeadId && next.leads[0]) setSelectedLeadId(next.leads[0].id);
    if (!selectedSequenceId && next.sequences[0]) setSelectedSequenceId(next.sequences[0].id);
  }, [selectedLeadId, selectedSequenceId]);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/work/status", { cache: "no-store" });
    const data = (await res.json()) as WorkQueueStatus;
    applyStatus(data);
    setSignal(`Updated ${new Date(data.updatedAt).toLocaleTimeString()}`);
  }, [applyStatus]);

  const loadBootstrap = useCallback(async () => {
    const json = await postWork({ action: "dashboard_bootstrap" });
    if (json.status) applyStatus(json.status);
    if (json.goLive) setGoLive(json.goLive);
    if (workFeatureVisible(growthLevel, "crm-conflicts")) {
      const conflicts = await postWork({ action: "crm_conflict_list" });
      const cj = conflicts as { conflicts?: typeof crmConflicts };
      if (cj.conflicts) setCrmConflicts(cj.conflicts);
    }
    if (growthLevel === "L5") {
      const briefJson = await postWork({ action: "executive_brief" });
      const bj = briefJson as { brief?: WorkExecutiveBrief };
      if (bj.brief) setExecutiveBrief(bj.brief);
      const ny = await postWork({ action: "needs_you" });
      const nj = ny as { needsYou?: typeof needsYou };
      if (nj.needsYou) setNeedsYou(nj.needsYou);
      const stallsJson = await postWork({ action: "stall_detection" });
      const sj = stallsJson as { stalls?: StallItemState[] };
      if (sj.stalls) setStallItems(sj.stalls);
    }
    if (workFeatureVisible(growthLevel, "audit-timeline")) {
      const auditJson = await postWork({ action: "audit_list" });
      const aj = auditJson as { audit?: WorkAgentAuditEntry[] };
      if (aj.audit) setAuditLog(aj.audit);
    }
    if (workFeatureVisible(growthLevel, "pipeline")) {
      const conflicts = await postWork({ action: "crm_conflict_list" });
      const cj = conflicts as { conflicts?: CrmConflictRow[] };
      const badges: Record<string, "synced" | "conflict" | "local_only"> = {};
      for (const c of cj.conflicts ?? []) badges[c.leadId] = "conflict";
      setSyncBadges(badges);
    }
    if (meetsGrowthLevel(growthLevel, "L2")) {
      const sigJson = await postWork({ action: "signal_feed_list" });
      const sj = sigJson as { signals?: typeof signals };
      if (sj.signals) setSignals(sj.signals);
    }
  }, [applyStatus, growthLevel]);

  const loadLeadActivity = useCallback(async (leadId: string) => {
    if (!leadId) {
      setLeadActivity([]);
      return;
    }
    setLeadActivityLoading(true);
    try {
      const json = await postWork({ action: "lead_activity_timeline", leadId });
      const payload = json as { events?: LeadActivityEvent[] };
      setLeadActivity(payload.events ?? []);
    } finally {
      setLeadActivityLoading(false);
    }
  }, []);

  const openMcpConfirm = useCallback(async (sequenceId: string) => {
    setMcpConfirm({ sequenceId, preview: null, loading: true, error: null });
    const json = await postWork({ action: "mcp_confirm_preview", sequenceId });
    const payload = json as {
      ok?: boolean;
      preview?: Record<string, unknown>;
      error?: string;
      confirmRequired?: boolean;
    };
    setMcpConfirm({
      sequenceId,
      preview: payload.preview ?? null,
      loading: false,
      error: payload.ok ? null : payload.error ?? "Preview failed",
    });
  }, []);

  const undoComposeSend = useCallback(
    (sendId: string) => {
      void postWork({ action: "undo_send", sendId }).then((json) => {
        const sj = json as { ok?: boolean; send?: OutboundSend; error?: string };
        if (sj.ok && sj.send) {
          setComposeSendFeedback({
            sendId: sj.send.id,
            sendStatus: sj.send.status,
            undoPending: false,
            error: sj.send.error,
          });
          setSignal("Send cancelled");
        } else {
          setSignal(sj.error ?? "Undo failed");
        }
        void loadBootstrap();
      });
    },
    [loadBootstrap],
  );

  const refreshGoLive = useCallback(async () => {
    const json = await postWork({ action: "go_live" });
    if (json.goLive) setGoLive(json.goLive);
    if (json.status) applyStatus(json.status);
  }, [applyStatus]);

  const loadRecovery = useCallback(async () => {
    const json = await postWork({ action: "recovery_list" });
    if (json.failed) setFailedSends(json.failed);
    if (json.status) applyStatus(json.status);
  }, [applyStatus]);

  useEffect(() => {
    setWorkspaceTab(defaultWorkTab(growthLevel));
  }, [growthLevel]);

  useEffect(() => {
    if (approvalFocus?.kind !== "send" || !status) return;
    scrollToOsApprovalFocus(approvalFocus);
  }, [approvalFocus, status]);

  useEffect(() => {
    void loadBootstrap();
    if (workFeatureVisible(growthLevel, "recovery")) {
      void loadRecovery();
    }
    const id = setInterval(() => void loadStatus(), 30_000);
    return () => clearInterval(id);
  }, [loadBootstrap, loadRecovery, loadStatus, growthLevel]);

  useEffect(() => {
    if (workFeatureVisible(growthLevel, "pipeline") && selectedLeadId) {
      void loadLeadActivity(selectedLeadId);
    } else {
      setLeadActivity([]);
    }
  }, [selectedLeadId, growthLevel, loadLeadActivity, status?.updatedAt]);

  useEffect(() => {
    const lead = status?.leads.find((l) => l.id === selectedLeadId);
    const seq = status?.sequences.find((s) => s.id === selectedSequenceId);
    const topTask =
      status?.tasks.find((t) => !t.done && t.priority === "P1") ??
      status?.tasks.find((t) => !t.done);
    updateWorkspaceContext({
      selectedLeadId: lead?.id ?? "",
      selectedLeadName: lead?.name ?? "",
      selectedSequenceId: seq?.id ?? "",
      selectedSequenceName: seq?.name ?? "",
      selectedTaskPriority: topTask?.priority ?? "",
      selectedTaskTitle: topTask?.title ?? "",
      selectedTaskId: topTask?.id ?? "",
    });
  }, [selectedLeadId, selectedSequenceId, status, updateWorkspaceContext]);

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;

    const serverExecuted = new Set([
      "scan_inbox",
      "summarize_day",
      "draft_sequence",
      "send_sequence_step",
      "run_demo_tour",
      "morning_brief",
      "prep_meeting",
      "executive_brief",
      "slack_digest",
      "draft_reply",
      "enrich_lead",
      "book_meeting",
    ]);
    const physicalSkills = new Set(["sort_tray", "move_to_tray"]);

    void (async () => {
      if (physicalSkills.has(lastSkillId)) {
        await loadStatus();
        setSignal(`${lastSkillId} · lane ${lane} · ${new Date().toLocaleTimeString()}`);
        return;
      }

      if (!serverExecuted.has(lastSkillId)) return;

      if (lastSkillId === "run_demo_tour" || lastSkillId === "morning_brief" || lastSkillId === "prep_meeting") {
        await loadBootstrap();
      } else {
        await loadStatus();
      }

      if (lastSkillId === "summarize_day" || lastSkillId === "morning_brief" || lastSkillId === "executive_brief") {
        const action =
          lastSkillId === "morning_brief"
            ? "morning_brief"
            : lastSkillId === "executive_brief"
              ? "executive_brief"
              : "summarize_day";
        const briefJson = await postWork({ action });
        if (lastSkillId === "executive_brief") {
          const bj = briefJson as { brief?: WorkExecutiveBrief };
          if (bj.brief) setExecutiveBrief(bj.brief);
          setSignal("Executive brief ready");
        } else {
          setDayBrief((briefJson as { brief?: string }).brief ?? "");
          setSignal(lastSkillId === "morning_brief" ? "Morning brief ready" : "Day brief ready");
        }
        return;
      }
      if (lastSkillId === "run_demo_tour") {
        setSignal(
          growthLevel === "L1"
            ? "Explorer tour · opportunity + template + draft"
            : growthLevel === "L2"
              ? "Side hustle tour · mini-sequence"
              : growthLevel === "L3"
                ? "Operator tour · approval queue"
                : "Demo tour complete · simulated send",
        );
        return;
      }
      if (lastSkillId === "scan_inbox") {
        setSignal("Inbox indexed · reply detection ran");
      } else if (lastSkillId === "draft_sequence") {
        setSignal("Sequence drafted");
      } else if (lastSkillId === "send_sequence_step") {
        setSignal("Step sent · check outbound queue");
      } else if (lastSkillId === "slack_digest") {
        setSignal("Slack digest sent");
      } else if (lastSkillId === "draft_reply") {
        setSignal("Reply draft ready");
      } else if (lastSkillId === "enrich_lead") {
        setSignal("Lead enriched");
      } else if (lastSkillId === "book_meeting") {
        setSignal("Meeting booking logged");
      } else if (lastSkillId === "prep_meeting") {
        setSignal("Meeting prep ready");
      }
    })();
  }, [skillTick, lastSkillId, loadStatus, loadBootstrap, lane, growthLevel]);

  const runDemoTour = () => {
    setDemoTourRunning(true);
    void postWork({ action: "run_demo_tour" })
      .then((json) => {
        if (json.status) applyStatus(json.status);
        if (json.goLive) setGoLive(json.goLive);
        setSignal(json.ok ? (
          growthLevel === "L1"
            ? "Explorer tour · opportunity + template + draft"
            : growthLevel === "L2"
              ? "Side hustle tour · mini-sequence"
              : growthLevel === "L3"
                ? "Operator tour · approval queue"
                : "Demo tour complete · simulated send"
        ) : json.error ?? "Demo tour failed");
      })
      .finally(() => setDemoTourRunning(false));
  };

  const action = async (body: Record<string, unknown>) => {
    const json = await postWork(body);
    const actionName = typeof body.action === "string" ? body.action : "";
    if (BOOTSTRAP_ACTIONS.has(actionName)) {
      await loadBootstrap();
    } else if (json.status) {
      applyStatus(json.status);
    }
    if (json.error) setSignal(json.error);
    return json;
  };

  const activateSequence = async (sequenceId: string) => {
    const json = await postWork({ action: "activate_sequence", sequenceId });
    if (json.preSendBlocked) {
      setPreSendModal({ sequenceId, missing: json.gate?.missing ?? [] });
      setSignal("Pre-send gate — complete compliance in setup wizard");
      return json;
    }
    if (json.status) applyStatus(json.status);
    if (json.goLive) setGoLive(json.goLive);
    await loadBootstrap();
    setSignal("Sequence activated");
    return json;
  };

  const linkOAuth = async (provider: "google" | "notion" | "microsoft") => {
    const res = await fetch(`/api/work/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const json = (await res.json()) as { authorizeUrl?: string; error?: string };
    if (json.authorizeUrl) {
      window.open(json.authorizeUrl, "_blank", "noopener,noreferrer");
      setSignal(`${provider} OAuth started — complete in new tab`);
    } else {
      setSignal(json.error ?? "OAuth start failed");
    }
  };

  const linkHubSpot = async () => {
    const res = await fetch("/api/work/hubspot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const json = (await res.json()) as { authorizeUrl?: string; demo?: boolean; detail?: string; error?: string };
    if (json.authorizeUrl) {
      window.open(json.authorizeUrl, "_blank", "noopener,noreferrer");
      setSignal("HubSpot OAuth started — complete in new tab");
    } else if (json.demo) {
      setSignal(json.detail ?? "HubSpot OAuth demo mode — set HUBSPOT_CLIENT_ID in digital.env");
    } else {
      setSignal(json.error ?? "HubSpot OAuth start failed");
    }
  };

  const show = (sectionId: string) => workSectionVisible(sectionId, workspaceTab, growthLevel);
  const addOpportunity = () => {
    const name = prompt(`${workTerm(growthLevel, "lead")} name`);
    const email = prompt("Email");
    if (name && email) void action({ action: "create_lead", name, email });
  };
  const goLiveChip =
    workspaceTab !== "start" && goLive
      ? goLive.liveReady
        ? "live"
        : goLive.demoReady
          ? "demo"
          : null
      : null;

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("my-work").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">{workspace}</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Outreach Claw · {status?.source === "live" ? "live SMTP" : "demo queue"} · mesh {motorUp ? "linked" : "idle"} · {signal}
          {goLiveChip ? (
            <span className="ml-2 border border-cursor-glow/50 px-1 uppercase text-cursor-glow">{goLiveChip} ready</span>
          ) : null}
          {status?.outboundKillSwitch ? (
            <span className="ml-2 border border-red-400/50 px-1 uppercase text-red-400">kill switch</span>
          ) : null}
          <WorkLevelBadge growthLevel={growthLevel} />
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="border border-line px-2 py-0.5 font-mono text-[10px] uppercase text-muted hover:text-stark"
          >
            Setup wizard
          </button>
        </div>
      </header>

      <WorkWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} growthLevel={growthLevel} />

      {workFeatureVisible(growthLevel, "level-up-nudge") && status?.stats ? (
        <WorkLevelUpNudge growthLevel={growthLevel} stats={status.stats} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <AppMetric
          label={workTerm(growthLevel, "pipeline")}
          value={String(status?.stats.leadsInPipeline ?? "—")}
          unit={workTerm(growthLevel, "leadPlural").toLowerCase()}
          highlight
        />
        <AppMetric label="Active Seq" value={String(status?.stats.activeSequences ?? "—")} unit="running" />
        <AppMetric
          label="Sends today"
          value={String(status?.sendPolicy?.sendsToday ?? "—")}
          unit={`${status?.sendPolicy?.remainingToday ?? "—"} left`}
        />
        <AppMetric label="Replies" value={String(status?.stats.repliesThisWeek ?? "—")} unit="this week" />
      </div>

      {show("executive-brief") ? (
        <WorkExecutiveBriefPanel
          growthLevel={growthLevel}
          brief={executiveBrief}
          onRefresh={() => void postWork({ action: "executive_brief" }).then((j) => {
            const bj = j as { brief?: WorkExecutiveBrief };
            if (bj.brief) setExecutiveBrief(bj.brief);
          })}
        />
      ) : null}

      {show("needs-you") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="needs-you" minLevel="expert" title="Needs you" subtitle="P1 · approvals · interested mail · SLA chips">
          <WorkNeedsYouPanel summary={needsYou} items={stallItems} />
        </ExperienceAppSection>
      ) : null}

      {show("start-home") ? (
        <ExperienceAppSection
          appId="my-work"
          skipExperienceGate
          sectionId="start-home"
          minLevel="beginner"
          title="Home"
          subtitle={workTerm(growthLevel, "deskSubtitle")}
        >
          <WorkStartHomePanel
            growthLevel={growthLevel}
            mailIndex={status?.mailIndex ?? []}
            tasks={status?.tasks ?? []}
            templatePacks={templatePacks}
            defaultPackId={defaultPackId}
            focusMailId={focusMailId}
            onApplyPack={async (packId) => {
              await postWork({ action: "apply_template_pack", packId });
              await loadBootstrap();
            }}
            onAddOpportunity={addOpportunity}
            onToggleTask={(taskId) => void action({ action: "toggle_task", taskId })}
            showIntegrationsPeek={workFeatureVisible(growthLevel, "integrations-peek")}
            onOpenIntegrations={() => setWorkspaceTab("integrations")}
            onSelectWaitingMail={(mailId) => {
              setFocusMailId(mailId);
              if (growthLevel === "L1") setWorkspaceTab("start");
            }}
            onDraftReply={(mailId) => draftReplyForMail(mailId)}
            onUseTemplateInDraft={(template) => {
              const mailId = focusMailId ?? status?.mailIndex.find((m) => !m.leadId)?.id;
              if (mailId) {
                draftReplyForMail(mailId, `${template.subject}\n\n${template.body}`);
              } else {
                setDraftReplyPreview(`${template.subject}\n\n${template.body}`);
                setSignal("Template loaded — add a message or opportunity to send");
              }
            }}
          />
          {meetsGrowthLevel(growthLevel, "L2") ? (
            <div className="mt-4">
              <WorkSignalStrip
                signals={signals}
                busy={signalBusy}
                onConvert={(signalId) => {
                  setSignalBusy(true);
                  void postWork({ action: "signal_to_opportunity", signalId })
                    .then(() => loadBootstrap())
                    .finally(() => setSignalBusy(false));
                }}
              />
            </div>
          ) : null}
          {draftReplyPreview && growthLevel === "L1" ? (
            <pre className="mt-3 whitespace-pre-wrap border border-line/60 p-2 font-mono text-[10px] text-stark">{draftReplyPreview}</pre>
          ) : null}
        </ExperienceAppSection>
      ) : null}

      {show("morning-brief") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="morning-brief" minLevel="beginner" title="Morning brief" subtitle="Mail + calendar + tasks on mount">
          <WorkMorningBriefPanel />
        </ExperienceAppSection>
      ) : null}

      {show("go-live") ? (
        <ExperienceAppSection
          appId="my-work"
          skipExperienceGate
          sectionId="go-live"
          minLevel="beginner"
          title={workTerm(growthLevel, "goLive")}
          subtitle="Checklist before first outbound send"
        >
          <WorkGoLivePanel
            report={goLive}
            onRefresh={() => void refreshGoLive()}
            onRunDemoTour={runDemoTour}
            onOpenSetupWizard={() => setWizardOpen(true)}
            onAckSuppression={() =>
              void postWork({ action: "ack_suppression_review" }).then((json) => {
                if (json.goLive) setGoLive(json.goLive);
                void loadBootstrap();
              })
            }
            demoTourRunning={demoTourRunning}
          />
        </ExperienceAppSection>
      ) : null}

      {show("tasks") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="tasks" minLevel="beginner" title="Task matrix" subtitle="P1 first · tap to complete">
          <div className="space-y-2 font-mono text-xs">
            {(status?.tasks ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void action({ action: "toggle_task", taskId: t.id })}
                className={`grid w-full grid-cols-[auto_1fr_auto] gap-2 border px-3 py-2 text-left ${
                  t.priority === "P1" ? "border-cursor-glow/60" : "border-line"
                } ${t.done ? "text-muted line-through" : "text-stark"}`}
              >
                <span className={t.priority === "P1" ? "text-cursor-glow" : "text-muted"}>{t.priority}</span>
                <span>{t.title}</span>
                <span className="text-[10px] text-muted">{t.done ? "DONE" : "OPEN"}</span>
              </button>
            ))}
          </div>
        </ExperienceAppSection>
      ) : null}

      {show("pipeline") ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ExperienceAppSection
            appId="my-work"
            sectionId="pipeline"
            minLevel="beginner"
            title={workTerm(growthLevel, "pipeline")}
            subtitle={`${workTerm(growthLevel, "crm")} · local store`}
          >
            <WorkPipelinePanel
              leads={status?.leads ?? []}
              selectedLeadId={selectedLeadId}
              growthLevel={growthLevel}
              onSelect={setSelectedLeadId}
              onStageChange={(leadId, stage: LeadStage) => void action({ action: "update_lead_stage", leadId, stage })}
              onAddLead={addOpportunity}
              syncBadgeForLead={(id) => syncBadges[id] ?? "synced"}
              onEnrich={
                workFeatureVisible(growthLevel, "mini-sequence")
                  ? (leadId) => void postWork({ action: "enrich_lead", leadId }).then(() => loadBootstrap())
                  : undefined
              }
              onBookMeeting={
                workFeatureVisible(growthLevel, "mini-sequence")
                  ? (leadId) => void postWork({ action: "book_meeting", leadId }).then(() => loadBootstrap())
                  : undefined
              }
            />
            {workFeatureVisible(growthLevel, "kanban") ? (
              <div className="mt-3 border-t border-line/60 pt-3">
                <p className="mb-2 font-mono text-[10px] uppercase text-muted">Kanban · drag to stage</p>
                <WorkPipelineKanban
                  leads={status?.leads ?? []}
                  selectedLeadId={selectedLeadId}
                  onSelect={setSelectedLeadId}
                  onStageChange={(leadId, stage) => void action({ action: "update_lead_stage", leadId, stage })}
                />
              </div>
            ) : null}
            {workFeatureVisible(growthLevel, "import") ? (
              <div className="mt-3 border-t border-line/60 pt-3">
                <WorkImportPanel
                  onImport={async (csv) => {
                    const json = await postWork({ action: "import_leads", csv });
                    await loadBootstrap();
                    return {
                      imported: (json as { imported?: number }).imported,
                      skipped: (json as { skipped?: number }).skipped,
                      error: json.error,
                    };
                  }}
                />
              </div>
            ) : null}
            {workFeatureVisible(growthLevel, "mini-sequence") ? (
              <div className="mt-3 border-t border-line/60 pt-3">
                <p className="mb-2 font-mono text-[10px] uppercase text-muted">Mini-sequence wizard</p>
                <WorkMiniSequenceWizard
                  leadId={selectedLeadId}
                  leadName={status?.leads.find((l) => l.id === selectedLeadId)?.name}
                  onCreate={async (presetId) => {
                    await postWork({ action: "create_mini_sequence", leadId: selectedLeadId, presetId });
                    await loadBootstrap();
                  }}
                />
              </div>
            ) : null}
            {workFeatureVisible(growthLevel, "pipeline") ? (
              <div className="mt-3 border-t border-line/60 pt-3">
                <p className="mb-2 font-mono text-[10px] uppercase text-muted">Activity timeline</p>
                <WorkLeadActivityPanel
                  leadId={selectedLeadId || null}
                  leadName={status?.leads.find((l) => l.id === selectedLeadId)?.name}
                  events={leadActivity}
                  loading={leadActivityLoading}
                  onRefresh={() => void loadLeadActivity(selectedLeadId)}
                />
              </div>
            ) : null}
          </ExperienceAppSection>

          {show("sequences") ? (
            <ExperienceAppSection
              appId="my-work"
              sectionId="sequences"
              minLevel="standard"
              title={workTerm(growthLevel, "sequence") + "s"}
              subtitle="Multi-step outbound · pause on reply"
            >
              <WorkSequencePanel
                sequences={status?.sequences ?? []}
                selectedSequenceId={selectedSequenceId}
                sequenceLabel={workTerm(growthLevel, "sequence")}
                showBranchingHint={workFeatureVisible(growthLevel, "reply-intent")}
                onSelect={setSelectedSequenceId}
                onActivate={(id) => void activateSequence(id)}
                onPause={(id) => void action({ action: "pause_sequence", sequenceId: id })}
                onMarkReplied={(id) => void action({ action: "mark_replied", sequenceId: id })}
                onDraft={() => void action({ action: "draft_sequence", leadId: selectedLeadId || undefined })}
                onMcpPreview={
                  workFeatureVisible(growthLevel, "mcp")
                    ? (id) => void openMcpConfirm(id)
                    : undefined
                }
              />
            </ExperienceAppSection>
          ) : null}
        </div>
      ) : null}

      {show("outbound") && !show("pipeline") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="outbound" minLevel="standard" title="Outbound queue" subtitle={`Lane ${lane} · send log`}>
          <WorkOutboundPanel
            sends={status?.sends ?? []}
            onRetry={(sendId) => void action({ action: "send_now", sendId })}
            onUndo={(sendId) => undoComposeSend(sendId)}
          />
        </ExperienceAppSection>
      ) : null}

      {show("pipeline") && show("outbound") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="outbound" minLevel="standard" title="Outbound queue" subtitle={`Lane ${lane} · send log`}>
          <WorkOutboundPanel
            sends={status?.sends ?? []}
            onRetry={(sendId) => void action({ action: "send_now", sendId })}
            onUndo={(sendId) => undoComposeSend(sendId)}
          />
        </ExperienceAppSection>
      ) : null}

      {show("comms") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="comms" minLevel="standard" title="Comms desk" subtitle="Unified inbox · auto-pause sequences on reply" showCoach={false}>
          <UnifiedInboxPanel embedded />
        </ExperienceAppSection>
      ) : null}

      {show("inbox-triage") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="inbox-triage" minLevel="standard" title="Inbox triage" subtitle="Reply intent · assign · draft reply">
          <WorkInboxTriagePanel
            rows={status?.mailIndex ?? []}
            tasks={status?.tasks ?? []}
            leads={status?.leads ?? []}
            highlightMailId={focusMailId}
            currentOperatorId={operatorId}
            canAssign={canAssign}
            onAssign={(mailId, leadId, opts) => {
              void postWork({
                action: "assign_mail_to_lead",
                mailId,
                leadId,
                assignedTo: operatorId,
                force: opts?.force,
              }).then((json) => {
                const aj = json as { collision?: boolean; assignedTo?: string; error?: string };
                if (aj.collision) {
                  setSignal(`Assign collision — mail held by ${aj.assignedTo ?? "another operator"}`);
                  return;
                }
                if (json.error) {
                  setSignal(json.error);
                  return;
                }
                void loadBootstrap();
              });
            }}
            onSetInternalNote={(mailId, note) => {
              void postWork({ action: "set_mail_internal_note", mailId, note }).then(() => loadBootstrap());
            }}
            onTagIntent={(mailId, intent) => void action({ action: "tag_reply_intent", mailId, intent })}
            onDraftReply={(mailId) => draftReplyForMail(mailId)}
            onSnooze={(mailId) => void action({ action: "snooze_mail", mailId })}
            onArchive={(mailId) => void action({ action: "archive_mail", mailId })}
            onMarkDone={(mailId) => void action({ action: "mark_mail_done", mailId })}
            undoSendId={composeSendFeedback?.undoPending ? composeSendFeedback.sendId : null}
            onUndoSend={
              composeSendFeedback?.undoPending
                ? () => undoComposeSend(composeSendFeedback.sendId)
                : undefined
            }
          />
          <WorkComposeStrip
            mailId={focusMailId}
            draftPreview={draftReplyPreview}
            onDraftReply={(id, prompt) => draftReplyForMail(id, prompt)}
            onSendReply={(mailId, subject, body) => {
              setComposeSendBusy(true);
              void postWork({ action: "compose_send", mailId, subject, body })
                .then((json) => {
                  const cj = json as {
                    sendId?: string;
                    sendStatus?: string;
                    undoUntil?: string | null;
                    undoPending?: boolean;
                    error?: string;
                    ok?: boolean;
                  };
                  if (cj.sendId) {
                    setComposeSendFeedback({
                      sendId: cj.sendId,
                      sendStatus: cj.sendStatus ?? "queued",
                      undoUntil: cj.undoUntil,
                      undoPending: cj.undoPending ?? cj.sendStatus === "queued",
                      error: cj.error ?? null,
                    });
                    setSignal(
                      cj.undoPending
                        ? `Queued · undo open (${cj.sendId})`
                        : cj.error
                          ? `Send failed — ${cj.error}`
                          : `${cj.sendStatus ?? "sent"} · ${cj.sendId}`,
                    );
                  }
                  return loadBootstrap();
                })
                .finally(() => setComposeSendBusy(false));
            }}
            sendBusy={composeSendBusy}
            sendFeedback={composeSendFeedback}
            canSend={canSend}
            onUndoSend={undoComposeSend}
            onOpenOutbound={() => setWorkspaceTab("outreach")}
            onClear={() => {
              setDraftReplyPreview("");
              setComposeSendFeedback(null);
            }}
          />
          {draftReplyPreview ? (
            <pre className="mt-3 whitespace-pre-wrap border border-line/60 p-2 font-mono text-[10px] text-stark">{draftReplyPreview}</pre>
          ) : null}
        </ExperienceAppSection>
      ) : null}

      {show("sync-log") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="sync-log" minLevel="expert" title="Mail index" subtitle="Reply intent tagging · offline queue">
          <WorkMailIndexPanel
            rows={status?.mailIndex ?? []}
            onTagIntent={(mailId, intent: ReplyIntent) => void action({ action: "tag_reply_intent", mailId, intent })}
          />
        </ExperienceAppSection>
      ) : null}

      {show("analytics") && status?.analytics ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="analytics" minLevel="standard" title="Outreach analytics" subtitle="Opens · replies · send limits · reply intent">
          <WorkAnalyticsPanel
            analytics={status.analytics}
            sendPolicy={status.sendPolicy}
            lite={growthLevel === "L2"}
          />
        </ExperienceAppSection>
      ) : null}

      {show("deliverability") && status?.deliverability ? (
        <ExperienceAppSection
          appId="my-work"
          skipExperienceGate
          sectionId="deliverability"
          minLevel="standard"
          title="Deliverability"
          subtitle="Domain health · failures · send reputation"
        >
          <WorkTrustCenterStrip
            outboundKillSwitch={status.outboundKillSwitch}
            suppressionCount={status.suppressionList?.length ?? 0}
            bridgeConfigured={status.bridgeConfigured}
            onToggleKillSwitch={() =>
              void action({
                action: "set_outbound_kill_switch",
                outboundKillSwitch: !status.outboundKillSwitch,
              })
            }
          />
          <div className="mt-3">
            <WorkDeliverabilityPanel
              deliverability={status.deliverability as Parameters<typeof WorkDeliverabilityPanel>[0]["deliverability"]}
              bridgeConfigured={status.bridgeConfigured}
              sendsToday={status.sendPolicy?.sendsToday}
              effectiveDailyLimit={status.sendPolicy?.effectiveDailyLimit}
              suppressed={status.suppressionList ?? []}
              unblockBusy={suppressionBusy}
              onUnblock={(email) => {
                setSuppressionBusy(true);
                void postWork({ action: "remove_suppression", email })
                  .then(() => loadBootstrap())
                  .finally(() => setSuppressionBusy(false));
              }}
            />
          </div>
        </ExperienceAppSection>
      ) : null}

      {show("approval") ? (
        <ExperienceAppSection
          appId="my-work"
          skipExperienceGate
          sectionId="approval"
          minLevel="standard"
          title="Send approval"
          subtitle="Human gate before outbound"
        >
          <div id="work-send-approval">
          <WorkApprovalPolicyPanel
            requireSendApproval={status?.requireSendApproval ?? false}
            envForced={status?.requireSendApprovalEnvForced}
            growthDefault={status?.requireSendApprovalFre == null}
            busy={policyBusy}
            onToggle={(value) =>
              void action({ action: "set_require_send_approval", requireSendApproval: value }).then(() =>
                loadBootstrap(),
              )
            }
          />
          <WorkApprovalPanel
            sends={status?.sends ?? []}
            highlightSendId={highlightSendId}
            canApprove={canApprove}
            onApprove={async (sendId) => {
              await postWork({ action: "approve_send", sendId });
              await loadBootstrap();
            }}
            onReject={async (sendId) => {
              await postWork({ action: "reject_send", sendId });
              await loadBootstrap();
            }}
            onRefresh={() => void loadBootstrap()}
          />
          </div>
        </ExperienceAppSection>
      ) : null}

      {show("kill-switch") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="kill-switch" minLevel="expert" title="Outbound kill switch" subtitle="Block all sequence sends">
          <button
            type="button"
            onClick={() =>
              void action({
                action: "set_outbound_kill_switch",
                outboundKillSwitch: !status?.outboundKillSwitch,
              })
            }
            className={`border px-3 py-1 font-mono text-[10px] uppercase ${
              status?.outboundKillSwitch ? "border-red-400 text-red-400" : "border-line text-muted"
            }`}
          >
            {status?.outboundKillSwitch ? "Clear kill switch" : "Enable kill switch"}
          </button>
        </ExperienceAppSection>
      ) : null}

      {show("send-policy") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="send-policy" minLevel="expert" title="Send policy" subtitle="Daily limit · stagger · auto-send on activate">
          <WorkSendPolicyPanel
            autoSendOnActivate={status?.autoSendOnActivate ?? false}
            defaultAutoSend={status?.autoSendDefault ?? false}
            bridgeConfigured={status?.bridgeConfigured ?? false}
            sendStaggerMinutes={status?.sendPolicy?.sendStaggerMinutes ?? 5}
            dailySendLimit={status?.sendPolicy?.dailySendLimit ?? 50}
            busy={policyBusy}
            onToggleAutoSend={(value) => {
              setPolicyBusy(true);
              void action({ action: "update_send_policy", autoSendOnActivate: value }).finally(() => setPolicyBusy(false));
            }}
          />
        </ExperienceAppSection>
      ) : null}

      {show("recovery") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="recovery" minLevel="standard" title="Send recovery" subtitle="Retry failed bridge sends">
          <WorkRecoveryPanel
            failed={failedSends}
            onRetry={(sendId) => void action({ action: "recovery_retry", sendId })}
            onRefresh={() => void loadRecovery()}
          />
        </ExperienceAppSection>
      ) : null}

      {show("day-brief") && dayBrief ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="day-brief" minLevel="standard" title="Day brief" subtitle="Local LLM summary">
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-stark">{dayBrief}</pre>
        </ExperienceAppSection>
      ) : null}

      {show("audit-timeline") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="audit-timeline" minLevel="standard" title="Agent audit" subtitle="Last 20 agent actions">
          <WorkAuditTimelinePanel
            entries={auditLog}
            onRefresh={() => void postWork({ action: "audit_list" }).then((j) => {
              const aj = j as { audit?: WorkAgentAuditEntry[] };
              if (aj.audit) setAuditLog(aj.audit);
            })}
          />
        </ExperienceAppSection>
      ) : null}

      {show("connector-vault") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="connector-vault" minLevel="expert" title="Connector vault" subtitle="SMTP · Google · Slack · Notion · Twenty · n8n">
          <WorkConnectorVaultPanel
            report={status?.connectorVault ?? null}
            onRefresh={() => void loadBootstrap()}
            onLinkGoogle={() => void linkOAuth("google")}
            onLinkMicrosoft={() => void linkOAuth("microsoft")}
            onLinkNotion={() => void linkOAuth("notion")}
            onLinkHubSpot={() => void linkHubSpot()}
          />
        </ExperienceAppSection>
      ) : null}

      {show("crm-conflicts") ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="crm-conflicts" minLevel="expert" title="CRM conflicts" subtitle="Twenty sync merge">
          <WorkCrmConflictPanel
            conflicts={crmConflicts}
            syncLog={status?.syncLog ?? []}
            onResolve={(conflictId, resolution) =>
              void postWork({
                action: "resolve_crm_conflict",
                conflictId,
                resolution: resolution === "take_remote" ? "take_remote" : "keep_local",
                winner: resolution === "take_remote" ? "remote" : "local",
              }).then(() => loadBootstrap())
            }
          />
        </ExperienceAppSection>
      ) : null}

      {show("sync-audit") && (status?.syncLog?.length ?? 0) > 0 ? (
        <ExperienceAppSection appId="my-work" skipExperienceGate sectionId="sync-audit" minLevel="expert" title="Sync log" subtitle="Integration audit trail">
          <div className="space-y-1 font-mono text-[10px]">
            {(status?.syncLog ?? []).slice(0, 20).map((entry) => (
              <div key={entry.id} className="border border-line/60 px-2 py-1">
                <span className="text-cursor-glow">{entry.connector}</span> · {entry.action} · {entry.detail}
                <span className="ml-2 text-muted">{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </ExperienceAppSection>
      ) : null}

      <WorkSetupWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={() => {
          setWizardOpen(false);
          void loadBootstrap();
          setSignal("Setup wizard complete");
        }}
      />
      <WorkPreSendModal
        open={Boolean(preSendModal)}
        missing={preSendModal?.missing ?? []}
        onClose={() => setPreSendModal(null)}
        onOpenSetupWizard={() => setWizardOpen(true)}
      />
      <WorkMcpConfirmModal
        open={Boolean(mcpConfirm)}
        sequenceId={mcpConfirm?.sequenceId ?? null}
        preview={(mcpConfirm?.preview as { to?: string; subject?: string; body?: string; confirmRequired?: string }) ?? null}
        loading={mcpConfirm?.loading}
        error={mcpConfirm?.error}
        onClose={() => setMcpConfirm(null)}
        onConfirm={() => setMcpConfirm(null)}
      />
    </div>
  );
}
