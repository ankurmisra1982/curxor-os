import "server-only";

import { readAppFreState } from "./app-fre-state";
import { envFlag } from "./digital-env";

export async function metricsRulesEnabled(): Promise<boolean> {
  if (envFlag("CURXOR_METRICS_RULES_ENABLED", false)) return true;
  const fre = await readAppFreState("my-content-creator");
  return fre.config.autoMetricsRules === true;
}
