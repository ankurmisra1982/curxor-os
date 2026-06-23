"use client";

import { useCallback, useEffect, useState } from "react";

import type { ForgedAppRecord } from "@/lib/forged-apps-types";
import { forgedAgentFromRecord } from "@/lib/forged-agent-catalog";
import { ForgeProvisioningBadge } from "@/components/apps/forge/ForgeProvisioningBadge";
import {
  ForgedBlankDeskPanel,
  ForgedCapitalDeskPanel,
  ForgedCreatorDeskPanel,
  ForgedKioskDeskPanel,
  ForgedWorkDeskPanel,
} from "@/components/apps/forge/forged/ForgedDeskPanels";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { forgePersonaLabel } from "@/lib/forge-level-copy";
import { forgedSectionVisible } from "@/lib/forged-level-gates";
import type { ForgeTemplateId } from "@/lib/forge-templates";

interface ForgedClawWorkspaceProps extends AgentAppContext {
  forgedApp: ForgedAppRecord;
}

function TemplateDeskPanel({
  templateId,
  forgedApp,
  config,
  refreshKey,
  onSkillHint,
  updateWorkspaceContext,
}: {
  templateId: string;
  forgedApp: ForgedAppRecord;
  config: Record<string, unknown>;
  refreshKey: number;
  onSkillHint?: (skillId: string) => void;
  updateWorkspaceContext?: (patch: Record<string, unknown>) => void;
}) {
  const props = {
    forgedAppId: forgedApp.id,
    config,
    refreshKey,
    onSkillHint,
    updateWorkspaceContext,
  };

  switch (templateId as ForgeTemplateId) {
    case "work-desk":
      return <ForgedWorkDeskPanel {...props} />;
    case "creator-desk":
      return <ForgedCreatorDeskPanel {...props} />;
    case "capital-desk":
      return <ForgedCapitalDeskPanel {...props} />;
    case "kiosk-desk":
      return <ForgedKioskDeskPanel {...props} />;
    default:
      return <ForgedBlankDeskPanel {...props} />;
  }
}

