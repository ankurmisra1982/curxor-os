import type { OotbAppId } from "./ootb-apps";
import type { ExperienceLevel } from "./experience-level";
import type { GrowthLevel } from "./os-growth-level";

/** @deprecated use ExperienceLevel from experience-level.ts */
export type UiMode = "simple" | "expert";
export type ColorScheme = "curxor" | "ocean" | "amber" | "mono";
export type ThemeMode = "dark" | "light" | "system";
export type IntelligenceSource = "local" | "frontier" | "auto";

export type BuildPlaneLinkStatus = "disconnected" | "linked" | "error";
export type BuildPlaneWorkerStatus = "unknown" | "online" | "offline";

/** Optional Cursor Bridge overlay — separate from frontier inference providers. */
export interface BuildPlaneSettings {
  enabled: boolean;
  linkStatus: BuildPlaneLinkStatus;
  linkedAt: string | null;
  workerStatus: BuildPlaneWorkerStatus;
  /** G5+ Master AI delegation gate (default off). */
  allowDelegation: boolean;
  /** Inbound MCP write tools policy (default off). */
  allowWriteTools: boolean;
  /** Inbound automation webhook secret — never exposed to client APIs. */
  webhookSecret: string | null;
  /** Outbound OS event bus webhook (Cursor Automations / n8n). */
  webhookUrl: string | null;
  /** MS-S1 / appliance LAN host for remote worker SSH probe (eno1). */
  workerHost: string | null;
  workerSshPort: number;
  workerSshUser: string;
  workerLastProbeAt: string | null;
  workerWizardCompletedAt: string | null;
  workerCompletedSteps: BuildWorkerWizardStepId[];
}

export type BuildWorkerWizardStepId =
  | "prerequisites"
  | "install_cursor"
  | "connect_mcp"
  | "configure_worker"
  | "probe_worker"
  | "phone_control";

/** Client-safe Build Plane view (no secrets). */
export interface SanitizedBuildPlaneSettings {
  enabled: boolean;
  linkStatus: BuildPlaneLinkStatus;
  linkedAt: string | null;
  workerStatus: BuildPlaneWorkerStatus;
  allowDelegation: boolean;
  allowWriteTools: boolean;
  hasWebhookSecret: boolean;
  hasWebhookUrl: boolean;
  workerHost: string | null;
  workerSshPort: number;
  workerSshUser: string;
  workerLastProbeAt: string | null;
  workerWizardCompletedAt: string | null;
  workerWizardProgress: { complete: number; total: number };
}

export interface PatronAskSettings {
  ui: "minimized" | "sheet" | "fullscreen";
  lastReadAt?: string | null;
}

export interface ConnectedProvider {
  connectedAt: string;
  label: string;
  hasApiKey: boolean;
  /** OAuth PKCE login (OpenAI ChatGPT, Google when configured). */
  oauthLinked: boolean;
  /** Guided attestation when OAuth is unavailable (Cursor, Anthropic). */
  subscriptionLinked: boolean;
}

