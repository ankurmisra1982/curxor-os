"use client";

import { useEffect, useRef, useState } from "react";

const BASE_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;

export function useReconnectingEventSource(
  url: string,
  enabled: boolean,
  onMessage: (data: string) => void,
): boolean {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryMs = BASE_RETRY_MS;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource(url);
      es.onopen = () => {
        retryMs = BASE_RETRY_MS;
        setConnected(true);
      };
      es.onmessage = (event) => {
        if (event.data === "ping") return;
        onMessageRef.current(event.data);
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
        es = null;
        if (!closed) {
          retryTimer = setTimeout(() => {
            retryMs = Math.min(retryMs * 1.5, MAX_RETRY_MS);
            connect();
          }, retryMs);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
      setConnected(false);
    };
  }, [url, enabled]);

  return connected;
}
