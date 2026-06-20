"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { MyContentApp } from "@/components/apps/MyContentApp";

export default function MyContentPage() {
  return (
    <ClawAgentApp appId="my-content-creator">
      {(ctx) => <MyContentApp {...ctx} />}
    </ClawAgentApp>
  );
}
