import "server-only";

import { fetchCreatorChannelStatuses } from "./content-channels-status";
import { listBridgePlatformHealth } from "./content-bridge-health-store";
import { digitalEnvPath, loadDigitalEnv } from "./digital-env";
import type { BridgeErrorKind } from "./content-bridge-health-store";
import type { BridgeTier } from "./social-channels";
import type { SocialPlatformId } from "./social-channels";

export type BridgeHealthStatus =
  | "ready"
  | "degraded"
  | "auth_expired"
  | "unconfigured"
  | "planned";

export interface BridgeHealthEntry {
  platform: SocialPlatformId;
  name: string;
  bridgeTier: BridgeTier;
  bridgeTool: string | null;
  configured: boolean;
  enabledInFre: boolean;
  statusLabel: string;
  health: BridgeHealthStatus;
  healthLabel: string;
  missingEnvKeys: string[];
  optionalEnvKeys: string[];
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastErrorKind: BridgeErrorKind | null;
  consecutiveFailures: number;
  successCount: number;
  failureCount: number;
  tokenExpiresAt: string | null;
  fixHints: string[];
}

export interface BridgeHealthReport {
  digitalEnvPath: string;
  updatedAt: string;
  summary: {
    total: number;
    live: number;
    configured: number;
    ready: number;
    degraded: number;
    authExpired: number;
    unconfigured: number;
    planned: number;
  };
  platforms: BridgeHealthEntry[];
}

const OPTIONAL_ENV: Partial<Record<SocialPlatformId, string[]>> = {
  x: ["X_BEARER_TOKEN"],
  linkedin: ["LINKEDIN_REFRESH_TOKEN", "LINKEDIN_AUTHOR_URN"],
  youtube: ["YOUTUBE_DEFAULT_PRIVACY"],
  pinterest: ["PINTEREST_ACCESS_TOKEN", "PINTEREST_DEFAULT_LINK"],
  tiktok: ["TIKTOK_REFRESH_TOKEN"],
  instagram: ["CURXOR_CONTENT_PUBLIC_BASE"],
};

const JWT_ENV_CANDIDATES = [
  "META_ACCESS_TOKEN",
  "LINKEDIN_ACCESS_TOKEN",
  "PINTEREST_ACCESS_TOKEN",
  "TIKTOK_ACCESS_TOKEN",
];

function decodeJwtExpMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function tokenExpiryFromEnv(env: Record<string, string>, platform: SocialPlatformId): string | null {
  const keys =
    platform === "instagram" || platform === "threads" || platform === "facebook"
      ? ["META_ACCESS_TOKEN"]
      : platform === "linkedin"
        ? ["LINKEDIN_ACCESS_TOKEN"]
        : JWT_ENV_CANDIDATES;

  for (const key of keys) {
    const val = env[key]?.trim();
    if (!val) continue;
    const expMs = decodeJwtExpMs(val);
    if (expMs) return new Date(expMs).toISOString();
  }
  return null;
}

function missingEnvKeys(env: Record<string, string>, required: string[]): string[] {
  return required.filter((k) => !env[k]?.trim());
}

function buildFixHints(input: {
  platform: SocialPlatformId;
  configured: boolean;
  missingEnvKeys: string[];
  lastErrorKind: BridgeErrorKind | null;
  tokenExpiresAt: string | null;
  bridgeTier: BridgeTier;
}): string[] {
  const hints: string[] = [];
  if (input.bridgeTier !== "live") {
    hints.push("Publish bridge not live yet — draft locally until tier ships.");
    return hints;
  }
  if (!input.configured) {
    hints.push(`Add credentials to ${digitalEnvPath()}`);
    if (input.missingEnvKeys.length > 0) {
      hints.push(`Missing: ${input.missingEnvKeys.join(", ")}`);
    }
    return hints;
  }
  if (input.tokenExpiresAt) {
    const exp = Date.parse(input.tokenExpiresAt);
    if (Number.isFinite(exp) && exp <= Date.now()) {
      hints.push("Access token appears expired — refresh OAuth token in digital.env");
    } else if (Number.isFinite(exp) && exp - Date.now() < 7 * 86400000) {
      hints.push("Access token expires within 7 days — plan a refresh");
    }
  }
  if (input.lastErrorKind === "auth") {
    hints.push("Last failure looks like auth — re-run OAuth and update tokens");
  }
  if (input.lastErrorKind === "rate_limit") {
    hints.push("Rate limited — reduce publish frequency or wait before retry");
  }
  if (input.lastErrorKind === "validation") {
    hints.push("Payload rejected — check media URLs, board IDs, and platform format rules");
  }
  if (input.platform === "instagram" || input.platform === "pinterest") {
    hints.push("Requires public image_url — set CURXOR_CONTENT_PUBLIC_BASE on appliance");
  }
  if (input.platform === "pinterest" && input.missingEnvKeys.includes("PINTEREST_DEFAULT_BOARD_ID")) {
    hints.push("Set PINTEREST_DEFAULT_BOARD_ID from GET /v5/boards");
  }
  if (input.platform === "snapchat") {
    hints.push("Confirm SNAP_PUBLIC_PROFILE_ID and video_path or video_url");
  }
  if (hints.length === 0 && input.configured) {
    hints.push("Bridge configured — publish to verify receipt on digital_in");
  }
  return hints;
}

