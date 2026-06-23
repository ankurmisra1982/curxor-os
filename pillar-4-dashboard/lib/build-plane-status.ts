import "server-only";

import { sanitizeBuildPlane, isBuildPlaneLinked } from "./build-plane";
import { readUserSettings } from "./user-settings";
import type { SanitizedBuildPlaneSettings } from "./user-settings-types";

export interface BuildStatusPayload {
  ok: true;
  buildPlane: SanitizedBuildPlaneSettings;
  bridgeLinked: boolean;
  mcp: {
    endpoint: string;
    toolCount: number;
    requiresEnabled: boolean;
  };
}

export async function buildBuildStatus(): Promise<BuildStatusPayload> {
  const settings = await readUserSettings();
  const buildPlane = sanitizeBuildPlane(settings.buildPlane);
  return {
    ok: true,
    buildPlane,
    bridgeLinked: isBuildPlaneLinked(settings.buildPlane),
    mcp: {
      endpoint: "/api/build/mcp",
      toolCount: 5,
      requiresEnabled: true,
    },
  };
}
