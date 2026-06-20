export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createOtaLogTail, sseEncodeOta } from "@/lib/ota-logs";

export async function GET(): Promise<Response> {
  let stopTail = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      stopTail = createOtaLogTail((event) => {
        try {
          controller.enqueue(sseEncodeOta(event));
        } catch {
          /* stream closed */
        }
      });
    },
    cancel() {
      stopTail();
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
