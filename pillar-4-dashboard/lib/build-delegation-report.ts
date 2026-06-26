import "server-only";

import { buildCafeAscensionBootstrap } from "./claw-cafe-events";
import {
  countPendingBuildDelegations,
  readBuildDelegationReportItems,
  type BuildDelegationItem,
} from "./build-delegation-queue";
import { resolveBuildDelegationPolicy, type BuildDelegationPolicyView } from "./build-delegation-policy";
import { readUserSettings } from "./user-settings";
import type { AscensionTierId } from "./claw-cafe-ascension";

export interface BuildDelegationReport {
  ok: true;
  policy: BuildDelegationPolicyView;
  ascensionTitle: string | null;
  items: BuildDelegationItem[];
  pendingCount: number;
}

export async function buildDelegationReport(limit = 24): Promise<BuildDelegationReport> {
  const [settings, bootstrap, items, pendingCount] = await Promise.all([
    readUserSettings(),
    buildCafeAscensionBootstrap({ autoSync: false }),
    readBuildDelegationReportItems(limit),
    countPendingBuildDelegations(),
  ]);

  const ascensionTier: AscensionTierId = bootstrap.ascension?.tier ?? "sprout";
  const policy = resolveBuildDelegationPolicy({
    enabled: settings.buildPlane.enabled,
    allowDelegation: settings.buildPlane.allowDelegation,
    ascensionTier,
  });

  return {
    ok: true,
    policy,
    ascensionTitle: bootstrap.ascension?.title ?? null,
    items,
    pendingCount,
  };
}
