"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { MyWorkApp } from "@/components/apps/MyWorkApp";

export default function MyWorkPage() {
  return (
    <ClawAgentApp appId="my-work">
      {(ctx) => <MyWorkApp {...ctx} />}
    </ClawAgentApp>
  );
}
