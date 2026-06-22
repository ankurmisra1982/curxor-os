"use client";

import { useCallback, useEffect, useState } from "react";

import { AppMetric } from "@/components/app-shared/AppLayout";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ExperienceLevelBadge } from "@/components/experience/ExperienceLevelBadge";
import { UnifiedInboxPanel } from "@/components/comms/UnifiedInboxPanel";
import { WorkGoLivePanel, type WorkGoLiveReportRow } from "@/components/apps/work/WorkGoLivePanel";
import { WorkAnalyticsPanel } from "@/components/apps/work/WorkAnalyticsPanel";
import { WorkConnectorVaultPanel } from "@/components/apps/work/WorkConnectorVaultPanel";
import { WorkImportPanel } from "@/components/apps/work/WorkImportPanel";
import { WorkMailIndexPanel } from "@/components/apps/work/WorkMailIndexPanel";
import { WorkOutboundPanel } from "@/components/apps/work/WorkOutboundPanel";
import { WorkPipelinePanel } from "@/components/apps/work/WorkPipelinePanel";
import { WorkRecoveryPanel } from "@/components/apps/work/WorkRecoveryPanel";
import { WorkSendPolicyPanel } from "@/components/apps/work/WorkSendPolicyPanel";
import { WorkSequencePanel } from "@/components/apps/work/WorkSequencePanel";
import {
  WorkWorkspaceTabs,
  defaultWorkTab,
  workSectionVisible,
  type WorkWorkspaceTab,
} from "@/components/apps/work/WorkWorkspaceTabs";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import type { LeadStage, OutboundSend, ReplyIntent, WorkQueueStatus } from "@/lib/work-queue-types";
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
  "sync_crm",
  "sync_notion_lead",
  "slack_digest",
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
  }>;
}

