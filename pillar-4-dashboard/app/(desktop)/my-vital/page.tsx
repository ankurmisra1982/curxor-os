"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { MyVitalApp } from "@/components/apps/MyVitalApp";

export default function MyVitalPage() {
  return (
    <ClawAgentApp appId="my-vital">
      {(ctx) => <MyVitalApp {...ctx} />}
    </ClawAgentApp>
  );
}
