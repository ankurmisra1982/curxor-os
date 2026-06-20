"use client";

import { useEffect, useState } from "react";

export interface VisionFrameEvent {
  timestampNs: string;
  seq: number;
  width: number;
  height: number;
  encoding: number;
  flags: number;
  payloadBytes: number;
  previewBase64?: string;
}

function parseVisionEvent(raw: string): VisionFrameEvent | null {
  try {
    return JSON.parse(raw) as VisionFrameEvent;
  } catch {
    return null;
  }
}

export function useVisionStream() {
  const [frame, setFrame] = useState<VisionFrameEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/stream/vision");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      const parsed = parseVisionEvent(event.data);
      if (parsed) setFrame(parsed);
    };
    return () => source.close();
  }, []);

  return { frame, connected };
}
