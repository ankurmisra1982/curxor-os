"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { OptimusApp } from "@/components/apps/OptimusApp";

export default function OptimusPage() {
  return (
    <ClawAgentApp appId="tesla-optimus-engine">
      {(ctx) => <OptimusApp {...ctx} />}
    </ClawAgentApp>
  );
}
