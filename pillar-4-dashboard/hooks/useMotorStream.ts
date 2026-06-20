"use client";

import { useEffect, useState } from "react";

export interface MotorCommandEvent {
  timestampNs: string;
  seq: number;
  clawId: number;
  torqueX: number;
  torqueY: number;
  torqueZ: number;
  x: number;
  y: number;
  z: number;
  flags: number;
}

function parseMotorEvent(raw: string): MotorCommandEvent | null {
  try {
    return JSON.parse(raw) as MotorCommandEvent;
  } catch {
    return null;
  }
}

export function useMotorStream() {
  const [command, setCommand] = useState<MotorCommandEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/stream/motor");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      const parsed = parseMotorEvent(event.data);
      if (parsed) setCommand(parsed);
    };
    return () => source.close();
  }, []);

  return { command, connected };
}
