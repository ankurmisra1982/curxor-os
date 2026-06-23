import "server-only";

import { sanitizeBuildPlane, isBuildPlaneLinked } from "./build-plane";
import { readUserSettings } from "./user-settings";
import type { SanitizedBuildPlaneSettings } from "./user-settings-types";
import { OS_EVENT_KINDS } from "./os-event-bus-types";
import { readOsEventLog } from "./os-event-log-store";

export interface BuildStatusPayload {
  ok: true;
  buildPlane: SanitizedBuildPlaneSettings;
  bridgeLinked: boolean;
  mcp: {
    endpoint: string;
    toolCount: number;
    requiresEnabled: boolean;
  };
  eventBus: {
    endpoint: string;
    kinds: string[];
    recentCount: number;
  };
}

export async function buildBuildStatus(): Promise<BuildStatusPayload> {
  const settings = await readUserSettings();
  const buildPlane = sanitizeBuildPlane(settings.buildPlane);
  const recent = await readOsEventLog(12);
  return {
    ok: true,
    buildPlane,
    bridgeLinked: isBuildPlaneLinked(settings.buildPlane),
    mcp: {
      endpoint: "/api/build/mcp",
      toolCount: 5,
      requiresEnabled: true,
    },
    eventBus: {
      endpoint: "/api/build/events",
      kinds: [...OS_EVENT_KINDS],
      recentCount: recent.length,
    },
  };
}
