"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { ClawCafeApp } from "@/components/apps/ClawCafeApp";

export default function ClawCafePage() {
  return (
    <ClawAgentApp appId="claw-cafe">
      {(ctx) => <ClawCafeApp {...ctx} />}
    </ClawAgentApp>
  );
}
