export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildCafeAscensionBootstrap } from "@/lib/claw-cafe-events";

function sseEncode(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

const APPROVAL_POLL_MS = Number(process.env.CURXOR_CAFE_SSE_POLL_MS ?? 2_000);
const INGEST_POLL_MS = Number(process.env.CURXOR_CAFE_SSE_INGEST_MS ?? 10_000);

export async function GET(): Promise<Response> {
  let timer: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let lastIngestAt = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = async () => {
        if (closed) return;
        try {
          const now = Date.now();
          const shouldIngest = lastIngestAt === 0 || now - lastIngestAt >= INGEST_POLL_MS;
          if (shouldIngest) lastIngestAt = now;
          const snapshot = await buildCafeAscensionBootstrap({ autoSync: shouldIngest });
          controller.enqueue(sseEncode(snapshot));
        } catch {
          controller.enqueue(sseEncode({ ok: false, error: "snapshot_failed" }));
        }
      };

      await push();
      timer = setInterval(() => void push(), APPROVAL_POLL_MS);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
