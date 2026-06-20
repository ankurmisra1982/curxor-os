"use client";

export type { MotorCommandEvent } from "@/lib/telemetry-events";
import { useMotorStreamContext } from "@/components/telemetry/TelemetryProvider";

export function useMotorStream() {
  return useMotorStreamContext();
}