export function ForgedClawWorkspace({
  forgedApp,
  config,
  skillTick,
  lastSkillId,
  onSkill,
  updateWorkspaceContext,
}: ForgedClawWorkspaceProps) {
  const agent = forgedAgentFromRecord(forgedApp);
  const growthLevel = forgedApp.growthLevel;
  const persona = forgePersonaLabel(growthLevel);
  const [deskRefreshKey, setDeskRefreshKey] = useState(0);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const deskTemplates = new Set(["work-desk", "creator-desk", "capital-desk"]);
    if (!deskTemplates.has(forgedApp.templateId) || bootstrapped) return;
    void fetch(`/api/forged/${forgedApp.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dashboard_bootstrap" }),
    }).then(() => {
      setBootstrapped(true);
      setDeskRefreshKey((k) => k + 1);
    });
  }, [forgedApp.id, forgedApp.templateId, bootstrapped]);

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    const serverExecuted = new Set([
      "create_lead",
      "draft_sequence",
      "send_sequence_step",
      "draft_post",
      "schedule_post",
      "research_ticker",
      "create_rule",
      "arm_rule",
      "publish_context",
    ]);
    if (!serverExecuted.has(lastSkillId)) return;
    setDeskRefreshKey((k) => k + 1);
  }, [skillTick, lastSkillId]);

  const onSkillHint = useCallback(
    (skillId: string) => {
      onSkill(skillId);
    },
    [onSkill],
  );

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          Forged · {forgedApp.templateId}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">{forgedApp.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted">
          <span>{agent.agentName}</span>
          <ForgeProvisioningBadge mode={forgedApp.provisioningMode} />
          <span className="border border-line/80 px-1.5 py-0.5 uppercase tracking-widest">{persona}</span>
        </p>
      </header>

      {forgedSectionVisible(growthLevel, "mission", forgedApp.templateId) ? (
        <ExperienceAppSection
          appId="claw-forge"
          sectionId="forged-intent"
          minLevel="beginner"
          title="Mission Brief"
          subtitle="Seeded from The Forge · agent workspace on appliance"
        >
          <p className="font-mono text-xs text-stark">{forgedApp.intent}</p>
          {typeof config.deskFocus === "string" && config.deskFocus ? (
            <p className="mt-2 font-mono text-[10px] text-muted">Focus: {config.deskFocus}</p>
          ) : null}
          <p className="mt-3 font-mono text-[10px] text-muted">
            Mesh: {forgedApp.meshConnected ? "opt-in publish enabled" : "isolated"} · Route {forgedApp.href}
          </p>
        </ExperienceAppSection>
      ) : null}

      {forgedSectionVisible(growthLevel, "desk-panel", forgedApp.templateId) ? (
        <ExperienceAppSection
          appId="claw-forge"
          sectionId="forged-desk"
          minLevel="beginner"
          title="Desk Panel"
          subtitle={
            forgedApp.templateId === "work-desk"
              ? "Local pipeline · leads and sequences on appliance"
              : forgedApp.templateId === "creator-desk"
                ? "Local content queue · drafts and schedule on appliance"
                : forgedApp.templateId === "capital-desk"
                  ? "Local watchlist and rules · paper path on appliance"
                  : `${forgedApp.templateId} template · tap skills in agent console`
          }
        >
          <TemplateDeskPanel
            templateId={forgedApp.templateId}
            forgedApp={forgedApp}
            config={config}
            refreshKey={deskRefreshKey}
            onSkillHint={onSkillHint}
            updateWorkspaceContext={updateWorkspaceContext}
          />
        </ExperienceAppSection>
      ) : null}

      {forgedSectionVisible(growthLevel, "mesh", forgedApp.templateId) ? (
        <ExperienceAppSection
          appId="claw-forge"
          sectionId="forged-mesh"
          minLevel="standard"
          title="Mesh & Workspace"
          subtitle="SOUL / TOOLS / HEARTBEAT on appliance"
        >
          <ul className="space-y-2 font-mono text-[11px] text-muted">
            <li>✓ FRE + agent workspace seeded</li>
            <li>✓ Growth persona: {persona} ({growthLevel})</li>
            <li>✓ Agent console + local inference when Pillar 1 is up</li>
            {forgedApp.templateId === "work-desk" ? (
              <li>✓ Pipeline stored in agent-workspace/{forgedApp.id}/work-queue.json</li>
            ) : null}
            {forgedApp.templateId === "creator-desk" ? (
              <li>✓ Content queue stored in agent-workspace/{forgedApp.id}/content-queue.json</li>
            ) : null}
            {forgedApp.templateId === "capital-desk" ? (
              <li>✓ Capital desk stored in agent-workspace/{forgedApp.id}/capital-queue.json</li>
            ) : null}
          </ul>
        </ExperienceAppSection>
      ) : null}

      {forgedSectionVisible(growthLevel, "skills", forgedApp.templateId) ? (
        <ExperienceAppSection
          appId="claw-forge"
          sectionId="forged-skills"
          minLevel="expert"
          title="Skills"
          subtitle="Server-executed on work / creator / capital desks · plan skills elsewhere"
        >
          <ul className="space-y-1 font-mono text-[10px] text-muted">
            {agent.skills.map((s) => {
              const serverSkill =
                (forgedApp.templateId === "work-desk" && (s.id === "create_lead" || s.id === "draft_sequence")) ||
                (forgedApp.templateId === "creator-desk" && (s.id === "draft_post" || s.id === "schedule_post")) ||
                (forgedApp.templateId === "capital-desk" &&
                  (s.id === "research_ticker" || s.id === "create_rule" || s.id === "arm_rule")) ||
                s.id === "publish_context";
              return (
                <li key={s.id}>
                  {s.label} · {s.kind}
                  {serverSkill ? " · server" : ""}
                </li>
              );
            })}
          </ul>
        </ExperienceAppSection>
      ) : null}
    </div>
  );
}
