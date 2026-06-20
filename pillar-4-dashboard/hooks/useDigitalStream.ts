"use client";

import { useEffect, useState } from "react";

import type { DigitalReceipt } from "@/lib/digital-protocol";

export function useDigitalStream(toolFilter?: string) {
  const [receipts, setReceipts] = useState<DigitalReceipt[]>([]);
  const [latest, setLatest] = useState<DigitalReceipt | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/stream/digital");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as DigitalReceipt;
        if (toolFilter && parsed.tool !== toolFilter) return;
        setLatest(parsed);
        setReceipts((prev) => {
          const next = [...prev, parsed];
          return next.length > 50 ? next.slice(-50) : next;
        });
      } catch {
        /* ignore */
      }
    };
    return () => source.close();
  }, [toolFilter]);

  return { receipts, latest, connected };
}
