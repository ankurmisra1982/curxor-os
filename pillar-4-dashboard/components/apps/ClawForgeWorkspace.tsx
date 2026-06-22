"use client";



import { useCallback, useEffect, useRef, useState } from "react";



import { useRouter, useSearchParams } from "next/navigation";



import { AppMetric } from "@/components/app-shared/AppLayout";

import { ForgeFleetPanel } from "@/components/apps/forge/ForgeFleetPanel";

import { ForgeGoLivePanel, type ForgeGoLiveReportRow } from "@/components/apps/forge/ForgeGoLivePanel";

import { ForgeImportPanel } from "@/components/apps/forge/ForgeImportPanel";

import { ForgeIntentPanel } from "@/components/apps/forge/ForgeIntentPanel";

import { ForgeLevelBadge } from "@/components/apps/forge/ForgeLevelBadge";

import { ForgeLevelUpNudge } from "@/components/apps/forge/ForgeLevelUpNudge";

import { ForgeOpsPanel } from "@/components/apps/forge/ForgeOpsPanel";

import { ForgeStacksPanel } from "@/components/apps/forge/ForgeStacksPanel";

import { ForgeTemplatesPanel } from "@/components/apps/forge/ForgeTemplatesPanel";

import {

  ForgeWorkspaceTabs,

  defaultForgeTab,

  forgeTabsForGrowth,

  type ForgeWorkspaceTab,

} from "@/components/apps/forge/ForgeWorkspaceTabs";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";

import type { AgentAppContext } from "@/components/claw/ClawAgentApp";

import { useForgeAssist } from "@/components/claw/ForgeAssistProvider";

import { NewClawWizard } from "@/components/claw/NewClawWizard";

import { useExperienceLevel } from "@/components/ui/UiModeProvider";

import { useVisionStream } from "@/hooks/useVisionStream";

import type { ClawProfilesState } from "@/lib/claw-recommend";

import type { ForgeFleetCounts, ForgeFleetEntry } from "@/lib/forge-fleet";

import { resolveForgeGrowthLevel } from "@/lib/forge-growth";

import type { ForgedAppRecord } from "@/lib/forged-apps-types";

import type { GrowthLevel } from "@/lib/os-growth-level";

import type { BudgetTier } from "@/lib/local-llm-catalog";

import { getOotbApp } from "@/lib/ootb-apps";



const EMPTY_COUNTS: ForgeFleetCounts = {

  total: 0,

  profiles: 0,

  forgedApps: 0,

  island: 0,

  framework: 0,

  imported: 0,

};



