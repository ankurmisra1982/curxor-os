/**
 * Claw Context Protocol (CCP) — unified inter-Claw communication on the appliance mesh.
 *
 * Each Claw publishes context slices it owns and subscribes to slices it needs.
 * Hardware bots (Optimus, wearables) and family profiles sync through the same bus.
 */

import type { OotbAppId } from "./ootb-apps";

/** Context domains — what kind of knowledge is being shared. */
export type ClawContextScope =
  | "personal" // preferences, routines, personality
  | "health" // vitals, labs, longevity protocol
  | "work" // outreach, CRM, calendar
  | "finance" // portfolio, rules, risk
  | "family" // household members, roles, devices
  | "hardware" // robot state, motor, safety
  | "signals"; // market/social feeds

export type ClawContextAction = "publish" | "query" | "subscribe" | "revoke";

export interface ClawContextEnvelope {
  id: string;
  version: 1;
  action: ClawContextAction;
  /** Claw or bridge that originated this message. */
  sourceAppId: OotbAppId | "system" | "bridge";
  /** Family profile this context belongs to (null = primary operator). */
  profileId: string | null;
  scope: ClawContextScope;
  /** Dot-path key within scope, e.g. "vitals.resting_hr" or "work.pipeline". */
  key: string;
  timestamp: string;
  ttlSeconds: number | null;
  payload: Record<string, unknown>;
}

export interface ClawContextRecord {
  envelope: ClawContextEnvelope;
  storedAt: string;
  expiresAt: string | null;
}

export interface ClawContextSubscription {
  appId: OotbAppId;
  scopes: ClawContextScope[];
  /** Optional profile filter — empty = all household profiles the app is allowed to see. */
  profileIds: string[];
  description: string;
}

export interface ClawContextPublication {
  appId: OotbAppId;
  scopes: ClawContextScope[];
  keys: string[];
  description: string;
}

/** Which Claws may read/write which scopes (permission matrix). */
export const CCP_REGISTRY: {
  publications: ClawContextPublication[];
  subscriptions: ClawContextSubscription[];
} = {
  publications: [
    {
      appId: "my-vital",
      scopes: ["health", "personal"],
      keys: ["vitals.*", "protocol.*", "reports.*", "diet.*"],
      description: "Wearables, medical reports, longevity protocol",
    },
    {
      appId: "my-family",
      scopes: ["family", "personal"],
      keys: ["members.*", "devices.*", "personalities.*"],
      description: "Household profiles and device bindings",
    },
    {
      appId: "my-capital",
      scopes: ["finance"],
      keys: ["portfolio.*", "rules.*", "risk.*"],
      description: "Portfolio and trading context",
    },
    {
      appId: "my-work",
      scopes: ["work"],
      keys: ["pipeline.*", "calendar.*", "crm.*"],
      description: "Outreach and CRM context",
    },
    {
      appId: "tesla-optimus-engine",
      scopes: ["hardware", "signals"],
      keys: ["optimus.*", "feeds.*", "triggers.*"],
      description: "Optimus robot state and signal feeds",
    },
    {
      appId: "my-content-creator",
      scopes: ["work", "personal"],
      keys: ["content.*", "channels.*"],
      description: "Content pipeline and tone",
    },
  ],
  subscriptions: [
    {
      appId: "tesla-optimus-engine",
      scopes: ["personal", "health", "work", "finance", "family", "hardware"],
      profileIds: [],
      description: "Optimus knows the operator deeply — personal, health, work, and household",
    },
    {
      appId: "my-vital",
      scopes: ["family", "personal"],
      profileIds: [],
      description: "Longevity protocol adapts per household member",
    },
    {
      appId: "my-family",
      scopes: ["health", "work", "personal"],
      profileIds: [],
      description: "Kin Claw surfaces cross-member context for coordination",
    },
    {
      appId: "my-capital",
      scopes: ["personal", "signals"],
      profileIds: [],
      description: "Risk profile and signal triggers",
    },
    {
      appId: "my-work",
      scopes: ["personal", "family"],
      profileIds: [],
      description: "Outreach tone and household scheduling",
    },
    {
      appId: "robotaxi-fleet-manager",
      scopes: ["hardware", "work"],
      profileIds: [],
      description: "Fleet orchestration uses work queues and hardware state",
    },
    {
      appId: "claw-forge",
      scopes: ["personal", "work", "health", "family"],
      profileIds: [],
      description: "Forge new Claws with household-aware defaults",
    },
  ],
};

export function subscriptionsForApp(appId: OotbAppId): ClawContextSubscription | undefined {
  return CCP_REGISTRY.subscriptions.find((s) => s.appId === appId);
}

export function publicationsForApp(appId: OotbAppId): ClawContextPublication | undefined {
  return CCP_REGISTRY.publications.find((p) => p.appId === appId);
}

export function scopeAllowedForApp(appId: OotbAppId, scope: ClawContextScope, mode: "read" | "write"): boolean {
  if (mode === "write") {
    return publicationsForApp(appId)?.scopes.includes(scope) ?? false;
  }
  return subscriptionsForApp(appId)?.scopes.includes(scope) ?? false;
}
