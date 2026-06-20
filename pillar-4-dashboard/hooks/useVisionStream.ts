"use client";

export type { VisionFrameEvent } from "@/lib/telemetry-events";
import { useVisionStreamContext } from "@/components/telemetry/TelemetryProvider";

export function useVisionStream() {
  return useVisionStreamContext();
}
