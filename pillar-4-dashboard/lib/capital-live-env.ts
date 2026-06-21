import "server-only";

import { isDigitalEnvFlag } from "./digital-env";

export async function isCapitalLiveEnvEnabled(): Promise<boolean> {
  return isDigitalEnvFlag("CURXOR_CAPITAL_LIVE_ENABLED", false);
}
