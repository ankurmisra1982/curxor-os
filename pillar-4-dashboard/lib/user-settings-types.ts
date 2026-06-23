import type { OotbAppId } from "./ootb-apps";
import type { ExperienceLevel } from "./experience-level";
import type { GrowthLevel } from "./os-growth-level";

/** @deprecated use ExperienceLevel from experience-level.ts */
export type UiMode = "simple" | "expert";
export type ColorScheme = "curxor" | "ocean" | "amber" | "mono";
export type ThemeMode = "dark" | "light" | "system";
export type IntelligenceSource = "local" | "frontier" | "auto";

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
    /** Optional Work Claw growth override (L1–L5). */
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
    /** Suppress Work Claw XP emit to Claw Cafe */
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
    localModel: "qwen2.5:7b-instruct-q4_K_M",
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
  updatedAt: new Date(0).toISOString(),
};

export function getUserSettingsPath(): string {
  return process.env.CURXOR_USER_SETTINGS_PATH ?? "/etc/curxor/user-settings.json";
}

export function getLlmCredentialsPath(): string {
  return process.env.CURXOR_LLM_CREDENTIALS_PATH ?? "/etc/curxor/llm-credentials.json";
}
