"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { MyCapitalApp } from "@/components/apps/MyCapitalApp";

export default function MyCapitalPage() {
  return (
    <ClawAgentApp appId="my-capital">
      {(ctx) => <MyCapitalApp {...ctx} />}
    </ClawAgentApp>
  );
}
