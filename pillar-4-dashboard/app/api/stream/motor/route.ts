export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createHeartbeatSseStream, sseHeartbeatResponse } from "@/lib/sse-heartbeat";
import { getMeshBridge } from "@/lib/zmq-bridge";

export async function GET(): Promise<Response> {
  const bridge = getMeshBridge();
  await bridge.ensureStarted();

  const stream = createHeartbeatSseStream((emit) =>
    bridge.subscribeMotor((cmd) => {
      emit(cmd);
    }),
  );

  return sseHeartbeatResponse(stream);
}
