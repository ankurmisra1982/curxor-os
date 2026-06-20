"use client";

import { Suspense } from "react";

import { ClawForgeWorkspace } from "@/components/apps/ClawForgeWorkspace";
import { ClawAgentApp } from "@/components/claw/ClawAgentApp";

export default function ClawForgePage() {
  return (
    <ClawAgentApp appId="claw-forge">
      {(ctx) => (
        <Suspense fallback={<div className="p-4 font-mono text-xs text-muted">Loading forge…</div>}>
          <ClawForgeWorkspace {...ctx} />
        </Suspense>
      )}
    </ClawAgentApp>
  );
}
