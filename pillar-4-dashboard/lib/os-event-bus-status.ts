import "server-only";

import { readOsEventLog } from "./os-event-log-store";
import { OS_EVENT_KINDS } from "./os-event-bus-types";
import { checkOtaAvailable } from "./ota-available-check";
import { pollEno2HealthAndEmit } from "./eno2-health";

export async function pollOsEventBus(): Promise<{
  ota: Awaited<ReturnType<typeof checkOtaAvailable>>;
  eno2: Awaited<ReturnType<typeof pollEno2HealthAndEmit>>;
}> {
  const [ota, eno2] = await Promise.all([checkOtaAvailable(), pollEno2HealthAndEmit()]);
  return { ota, eno2 };
}

export async function buildEventBusStatus(): Promise<{
  kinds: typeof OS_EVENT_KINDS;
  recentCount: number;
  recent: Awaited<ReturnType<typeof readOsEventLog>>;
}> {
  const recent = await readOsEventLog(12);
  return {
    kinds: OS_EVENT_KINDS,
    recentCount: recent.length,
    recent,
  };
}