export interface UserSettings {
  version: 1;
  selectedApps: OotbAppId[];
  /** Forged app slugs shown in nav (from The Forge). */
  forgedAppSlugs: string[];
  appearance: {
    uiMode: UiMode;
    /** Canonical UX tier — drives progressive disclosure across all Claw apps. */
    experienceLevel: ExperienceLevel;
    /** Optional Outreach Claw growth override (L1–L5). */
    workGrowthLevel?: GrowthLevel | null;
    /** Optional Creator Claw growth override (L1–L5). */
    creatorGrowthLevel?: GrowthLevel | null;
    /** Optional Capital Claw growth override (L1–L5). */
    capitalGrowthLevel?: GrowthLevel | null;
    /** Optional Vital Claw persona override (L1–L5) */
    vitalGrowthLevel?: GrowthLevel | null;
    /** Optional Forge growth override (L1–L5). */
    forgeGrowthLevel?: GrowthLevel | null;
    /** Optional Swarm Claw growth override (L1–L5). */
    swarmGrowthLevel?: GrowthLevel | null;
    /** Optional Arbitrage Claw growth override (L1–L5). */
    shopGrowthLevel?: GrowthLevel | null;
    /** Optional Kin Claw growth override (L1–L5). */
    kinGrowthLevel?: GrowthLevel | null;
    /** Suppress Outreach Claw XP emit to Claw Cafe */
    workGamificationOptOut?: boolean;
    /** Mythic vs neutral ascension titles in Claw Cafe */
    cafeTitleStyle?: "mythic" | "neutral";
    colorScheme: ColorScheme;
    themeMode: ThemeMode;
  };
  intelligence: {
    primarySource: IntelligenceSource;
    localModel: string;
    frontierProviderId: string | null;
    frontierModel: string | null;
    allowFrontierForChat: boolean;
    allowFrontierForPlanning: boolean;
    connectedProviders: Record<string, ConnectedProvider>;
  };
  /** Optional multi-model routing (P1) — uses user's own frontier keys. */
  multiModel: {
    enabled: boolean;
    planningProviderId: string | null;
    codingProviderId: string | null;
    longContextProviderId: string | null;
  };
  /** MCP server endpoints (scaffold). */
  mcp: {
    enabled: boolean;
    servers: Array<{ id: string; url: string; enabled: boolean }>;
  };
  /** Egress host allowlist for eno2 bridges (empty = bridge catalog only). */
  egress: {
    allowHosts: string[];
  };
  /** Optional Build Plane / Cursor Bridge overlay (not required for Claws). */
  buildPlane: BuildPlaneSettings;
  /** Patron Ask universal chat UI state (CH0). */
  patronAsk?: PatronAskSettings;
  updatedAt: string;
}

export type UserSettingsPatch = {
  selectedApps?: OotbAppId[];
  forgedAppSlugs?: string[];
  appearance?: Partial<UserSettings["appearance"]>;
  intelligence?: Partial<UserSettings["intelligence"]>;
  multiModel?: Partial<UserSettings["multiModel"]>;
  mcp?: Partial<UserSettings["mcp"]>;
  egress?: Partial<UserSettings["egress"]>;
  buildPlane?: Partial<BuildPlaneSettings>;
  patronAsk?: Partial<PatronAskSettings>;
};

export const DEFAULT_BUILD_PLANE: BuildPlaneSettings = {
  enabled: false,
  linkStatus: "disconnected",
  linkedAt: null,
  workerStatus: "unknown",
  allowDelegation: false,
  allowWriteTools: false,
  webhookSecret: null,
  webhookUrl: null,
  workerHost: null,
  workerSshPort: 22,
  workerSshUser: "curxor",
  workerLastProbeAt: null,
  workerWizardCompletedAt: null,
  workerCompletedSteps: [],
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  version: 1,
  selectedApps: ["my-capital", "my-content-creator", "my-work"],
  forgedAppSlugs: [],
  appearance: {
    uiMode: "simple",
    experienceLevel: "beginner",
    colorScheme: "curxor",
    themeMode: "dark",
  },
  intelligence: {
    primarySource: "local",
    localModel: "qwen3:8b",
    frontierProviderId: null,
    frontierModel: null,
    allowFrontierForChat: true,
    allowFrontierForPlanning: true,
    connectedProviders: {},
  },
  multiModel: {
    enabled: false,
    planningProviderId: null,
    codingProviderId: null,
    longContextProviderId: null,
  },
  mcp: {
    enabled: false,
    servers: [],
  },
  egress: {
    allowHosts: [],
  },
  buildPlane: { ...DEFAULT_BUILD_PLANE },
  patronAsk: { ui: "minimized", lastReadAt: null },
  updatedAt: new Date(0).toISOString(),
};

export function getUserSettingsPath(): string {
  return process.env.CURXOR_USER_SETTINGS_PATH ?? "/etc/curxor/user-settings.json";
}

export function getLlmCredentialsPath(): string {
  return process.env.CURXOR_LLM_CREDENTIALS_PATH ?? "/etc/curxor/llm-credentials.json";
}

export function isBuildPlaneLinkStatus(v: unknown): v is BuildPlaneLinkStatus {
  return v === "disconnected" || v === "linked" || v === "error";
}

export function isBuildPlaneWorkerStatus(v: unknown): v is BuildPlaneWorkerStatus {
  return v === "unknown" || v === "online" || v === "offline";
}
