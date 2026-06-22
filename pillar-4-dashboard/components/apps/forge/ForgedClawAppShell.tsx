"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { ForgedClawWorkspace } from "@/components/apps/forge/ForgedClawWorkspace";
import type { ForgedAppRecord } from "@/lib/forged-apps-types";
import { forgedAgentFromRecord } from "@/lib/forged-agent-catalog";

interface ForgedClawAppShellProps {
  forgedApp: ForgedAppRecord;
}

export function ForgedClawAppShell({ forgedApp }: ForgedClawAppShellProps) {
  const agent = forgedAgentFromRecord(forgedApp);

  return (
    <ClawAgentApp
      appId={forgedApp.id}
      agentLabel={agent.ootbLabel}
      forgedAgent={agent}
    >
      {(ctx) => <ForgedClawWorkspace forgedApp={forgedApp} {...ctx} />}
    </ClawAgentApp>
  );
}
