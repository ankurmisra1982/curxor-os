"use client";

import { useEffect, useState } from "react";

import type { OtaLogEvent } from "@/lib/ota-logs";

export function useOtaLogStream(enabled = true) {
  const [lines, setLines] = useState<OtaLogEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource("/api/stream/ota-logs");

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as OtaLogEvent;
        setLines((prev) => {
          const next = [...prev, parsed];
          return next.length > 500 ? next.slice(-500) : next;
        });
      } catch {
        /* ignore malformed frames */
      }
    };

    return () => source.close();
  }, [enabled]);

  return { lines, connected };
}
