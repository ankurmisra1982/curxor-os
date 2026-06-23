import "server-only";

import { listAuditEntries } from "./content-audit-store";
import { readAppFreState } from "./app-fre-state";
import { creatorFreChannelOptions } from "./social-channels";
import type { SocialPlatformId } from "./social-channels";

export interface PublishTrustConfig {
  minApprovals: number;
  platforms: string[];
}

export interface PublishTrustTierRow {
  platform: string;
  label: string;
  approvedCount: number;
  minApprovals: number;
  autoEligible: boolean;
  enabled: boolean;
}

function parseMinApprovals(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return 5;
}

export async function readPublishTrustConfig(): Promise<PublishTrustConfig> {
  const fre = await readAppFreState("my-content-creator");
  const minApprovals = parseMinApprovals(fre.config.publishTrustMinApprovals);
  const raw = fre.config.publishTrustPlatforms;
  const platforms = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  return { minApprovals, platforms };
}

export async function countPlatformPublishApprovals(platform: string): Promise<number> {
  const entries = await listAuditEntries({ limit: 512 });
  return entries.filter(
    (e) =>
      e.action === "approve_post" &&
      (e.meta?.platform === platform ||
        (typeof e.detail === "string" && e.detail.includes(`· ${platform} ·`))),
  ).length;
}

export async function isPublishTrustAutoEligible(platform: string): Promise<boolean> {
  const cfg = await readPublishTrustConfig();
  if (cfg.minApprovals <= 0 || cfg.platforms.length === 0) return false;
  if (!cfg.platforms.includes(platform)) return false;
  const count = await countPlatformPublishApprovals(platform);
  return count >= cfg.minApprovals;
}

export async function buildPublishTrustReport(): Promise<PublishTrustTierRow[]> {
  const cfg = await readPublishTrustConfig();
  const labels = new Map(creatorFreChannelOptions().map((o) => [o.value, o.label]));
  const platforms =
    cfg.platforms.length > 0
      ? cfg.platforms
      : creatorFreChannelOptions().map((o) => o.value as SocialPlatformId);

  const rows: PublishTrustTierRow[] = [];
  for (const platform of platforms) {
    const approvedCount = await countPlatformPublishApprovals(platform);
    const enabled = cfg.platforms.length === 0 || cfg.platforms.includes(platform);
    rows.push({
      platform,
      label: labels.get(platform as SocialPlatformId) ?? platform,
      approvedCount,
      minApprovals: cfg.minApprovals,
      autoEligible: enabled && cfg.minApprovals > 0 && approvedCount >= cfg.minApprovals,
      enabled,
    });
  }
  return rows;
}
