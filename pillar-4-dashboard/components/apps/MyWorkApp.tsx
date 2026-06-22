"use client";

import { useCallback, useEffect, useState } from "react";

import { AppMetric } from "@/components/app-shared/AppLayout";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ExperienceLevelBadge } from "@/components/experience/ExperienceLevelBadge";
import { UnifiedInboxPanel } from "@/components/comms/UnifiedInboxPanel";
import { WorkGoLivePanel, type WorkGoLiveReportRow } from "@/components/apps/work/WorkGoLivePanel";
import { WorkAnalyticsPanel } from "@/components/apps/work/WorkAnalyticsPanel";
import { WorkImportPanel } from "@/components/apps/work/WorkImportPanel";
import { WorkMailIndexPanel } from "@/components/apps/work/WorkMailIndexPanel";
import { WorkOutboundPanel } from "@/components/apps/work/WorkOutboundPanel";
import { WorkPipelinePanel } from "@/components/apps/work/WorkPipelinePanel";
import { WorkRecoveryPanel } from "@/components/apps/work/WorkRecoveryPanel";
import { WorkSequencePanel } from "@/components/apps/work/WorkSequencePanel";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import type { LeadStage, OutboundSend, ReplyIntent, WorkQueueStatus } from "@/lib/work-queue-types";
import { getOotbApp } from "@/lib/ootb-apps";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

async function postWork(body: Record<string, unknown>) {
  const res = await fetch("/api/work/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ ok: boolean; status?: WorkQueueStatus; goLive?: WorkGoLiveReportRow; failed?: OutboundSend[]; error?: string }>;
}

export function MyWorkApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { frame, connected } = useVisionStream();
  const { command, connected: motorUp } = useMotorStream();
  const { level } = useExperienceLevel();

  const [status, setStatus] = useState<WorkQueueStatus | null>(null);
  const [goLive, setGoLive] = useState<WorkGoLiveReportRow | null>(null);
  const [failedSends, setFailedSends] = useState<OutboundSend[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [dayBrief, setDayBrief] = useState("");
  const [signal, setSignal] = useState("Syncing outreach desk…");
  const [demoTourRunning, setDemoTourRunning] = useState(false);

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
    void loadBootstrap();
    const id = setInterval(() => void loadStatus(), 30_000);
    return () => clearInterval(id);
  }, [loadBootstrap, loadStatus]);

  useEffect(() => {
    const lead = status?.leads.find((l) => l.id === selectedLeadId);
    const seq = status?.sequences.find((s) => s.id === selectedSequenceId);
    updateWorkspaceContext({
      selectedLeadId: lead?.id ?? "",
      selectedLeadName: lead?.name ?? "",
      selectedSequenceId: seq?.id ?? "",
      selectedSequenceName: seq?.name ?? "",
      selectedTaskPriority: status?.tasks.find((t) => !t.done && t.priority === "P1")?.priority ?? "",
    });
  }, [selectedLeadId, selectedSequenceId, status, updateWorkspaceContext]);

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;

    /** Already executed server-side in skill-executors — refresh desk only (avoid double mutations). */
    const serverExecuted = new Set([
      "scan_inbox",
      "summarize_day",
      "draft_sequence",
      "send_email",
      "send_sequence_step",
      "run_demo_tour",
    ]);

    void (async () => {
      if (serverExecuted.has(lastSkillId)) {
        const json = await postWork({ action: "dashboard_bootstrap" });
        if (json.status) applyStatus(json.status);
        if (json.goLive) setGoLive(json.goLive);
        if (lastSkillId === "scan_inbox") {
          setSignal("Inbox indexed · reply detection ran");
        } else if (lastSkillId === "summarize_day") {
          const briefJson = await postWork({ action: "summarize_day" });
          setDayBrief((briefJson as { brief?: string }).brief ?? "");
          setSignal("Day brief ready");
        } else if (lastSkillId === "draft_sequence") {
          setSignal("Sequence drafted");
        } else if (lastSkillId === "send_email" || lastSkillId === "send_sequence_step") {
          setSignal("Step sent · check outbound queue");
        } else if (lastSkillId === "run_demo_tour") {
          setSignal("Demo tour complete · simulated send");
        }
        return;
      }
    })();
  }, [skillTick, lastSkillId, applyStatus]);

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
    if (json.status) applyStatus(json.status);
    if (json.error) setSignal(json.error);
    return json;
  };

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

      {level === "beginner" ? (
        <ExperienceAppSection appId="my-work" sectionId="go-live" minLevel="beginner" title="Go Live" subtitle="Checklist before first outbound send">
          <WorkGoLivePanel
            report={goLive}
            onRefresh={() => void refreshGoLive()}
            onRunDemoTour={runDemoTour}
            demoTourRunning={demoTourRunning}
          />
        </ExperienceAppSection>
      ) : null}

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

      {status?.analytics ? (
        <ExperienceAppSection appId="my-work" sectionId="analytics" minLevel="standard" title="Outreach analytics" subtitle="Opens · replies · send limits · reply intent">
          <WorkAnalyticsPanel analytics={status.analytics} sendPolicy={status.sendPolicy} />
        </ExperienceAppSection>
      ) : null}

      <ExperienceAppSection appId="my-work" sectionId="comms" minLevel="standard" title="Comms desk" subtitle="Unified inbox · auto-pause sequences on reply" showCoach={false}>
        <UnifiedInboxPanel embedded />
      </ExperienceAppSection>

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
                if (json.status) applyStatus(json.status);
                return {
                  imported: (json as { imported?: number }).imported,
                  skipped: (json as { skipped?: number }).skipped,
                  error: json.error,
                };
              }}
            />
          </div>
        </ExperienceAppSection>

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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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

        <ExperienceAppSection appId="my-work" sectionId="outbound" minLevel="standard" title="Outbound queue" subtitle={`Lane ${lane} · send log`}>
          <WorkOutboundPanel
            sends={status?.sends ?? []}
            onRetry={(sendId) => void action({ action: "send_now", sendId })}
          />
        </ExperienceAppSection>
      </div>

      {level !== "beginner" ? (
        <ExperienceAppSection appId="my-work" sectionId="recovery" minLevel="standard" title="Send recovery" subtitle="Retry failed bridge sends">
          <WorkRecoveryPanel
            failed={failedSends}
            onRetry={(sendId) => void action({ action: "recovery_retry", sendId })}
            onRefresh={() => void loadRecovery()}
          />
        </ExperienceAppSection>
      ) : null}

      {dayBrief ? (
        <ExperienceAppSection appId="my-work" sectionId="day-brief" minLevel="standard" title="Day brief" subtitle="Local LLM summary">
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-stark">{dayBrief}</pre>
        </ExperienceAppSection>
      ) : null}

      <ExperienceAppSection appId="my-work" sectionId="sync-log" minLevel="expert" title="Mail index" subtitle="Reply intent tagging · offline queue">
        <WorkMailIndexPanel
          rows={status?.mailIndex ?? []}
          onTagIntent={(mailId, intent: ReplyIntent) => void action({ action: "tag_reply_intent", mailId, intent })}
        />
      </ExperienceAppSection>
    </div>
  );
}
