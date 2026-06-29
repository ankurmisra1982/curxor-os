"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useReconnectingEventSource } from "@/hooks/useReconnectingEventSource";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import type { DigitalReceipt } from "@/lib/digital-protocol";
import type { MotorCommandEvent, VisionFrameEvent } from "@/lib/telemetry-events";

interface VisionContextValue {
  frame: VisionFrameEvent | null;
  connected: boolean;
}

interface MotorContextValue {
  command: MotorCommandEvent | null;
  connected: boolean;
}

interface DigitalContextValue {
  receipts: DigitalReceipt[];
  connected: boolean;
}

const VisionContext = createContext<VisionContextValue | null>(null);
const MotorContext = createContext<MotorContextValue | null>(null);
const DigitalContext = createContext<DigitalContextValue | null>(null);

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function useTelemetryStreamsEnabled(): boolean {
  const pathname = usePathname();
  const { level } = useExperienceLevel();
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    const onHealth = () => setHealthOpen(true);
    window.addEventListener("curxor:open-health", onHealth);
    return () => window.removeEventListener("curxor:open-health", onHealth);
  }, []);

  return healthOpen || level === "expert" || pathname !== "/home";
}

function TelemetryStreams({ children }: { children: ReactNode }) {
  const streamsEnabled = useTelemetryStreamsEnabled();
  const [frame, setFrame] = useState<VisionFrameEvent | null>(null);
  const [command, setCommand] = useState<MotorCommandEvent | null>(null);
  const [receipts, setReceipts] = useState<DigitalReceipt[]>([]);

  const visionConnected = useReconnectingEventSource("/api/stream/vision", streamsEnabled, (raw) => {
    const parsed = parseJson<VisionFrameEvent>(raw);
    if (parsed) setFrame(parsed);
  });

  const motorConnected = useReconnectingEventSource("/api/stream/motor", streamsEnabled, (raw) => {
    const parsed = parseJson<MotorCommandEvent>(raw);
    if (parsed) setCommand(parsed);
  });

  const digitalConnected = useReconnectingEventSource("/api/stream/digital", streamsEnabled, (raw) => {
    const parsed = parseJson<DigitalReceipt>(raw);
    if (!parsed?.tool) return;
    setReceipts((prev) => {
      if (parsed.id && prev.some((r) => r.id === parsed.id)) return prev;
      const next = [...prev, parsed];
      return next.length > 100 ? next.slice(-100) : next;
    });
  });

  const visionValue = useMemo(
    () => ({ frame, connected: streamsEnabled && visionConnected }),
    [frame, streamsEnabled, visionConnected],
  );
  const motorValue = useMemo(
    () => ({ command, connected: streamsEnabled && motorConnected }),
    [command, streamsEnabled, motorConnected],
  );
  const digitalValue = useMemo(
    () => ({ receipts, connected: streamsEnabled && digitalConnected }),
    [receipts, streamsEnabled, digitalConnected],
  );

  return (
    <VisionContext.Provider value={visionValue}>
      <MotorContext.Provider value={motorValue}>
        <DigitalContext.Provider value={digitalValue}>{children}</DigitalContext.Provider>
      </MotorContext.Provider>
    </VisionContext.Provider>
  );
}

/** Must render inside UiModeProvider (uses experience level for lazy streams on /home). */
export function TelemetryProvider({ children }: { children: ReactNode }) {
  return <TelemetryStreams>{children}</TelemetryStreams>;
}

export function useVisionStreamContext(): VisionContextValue {
  const ctx = useContext(VisionContext);
  if (!ctx) {
    throw new Error("useVisionStream must be used within TelemetryProvider");
  }
  return ctx;
}

export function useMotorStreamContext(): MotorContextValue {
  const ctx = useContext(MotorContext);
  if (!ctx) {
    throw new Error("useMotorStream must be used within TelemetryProvider");
  }
  return ctx;
}

export function useDigitalStreamContext(): DigitalContextValue {
  const ctx = useContext(DigitalContext);
  if (!ctx) {
    throw new Error("useDigitalStream must be used within TelemetryProvider");
  }
  return ctx;
}