export function MyWorkApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { connected: motorUp } = useMotorStream();
  const { level } = useExperienceLevel();

  const [workspaceTab, setWorkspaceTab] = useState<WorkWorkspaceTab>(() => defaultWorkTab(level));
  const [status, setStatus] = useState<WorkQueueStatus | null>(null);
  const [goLive, setGoLive] = useState<WorkGoLiveReportRow | null>(null);
  const [failedSends, setFailedSends] = useState<OutboundSend[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [dayBrief, setDayBrief] = useState("");
  const [signal, setSignal] = useState("Syncing outreach desk…");
  const [demoTourRunning, setDemoTourRunning] = useState(false);
  const [policyBusy, setPolicyBusy] = useState(false);

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
  }, [applyStatus]);

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
    setWorkspaceTab(defaultWorkTab(level));
  }, [level]);

  useEffect(() => {
    void loadBootstrap();
    if (level !== "beginner") {
      void loadRecovery();
    }
    const id = setInterval(() => void loadStatus(), 30_000);
    return () => clearInterval(id);
  }, [loadBootstrap, loadRecovery, loadStatus, level]);

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
      "slack_digest",
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

      if (lastSkillId === "summarize_day" || lastSkillId === "morning_brief") {
        const action = lastSkillId === "morning_brief" ? "morning_brief" : "summarize_day";
        const briefJson = await postWork({ action });
        setDayBrief((briefJson as { brief?: string }).brief ?? "");
        setSignal(lastSkillId === "morning_brief" ? "Morning brief ready" : "Day brief ready");
        return;
      }
      if (lastSkillId === "run_demo_tour") {
        setSignal("Demo tour complete · simulated send");
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
      } else if (lastSkillId === "prep_meeting") {
        setSignal("Meeting prep ready");
      }
    })();
  }, [skillTick, lastSkillId, loadStatus, loadBootstrap, lane]);

  const runDemoTour = () => {
    setDemoTourRunning(true);
    void postWork({ action: "run_demo_tour" })
      .then((json) => {
        if (json.status) applyStatus(json.status);
        if (json.goLive) setGoLive(json.goLive);
        setSignal(json.ok ? "Demo tour complete · simulated send" : json.error ?? "Demo tour failed");
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

  const show = (sectionId: string) => workSectionVisible(sectionId, workspaceTab);

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("my-work").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">{workspace}</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Outreach Claw · {status?.source === "live" ? "live SMTP" : "demo queue"} · mesh {motorUp ? "linked" : "idle"} · {signal}
          <ExperienceLevelBadge />
        </p>
      </header>

      <WorkWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} experienceLevel={level} />

      <div className="grid gap-4 md:grid-cols-4">
        <AppMetric label="Pipeline" value={String(status?.stats.leadsInPipeline ?? "—")} unit="leads" highlight />
        <AppMetric label="Active Seq" value={String(status?.stats.activeSequences ?? "—")} unit="running" />
        <AppMetric
          label="Sends today"
          value={String(status?.sendPolicy?.sendsToday ?? "—")}
          unit={`${status?.sendPolicy?.remainingToday ?? "—"} left`}
        />
        <AppMetric label="Replies" value={String(status?.stats.repliesThisWeek ?? "—")} unit="this week" />
      </div>

      {show("go-live") ? (
        <ExperienceAppSection appId="my-work" sectionId="go-live" minLevel="beginner" title="Go Live" subtitle="Checklist before first outbound send">
          <WorkGoLivePanel
            report={goLive}
            onRefresh={() => void refreshGoLive()}
            onRunDemoTour={runDemoTour}
            demoTourRunning={demoTourRunning}
          />
        </ExperienceAppSection>
      ) : null}

      {show("tasks") ? (
        <ExperienceAppSection appId="my-work" sectionId="tasks" minLevel="beginner" title="Task matrix" subtitle="P1 first · tap to complete">
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
          <ExperienceAppSection appId="my-work" sectionId="pipeline" minLevel="beginner" title="Lead pipeline" subtitle="CRM stages · local store">
            <WorkPipelinePanel
              leads={status?.leads ?? []}
              selectedLeadId={selectedLeadId}
              onSelect={setSelectedLeadId}
              onStageChange={(leadId, stage: LeadStage) => void action({ action: "update_lead_stage", leadId, stage })}
              onAddLead={() => {
                const name = prompt("Lead name");
                const email = prompt("Email");
                if (name && email) void action({ action: "create_lead", name, email });
              }}
            />
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
          </ExperienceAppSection>

          {show("sequences") ? (
            <ExperienceAppSection appId="my-work" sectionId="sequences" minLevel="standard" title="Sequences" subtitle="Multi-step outbound · pause on reply">
              <WorkSequencePanel
                sequences={status?.sequences ?? []}
                selectedSequenceId={selectedSequenceId}
                onSelect={setSelectedSequenceId}
                onActivate={(id) => void action({ action: "activate_sequence", sequenceId: id })}
                onPause={(id) => void action({ action: "pause_sequence", sequenceId: id })}
                onMarkReplied={(id) => void action({ action: "mark_replied", sequenceId: id })}
                onDraft={() => void action({ action: "draft_sequence", leadId: selectedLeadId || undefined })}
              />
            </ExperienceAppSection>
          ) : null}
        </div>
      ) : null}

      {show("outbound") && !show("pipeline") ? (
        <ExperienceAppSection appId="my-work" sectionId="outbound" minLevel="standard" title="Outbound queue" subtitle={`Lane ${lane} · send log`}>
          <WorkOutboundPanel
            sends={status?.sends ?? []}
            onRetry={(sendId) => void action({ action: "send_now", sendId })}
          />
        </ExperienceAppSection>
      ) : null}

      {show("pipeline") && show("outbound") ? (
        <ExperienceAppSection appId="my-work" sectionId="outbound" minLevel="standard" title="Outbound queue" subtitle={`Lane ${lane} · send log`}>
          <WorkOutboundPanel
            sends={status?.sends ?? []}
            onRetry={(sendId) => void action({ action: "send_now", sendId })}
          />
        </ExperienceAppSection>
      ) : null}

      {show("comms") ? (
        <ExperienceAppSection appId="my-work" sectionId="comms" minLevel="standard" title="Comms desk" subtitle="Unified inbox · auto-pause sequences on reply" showCoach={false}>
          <UnifiedInboxPanel embedded />
        </ExperienceAppSection>
      ) : null}

      {show("sync-log") ? (
        <ExperienceAppSection appId="my-work" sectionId="sync-log" minLevel="expert" title="Mail index" subtitle="Reply intent tagging · offline queue">
          <WorkMailIndexPanel
            rows={status?.mailIndex ?? []}
            onTagIntent={(mailId, intent: ReplyIntent) => void action({ action: "tag_reply_intent", mailId, intent })}
          />
        </ExperienceAppSection>
      ) : null}

      {show("analytics") && status?.analytics ? (
        <ExperienceAppSection appId="my-work" sectionId="analytics" minLevel="standard" title="Outreach analytics" subtitle="Opens · replies · send limits · reply intent">
          <WorkAnalyticsPanel analytics={status.analytics} sendPolicy={status.sendPolicy} />
        </ExperienceAppSection>
      ) : null}

      {show("send-policy") ? (
        <ExperienceAppSection appId="my-work" sectionId="send-policy" minLevel="expert" title="Send policy" subtitle="Daily limit · stagger · auto-send on activate">
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

      {show("recovery") && level !== "beginner" ? (
        <ExperienceAppSection appId="my-work" sectionId="recovery" minLevel="standard" title="Send recovery" subtitle="Retry failed bridge sends">
          <WorkRecoveryPanel
            failed={failedSends}
            onRetry={(sendId) => void action({ action: "recovery_retry", sendId })}
            onRefresh={() => void loadRecovery()}
          />
        </ExperienceAppSection>
      ) : null}

      {show("day-brief") && dayBrief ? (
        <ExperienceAppSection appId="my-work" sectionId="day-brief" minLevel="standard" title="Day brief" subtitle="Local LLM summary">
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-stark">{dayBrief}</pre>
        </ExperienceAppSection>
      ) : null}

      {show("connector-vault") ? (
        <ExperienceAppSection appId="my-work" sectionId="connector-vault" minLevel="expert" title="Connector vault" subtitle="SMTP · Google · Slack · Notion · Twenty · n8n">
          <WorkConnectorVaultPanel
            report={status?.connectorVault ?? null}
            onRefresh={() => void loadBootstrap()}
          />
        </ExperienceAppSection>
      ) : null}

      {show("sync-audit") && (status?.syncLog?.length ?? 0) > 0 ? (
        <ExperienceAppSection appId="my-work" sectionId="sync-audit" minLevel="expert" title="Sync log" subtitle="Integration audit trail">
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
    </div>
  );
}
