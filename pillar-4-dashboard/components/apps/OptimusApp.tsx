"use client";

import { useState } from "react";

import { PreviewModuleBanner } from "@/components/app-shared/PreviewModuleBanner";
import { KinCrossLink } from "@/components/app-shared/KinCrossLink";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { HumanoidFleetPanel } from "@/components/apps/humanoid/HumanoidFleetPanel";
import { HumanoidHomePanel } from "@/components/apps/humanoid/HumanoidHomePanel";
import { HumanoidKnowledgePanel } from "@/components/apps/humanoid/HumanoidKnowledgePanel";
import { HumanoidRoutinesPanel } from "@/components/apps/humanoid/HumanoidRoutinesPanel";
import {
  HumanoidWorkspaceTabs,
  type HumanoidWorkspaceTab,
} from "@/components/apps/humanoid/HumanoidWorkspaceTabs";
import { OptimusHardwarePanel } from "@/components/apps/signal/OptimusHardwarePanel";
import { ExperienceLevelBadge } from "@/components/experience/ExperienceLevelBadge";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";

const TAB_STATUS: Record<HumanoidWorkspaceTab, string> = {
  home: "Home humanoid hub · setup & relationship",
  fleet: "Robot fleet · pair-day wizard preview",
  knowledge: "Knowledge mesh · house rules & context",
  routines: "Instruction templates · armed for pair day",
  control: "Motor mesh preview · safety & torque",
};

export function OptimusApp(ctx: AgentAppContext) {
  const { config } = ctx;
  const unitId = typeof config.unitId === "string" ? config.unitId : "OPTIMUS-01";
  const [tab, setTab] = useState<HumanoidWorkspaceTab>("home");
  const [statusLine, setStatusLine] = useState(TAB_STATUS.home);

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("tesla-optimus-engine").name}
          <PreviewModuleBanner appId="tesla-optimus-engine" compact />
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Humanoid Home Hub</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          {statusLine} · unit ref {unitId}
          <ExperienceLevelBadge />
        </p>
      </header>

      <PreviewModuleBanner appId="tesla-optimus-engine" />

      <KinCrossLink variant="optimus" />

      <HumanoidWorkspaceTabs
        active={tab}
        onChange={(next) => {
          setTab(next);
          setStatusLine(TAB_STATUS[next]);
        }}
      />

      {tab === "home" ? (
        <ExperienceAppSection
          appId="tesla-optimus-engine"
          sectionId="home-hub"
          minLevel="beginner"
          title="Humanoid Home Hub"
          subtitle="Teach · instruct · relate — before pair day"
        >
          <HumanoidHomePanel
            onStatus={setStatusLine}
            onSyncRequest={() => setStatusLine("Knowledge pushed to mesh")}
            onOpenFleet={() => {
              setTab("fleet");
              setStatusLine(TAB_STATUS.fleet);
            }}
          />
        </ExperienceAppSection>
      ) : null}
      {tab === "fleet" ? (
        <ExperienceAppSection
          appId="tesla-optimus-engine"
          sectionId="fleet"
          minLevel="beginner"
          title="Home Robot Fleet"
          subtitle="Humanoid · mobile · arm · custom — pair-day wizard preview"
        >
          <HumanoidFleetPanel onStatus={setStatusLine} />
        </ExperienceAppSection>
      ) : null}
      {tab === "knowledge" ? <HumanoidKnowledgePanel onStatus={setStatusLine} /> : null}
      {tab === "routines" ? <HumanoidRoutinesPanel onStatus={setStatusLine} /> : null}
      {tab === "control" ? <OptimusHardwarePanel {...ctx} /> : null}
    </div>
  );
}
