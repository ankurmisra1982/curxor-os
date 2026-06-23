"use client";



import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";



import { AppFreWizard } from "@/components/app-fre/AppFreWizard";

import { ClawAgentConsole } from "@/components/claw/ClawAgentConsole";

import { ForgeAssistProvider } from "@/components/claw/ForgeAssistProvider";

import { getAppAgent } from "@/lib/app-agent-catalog";
import type { ResolvedAppAgent } from "@/lib/forged-agent-catalog";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";



export interface AgentAppContext {

  config: Record<string, unknown>;

  onSkill: (skillId: string, dispatchHints?: Record<string, unknown>) => void;

  skillTick: number;

  lastSkillId?: string;

  /** Live workspace selection (selected rule, order, task) merged into agent config. */
  updateWorkspaceContext: (patch: Record<string, unknown>) => void;

}



interface ClawAgentAppProps {
  appId: string;
  agentLabel?: string;
  forgedAgent?: ResolvedAppAgent;
  children: (ctx: AgentAppContext) => ReactNode;
  workspaceClassName?: string;
}

function ClawAgentAppInner({ appId, agentLabel, forgedAgent, children, workspaceClassName = "" }: ClawAgentAppProps) {
  const agent = forgedAgent ?? (isValidAppId(appId) ? getAppAgent(appId as OotbAppId) : null);
  const label = agentLabel ?? agent?.ootbLabel ?? "Claw";

  const [loading, setLoading] = useState(true);

  const [initialized, setInitialized] = useState(false);

  const [config, setConfig] = useState<Record<string, unknown>>({});

  const [workspaceContext, setWorkspaceContext] = useState<Record<string, unknown>>({});

  const mergedConfig = useMemo(
    () => ({ ...config, ...workspaceContext }),
    [config, workspaceContext],
  );

  const updateWorkspaceContext = useCallback((patch: Record<string, unknown>) => {
    setWorkspaceContext((prev) => ({ ...prev, ...patch }));
  }, []);

  const [skillTick, setSkillTick] = useState(0);

  const [lastSkillId, setLastSkillId] = useState<string | undefined>();

  const [loadError, setLoadError] = useState<string | null>(null);



  const loadFre = useCallback(async () => {

    setLoading(true);

    setLoadError(null);

    try {

      const res = await fetch(`/api/app-fre/${appId}`, { cache: "no-store" });

      if (!res.ok) throw new Error(`FRE status ${res.status}`);

      const data = (await res.json()) as { initialized: boolean; config: Record<string, unknown> };

      setInitialized(data.initialized);

      setConfig(data.config ?? {});

    } catch (err) {

      setLoadError(err instanceof Error ? err.message : "FRE load failed");

      setInitialized(false);

    } finally {

      setLoading(false);

    }

  }, [appId]);



  useEffect(() => {

    void loadFre();

  }, [loadFre]);



  const onSkill = useCallback((skillId: string, dispatchHints?: Record<string, unknown>) => {

    if (dispatchHints && Object.keys(dispatchHints).length > 0) {
      setWorkspaceContext((prev) => ({ ...prev, ...dispatchHints }));
    }

    setLastSkillId(skillId);

    setSkillTick((n) => n + 1);

  }, []);



  if (loading) {

    return (

      <div className="flex min-h-[480px] items-center justify-center border border-line bg-void font-mono text-xs text-muted">

        Loading {label}…

      </div>

    );

  }



  if (loadError) {

    return (

      <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 border border-line bg-void p-6 font-mono text-xs">

        <p className="text-cursor-glow">Could not load {label} setup state</p>

        <p className="text-muted">{loadError}</p>

        <button

          type="button"

          onClick={() => void loadFre()}

          className="border border-cursor-glow px-4 py-2 uppercase tracking-widest text-cursor-glow"

        >

          Retry

        </button>

      </div>

    );

  }



  if (!initialized) {

    return (

      <AppFreWizard
        appId={appId}
        agent={agent ?? undefined}
        onComplete={(nextConfig) => {
          setConfig(nextConfig);

          setInitialized(true);

          setLoadError(null);

        }}

      />

    );

  }



  return (

    <div className="flex min-h-[520px] flex-col gap-0 lg:flex-row">

      <div className={`min-w-0 flex-1 order-2 lg:order-1 ${workspaceClassName}`}>

        {children({ config: mergedConfig, onSkill, skillTick, lastSkillId, updateWorkspaceContext })}

      </div>

      <div className="order-1 w-full shrink-0 border-b border-line lg:order-2 lg:w-[min(380px,34%)] lg:border-b-0 lg:border-l lg:border-line">

        <ClawAgentConsole
          appId={appId}
          agentDef={agent ?? undefined}
          config={mergedConfig}
          onSkill={onSkill}
          updateWorkspaceContext={updateWorkspaceContext}
        />

      </div>

    </div>

  );

}



export function ClawAgentApp(props: ClawAgentAppProps) {

  if (props.appId === "claw-forge") {

    return (

      <ForgeAssistProvider>

        <ClawAgentAppInner {...props} />

      </ForgeAssistProvider>

    );

  }

  return <ClawAgentAppInner {...props} />;

}


