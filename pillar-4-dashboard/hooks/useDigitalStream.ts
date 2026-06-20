"use client";

import { useMemo } from "react";

import { useDigitalStreamContext } from "@/components/telemetry/TelemetryProvider";

export function useDigitalStream(toolFilter?: string) {
  const { receipts, connected } = useDigitalStreamContext();

  const filtered = useMemo(
    () => (toolFilter ? receipts.filter((r) => r.tool === toolFilter) : receipts),
    [receipts, toolFilter],
  );

  const latest = filtered.length > 0 ? filtered[filtered.length - 1]! : null;

  return { receipts: filtered, latest, connected };
}
