import "server-only";

import { listBridgePlatformHealth } from "./content-bridge-health-store";
import { fetchSocialChannelStatuses } from "./content-channels-status";
import { loadDigitalEnv } from "./digital-env";
import type {
  MessagingConnectorEntry,
  MessagingConnectorHealth,
  MessagingConnectorVaultReport,
} from "./shell-connectors-types";
import type { SocialPlatformId } from "./social-channels";

export const MESSAGING_PLATFORM_IDS: SocialPlatformId[] = ["telegram", "whatsapp", "discord"];

export type {
  MessagingConnectorEntry,
  MessagingConnectorHealth,
  MessagingConnectorVaultReport,
} from "./shell-connectors-types";

function missingEnvKeys(env: Record<string, string>, required: string[]): string[] {
  return required.filter((k) => !env[k]?.trim());
}

function resolveHealth(
  bridgeTier: string,
  configured: boolean,
  lastFailure: boolean,
): { health: MessagingConnectorHealth; healthLabel: string } {
  if (bridgeTier === "planned") {
    return { health: "planned", healthLabel: "Planned" };
  }
  if (!configured) {
    return { health: "unconfigured", healthLabel: "Not connected" };
  }
  if (lastFailure) {
    return { health: "degraded", healthLabel: "Last send failed" };
  }
  return { health: "ready", healthLabel: "Ready" };
}

function buildFixHints(platform: SocialPlatformId, configured: boolean, missing: string[]): string[] {
  const hints: string[] = [];
  if (platform === "whatsapp") {
    hints.push("Meta Business verification required for WhatsApp Cloud API — plan 1–2 weeks lead time.");
  }
  if (platform === "telegram") {
    hints.push("Create a bot via @BotFather — token goes in digital.env on this appliance.");
  }
  if (platform === "discord") {
    hints.push("Discord bot token + channel ID — Engage capture and outbound via channel.discord.send.");
  }
  if (!configured && missing.length > 0) {
    hints.push(`Missing: ${missing.join(", ")}`);
  }
  if (configured) {
    hints.push("Send a test message from Engage or approval flow to verify receipt.");
  }
  return hints;
}

export async function buildMessagingConnectorHealthReport(): Promise<MessagingConnectorVaultReport> {
  const [statuses, env, activity] = await Promise.all([
    fetchSocialChannelStatuses(),
    loadDigitalEnv(),
    listBridgePlatformHealth(),
  ]);
  const activityByPlatform = new Map(activity.map((a) => [a.platform, a]));
  const idSet = new Set<string>(MESSAGING_PLATFORM_IDS);

  const connectors: MessagingConnectorEntry[] = statuses
    .filter((ch) => idSet.has(ch.id))
    .map((ch) => {
      const missing = missingEnvKeys(env, ch.envKeys);
      const configured = missing.length === 0;
      const act = activityByPlatform.get(ch.id);
      const failedRecently =
        act?.lastFailureAt &&
        (!act.lastSuccessAt || Date.parse(act.lastFailureAt) > Date.parse(act.lastSuccessAt));
      const { health, healthLabel } = resolveHealth(ch.bridgeTier, configured, Boolean(failedRecently));

      return {
        id: ch.id,
        label: ch.name,
        bridgeTool: ch.bridgeTool ?? null,
        configured,
        health,
        healthLabel,
        missingEnvKeys: missing,
        fixHints: buildFixHints(ch.id, configured, missing),
        lastSuccessAt: act?.lastSuccessAt ?? null,
        lastFailureAt: act?.lastFailureAt ?? null,
      };
    });

  const ready = connectors.filter((c) => c.health === "ready");
  const attention = connectors.filter((c) => c.health === "degraded" || c.health === "auth_expired");

  return {
    updatedAt: new Date().toISOString(),
    summary: {
      total: connectors.length,
      configured: connectors.filter((c) => c.configured).length,
      ready: ready.length,
      attention: attention.length,
    },
    connectors,
  };
}
