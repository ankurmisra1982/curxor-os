"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { MyFamilyApp } from "@/components/apps/MyFamilyApp";

export default function MyFamilyPage() {
  return (
    <ClawAgentApp appId="my-family">
      {(ctx) => <MyFamilyApp {...ctx} />}
    </ClawAgentApp>
  );
}
