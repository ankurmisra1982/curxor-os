export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildCafeAscensionBootstrap } from "@/lib/claw-cafe-events";

function sseEncode(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function GET(): Promise<Response> {
  let timer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = async () => {
        if (closed) return;
        try {
          const snapshot = await buildCafeAscensionBootstrap();
          controller.enqueue(sseEncode(snapshot));
        } catch {
          controller.enqueue(sseEncode({ ok: false, error: "snapshot_failed" }));
        }
      };

      await push();
      timer = setInterval(() => void push(), 2000);
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
