"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { RobotaxiApp } from "@/components/apps/RobotaxiApp";

export default function RobotaxiPage() {
  return (
    <ClawAgentApp appId="robotaxi-fleet-manager">
      {(ctx) => <RobotaxiApp {...ctx} />}
    </ClawAgentApp>
  );
}
