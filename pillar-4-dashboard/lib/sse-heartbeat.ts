import { sseEncode } from "@/lib/zmq-bridge";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

const PING_INTERVAL_MS = 20_000;

/** SSE stream with periodic keepalive comments so idle connections survive proxies. */
export function createHeartbeatSseStream(
  subscribe: (emit: (payload: unknown) => void) => () => void,
): ReadableStream<Uint8Array> {
  let unsubscribe = () => {};
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      unsubscribe = subscribe((payload) => {
        controller.enqueue(sseEncode(payload));
      });
      pingTimer = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch {
          /* stream closed */
        }
      }, PING_INTERVAL_MS);
    },
    cancel() {
      if (pingTimer) clearInterval(pingTimer);
      unsubscribe();
    },
  });

  return stream;
}

export function sseHeartbeatResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, { headers: SSE_HEADERS });
}
