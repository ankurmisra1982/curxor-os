import type { BuildPlaneSettings } from "./user-settings-types";

/** Network plane classification for outbound fetches (eno1 operate vs build vs eno2 egress). */
export type NetworkPathTag = "operate" | "build" | "egress";

const BUILD_HOST_SUFFIXES = [
  "github.com",
  "githubusercontent.com",
  "cursor.com",
  "cursor.sh",
  "api.cursor.com",
  "registry.npmjs.org",
  "pypi.org",
];

const OPERATE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function classifyNetworkUrl(url: string): NetworkPathTag {
  try {
    const { hostname } = new URL(url);
    const host = hostname.toLowerCase();
    if (OPERATE_HOSTS.has(host)) return "operate";
    if (BUILD_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
      return "build";
    }
    return "egress";
  } catch {
    return "egress";
  }
}

/** Whether an outbound fetch is allowed under current Build Plane policy. */
export function isNetworkPathAllowed(tag: NetworkPathTag, buildPlane: BuildPlaneSettings): boolean {
  if (tag === "operate") return true;
  if (tag === "build") return buildPlane.enabled;
  return true;
}

export function assertNetworkPathAllowed(tag: NetworkPathTag, buildPlane: BuildPlaneSettings): void {
  if (!isNetworkPathAllowed(tag, buildPlane)) {
    throw new Error(`Network path "${tag}" blocked — enable Build Plane overlay for builder egress`);
  }
}