export function ClawForgeWorkspace({ config, skillTick, lastSkillId }: AgentAppContext) {

  const searchParams = useSearchParams();

  const router = useRouter();

  const openedFromQuery = useRef(false);

  const lastHandledSkill = useRef(0);

  const { frame, connected } = useVisionStream();

  const { level } = useExperienceLevel();

  const forge = useForgeAssist();



  const [settingsGrowth, setSettingsGrowth] = useState<GrowthLevel | null>(null);

  const growthLevel = resolveForgeGrowthLevel(config, level, settingsGrowth);

  const [workspaceTab, setWorkspaceTab] = useState<ForgeWorkspaceTab>(() => defaultForgeTab(growthLevel));

  const [profiles, setProfiles] = useState<ClawProfilesState>({ claws: [], activeClawId: null });

  const [forgedApps, setForgedApps] = useState<ForgedAppRecord[]>([]);

  const [fleet, setFleet] = useState<ForgeFleetEntry[]>([]);

  const [fleetCounts, setFleetCounts] = useState<ForgeFleetCounts>(EMPTY_COUNTS);

  const [goLive, setGoLive] = useState<ForgeGoLiveReportRow | null>(null);

  const [cafeEventCount, setCafeEventCount] = useState(0);

  const [inferenceBackend, setInferenceBackend] = useState("unknown");

  const [demoTourRunning, setDemoTourRunning] = useState(false);

  const [budgetTier, setBudgetTier] = useState<BudgetTier>((config.defaultBudget as BudgetTier) ?? "balanced");

  const [embeddedWizardKey, setEmbeddedWizardKey] = useState(0);



  useEffect(() => {

    void fetch("/api/settings", { cache: "no-store" })

      .then((r) => (r.ok ? r.json() : null))

      .then((data) => {

        const g = data?.settings?.appearance?.forgeGrowthLevel;

        if (g === "L1" || g === "L2" || g === "L3" || g === "L4" || g === "L5") {

          setSettingsGrowth(g);

        }

      })

      .catch(() => undefined);

  }, []);



  const loadForgeStatus = useCallback(async () => {

    const res = await fetch("/api/forge/status", { cache: "no-store" });

    if (!res.ok) return;

    const data = (await res.json()) as {

      profiles: ClawProfilesState;

      forgedApps: ForgedAppRecord[];

      fleet: ForgeFleetEntry[];

      counts: ForgeFleetCounts;

      goLive?: ForgeGoLiveReportRow;

      cafeEvents?: unknown[];

    };

    setProfiles(data.profiles);

    setForgedApps(data.forgedApps);

    setFleet(data.fleet);

    setFleetCounts(data.counts);

    if (data.goLive) setGoLive(data.goLive);

    setCafeEventCount(Array.isArray(data.cafeEvents) ? data.cafeEvents.length : 0);

    setInferenceBackend(data.goLive?.inferenceBackend ?? "unknown");

  }, []);



  useEffect(() => {

    void loadForgeStatus();

  }, [loadForgeStatus]);



  useEffect(() => {

    setWorkspaceTab((prev) => {

      const visible = forgeTabsForGrowth(growthLevel);

      return visible.includes(prev) ? prev : defaultForgeTab(growthLevel);

    });

  }, [growthLevel]);



  useEffect(() => {

    if (searchParams.get("new") !== "1" || openedFromQuery.current) return;

    openedFromQuery.current = true;

    setWorkspaceTab("mint");

    forge.openWizard();

    router.replace("/claw-forge", { scroll: false });

  }, [searchParams, forge.openWizard, router]);



  const runDemoTour = useCallback(async () => {

    setDemoTourRunning(true);

    try {

      await fetch("/api/forge/status", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ action: "run_demo_tour" }),

      });

      await loadForgeStatus();

      setWorkspaceTab("fleet");

    } finally {

      setDemoTourRunning(false);

    }

  }, [loadForgeStatus]);



  useEffect(() => {

    if (skillTick === 0 || !lastSkillId || lastHandledSkill.current === skillTick) return;

    lastHandledSkill.current = skillTick;



    if (lastSkillId === "list_fleet") {

      setWorkspaceTab("fleet");

      void loadForgeStatus();

      return;

    }

    if (lastSkillId === "run_forge_demo_tour") {

      void runDemoTour();

      return;

    }

    if (lastSkillId === "attach_vision") {

      setWorkspaceTab("mint");

      forge.setLiveVision(true);

      if (frame?.previewBase64) {

        forge.setImagePreview(`data:image/jpeg;base64,${frame.previewBase64}`);

      }

    }

  }, [skillTick, lastSkillId, loadForgeStatus, forge, frame?.previewBase64, runDemoTour]);



  useEffect(() => {

    if (!forge.liveVision || !frame?.previewBase64) return;

    forge.setImagePreview(`data:image/jpeg;base64,${frame.previewBase64}`);

  }, [forge.liveVision, forge.setImagePreview, frame?.previewBase64]);



  useEffect(() => {

    if (forge.wizardPrefill.budgetTier) {

      setBudgetTier(forge.wizardPrefill.budgetTier);

    }

  }, [forge.wizardPrefill.budgetTier]);



  const onProvisioned = useCallback(() => {

    forge.closeWizard();

    forge.setIntent("");

    void loadForgeStatus();

    setWorkspaceTab("fleet");

    setEmbeddedWizardKey((k) => k + 1);

  }, [forge, loadForgeStatus]);



  const exportFirstForged = useCallback(async () => {

    const target = forgedApps[0]?.id ?? fleet.find((r) => r.forgedAppId)?.forgedAppId;

    if (!target) return;

    const res = await fetch("/api/claw/export", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ forgedAppId: target }),

    });

    if (!res.ok) return;

    const data = (await res.json()) as { bundle?: unknown };

    if (!data.bundle) return;

    const blob = new Blob([JSON.stringify(data.bundle, null, 2)], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "forged-claw-export.json";

    a.click();

    URL.revokeObjectURL(url);

  }, [forgedApps, fleet]);



  return (

    <div className="space-y-4 p-4">

      <header className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel px-4 py-3">

        <div>

          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">

            OOTB · {getOotbApp("claw-forge").name}

          </p>

          <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Agent Factory</h1>

          <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted">

            <span>

              Forge Master · {fleetCounts.total} fleet · {forgedApps.length} desks

            </span>

            <ForgeLevelBadge growthLevel={growthLevel} />

          </p>

        </div>

        <button

          type="button"

          onClick={() => {

            setWorkspaceTab("mint");

            forge.openWizard({ intent: forge.intent, budgetTier, provisioningMode: forge.provisioningMode });

          }}

          className="flex items-center gap-2 border border-cursor-glow bg-surface px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow shadow-cursor"

        >

          <span className="flex h-6 w-6 items-center justify-center border border-current text-base">+</span>

          Forge Claw

        </button>

      </header>



      <div className="grid gap-4 md:grid-cols-3">

        <AppMetric label="Fleet Size" value={String(fleetCounts.total)} unit="entries" highlight />

        <AppMetric label="Active" value={profiles.activeClawId ?? "—"} unit="engine profile" />

        <AppMetric label="Vision" value={connected ? "LIVE" : "OFF"} unit="multimodal" />

      </div>



      <ExperienceAppSection

        appId="claw-forge"

        sectionId="go-live"

        minLevel="beginner"

        title="Go Live"

        subtitle="Demo-ready checklist — mint on bare metal without cloud rent"

      >

        <ForgeGoLivePanel

          report={goLive}

          onRefresh={() => void loadForgeStatus()}

          onRunDemoTour={() => void runDemoTour()}

          demoTourRunning={demoTourRunning}

        />

      </ExperienceAppSection>



      <ForgeLevelUpNudge growthLevel={growthLevel} counts={fleetCounts} forgedDesks={forgedApps.length} />



      <ForgeWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} growthLevel={growthLevel} />



      {workspaceTab === "mint" ? (

        <div className="space-y-4">

          <ForgeIntentPanel />

          <div className="min-h-[420px]">

            <NewClawWizard

              key={embeddedWizardKey}

              variant="embedded"

              initialIntent={forge.wizardPrefill.intent ?? forge.intent}

              initialBudgetTier={forge.wizardPrefill.budgetTier ?? budgetTier}

              initialImagePreview={forge.imagePreview}

              initialLiveVision={forge.liveVision}

              initialImageHint={forge.wizardPrefill.imageHint ?? null}

              onClose={() => {}}

              onCreated={onProvisioned}

            />

          </div>

        </div>

      ) : null}



      {workspaceTab === "fleet" ? (

        <ForgeFleetPanel

          fleet={fleet}

          counts={fleetCounts}

          activeClawId={profiles.activeClawId}

          onRefresh={() => void loadForgeStatus()}

          onMintAgain={() => setWorkspaceTab("mint")}

        />

      ) : null}



      {workspaceTab === "stacks" ? (

        <ForgeStacksPanel budgetTier={budgetTier} onBudgetTierChange={setBudgetTier} />

      ) : null}



      {workspaceTab === "templates" ? (

        <ForgeTemplatesPanel

          onSelectTemplate={(templateId) => {

            forge.setProvisioningMode("framework");

            forge.setTemplateId(templateId);

            if (!forge.intent.trim()) {

              forge.setIntent("Custom desk from template — describe your mission");

            }

            setWorkspaceTab("mint");

            setEmbeddedWizardKey((k) => k + 1);

          }}

        />

      ) : null}



      {workspaceTab === "import" ? <ForgeImportPanel onImported={() => onProvisioned()} /> : null}



      {workspaceTab === "ops" ? (

        <ForgeOpsPanel

          fleet={fleet}

          counts={fleetCounts}

          activeClawId={profiles.activeClawId}

          inferenceBackend={inferenceBackend}

          cafeEventCount={cafeEventCount}

          onRefresh={() => void loadForgeStatus()}

          onExportFleet={() => void exportFirstForged()}

        />

      ) : null}



      {forge.wizardOpen ? (

        <NewClawWizard

          variant="overlay"

          initialIntent={forge.wizardPrefill.intent ?? forge.intent}

          initialBudgetTier={forge.wizardPrefill.budgetTier ?? budgetTier}

          initialImagePreview={forge.imagePreview}

          initialLiveVision={forge.liveVision}

          initialImageHint={forge.wizardPrefill.imageHint ?? null}

          onClose={() => forge.closeWizard()}

          onCreated={onProvisioned}

        />

      ) : null}

    </div>

  );

}


