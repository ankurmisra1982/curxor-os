export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getMeshBridge, sseEncode } from "@/lib/zmq-bridge";

export async function GET(): Promise<Response> {
  const bridge = getMeshBridge();
  await bridge.ensureStarted();

  let unsubscribe = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      unsubscribe = bridge.subscribeMotor((cmd) => {
        controller.enqueue(sseEncode(cmd));
      });
    },
    cancel() {
      unsubscribe();
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