function resolveHealthStatus(input: {
  bridgeTier: BridgeTier;
  configured: boolean;
  lastErrorKind: BridgeErrorKind | null;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  tokenExpiresAt: string | null;
}): { health: BridgeHealthStatus; healthLabel: string } {
  if (input.bridgeTier !== "live") {
    return { health: "planned", healthLabel: "Bridge planned" };
  }
  if (!input.configured) {
    return { health: "unconfigured", healthLabel: "Add digital.env credentials" };
  }

  const tokenExpired =
    input.tokenExpiresAt && Date.parse(input.tokenExpiresAt) <= Date.now();
  if (tokenExpired || input.lastErrorKind === "auth") {
    return { health: "auth_expired", healthLabel: "Token or auth issue" };
  }

  const failedRecently =
    input.lastFailureAt &&
    (!input.lastSuccessAt || Date.parse(input.lastFailureAt) > Date.parse(input.lastSuccessAt));

  if (failedRecently && (input.consecutiveFailures >= 2 || input.lastErrorKind === "rate_limit")) {
    return { health: "degraded", healthLabel: "Recent publish failures" };
  }

  if (failedRecently && input.consecutiveFailures === 1) {
    return { health: "degraded", healthLabel: "Last publish failed" };
  }

  return { health: "ready", healthLabel: "Ready to publish" };
}

export async function buildBridgeHealthReport(freChannels: string[]): Promise<BridgeHealthReport> {
  const [vault, env, activity] = await Promise.all([
    fetchCreatorChannelStatuses(freChannels),
    loadDigitalEnv(),
    listBridgePlatformHealth(),
  ]);

  const activityByPlatform = new Map(activity.map((a) => [a.platform, a]));

  const platforms: BridgeHealthEntry[] = vault.platforms.map((p) => {
    const missing = missingEnvKeys(env, p.envKeys);
    const configured = missing.length === 0;
    const act = activityByPlatform.get(p.id);
    const tokenExpiresAt = tokenExpiryFromEnv(env, p.id);
    const { health, healthLabel } = resolveHealthStatus({
      bridgeTier: p.bridgeTier,
      configured,
      lastErrorKind: act?.lastErrorKind ?? null,
      consecutiveFailures: act?.consecutiveFailures ?? 0,
      lastSuccessAt: act?.lastSuccessAt ?? null,
      lastFailureAt: act?.lastFailureAt ?? null,
      tokenExpiresAt,
    });

    return {
      platform: p.id,
      name: p.name,
      bridgeTier: p.bridgeTier,
      bridgeTool: p.bridgeTool,
      configured,
      enabledInFre: p.enabledInFre,
      statusLabel: p.statusLabel,
      health,
      healthLabel,
      missingEnvKeys: missing,
      optionalEnvKeys: OPTIONAL_ENV[p.id] ?? [],
      lastSuccessAt: act?.lastSuccessAt ?? null,
      lastFailureAt: act?.lastFailureAt ?? null,
      lastError: act?.lastError ?? null,
      lastErrorKind: act?.lastErrorKind ?? null,
      consecutiveFailures: act?.consecutiveFailures ?? 0,
      successCount: act?.successCount ?? 0,
      failureCount: act?.failureCount ?? 0,
      tokenExpiresAt,
      fixHints: buildFixHints({
        platform: p.id,
        configured,
        missingEnvKeys: missing,
        lastErrorKind: act?.lastErrorKind ?? null,
        tokenExpiresAt,
        bridgeTier: p.bridgeTier,
      }),
    };
  });

  const summary = {
    total: platforms.length,
    live: platforms.filter((p) => p.bridgeTier === "live").length,
    configured: platforms.filter((p) => p.configured).length,
    ready: platforms.filter((p) => p.health === "ready").length,
    degraded: platforms.filter((p) => p.health === "degraded").length,
    authExpired: platforms.filter((p) => p.health === "auth_expired").length,
    unconfigured: platforms.filter((p) => p.health === "unconfigured").length,
    planned: platforms.filter((p) => p.health === "planned").length,
  };

  return {
    digitalEnvPath: digitalEnvPath(),
    updatedAt: new Date().toISOString(),
    summary,
    platforms,
  };
}
