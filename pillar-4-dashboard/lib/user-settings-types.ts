import type { OotbAppId } from "./ootb-apps";

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
  appearance: {
    uiMode: UiMode;
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
  updatedAt: string;
}

export type UserSettingsPatch = {
  selectedApps?: OotbAppId[];
  appearance?: Partial<UserSettings["appearance"]>;
  intelligence?: Partial<UserSettings["intelligence"]>;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  version: 1,
  selectedApps: ["my-capital", "my-content-creator", "my-work"],
  appearance: {
    uiMode: "simple",
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
  updatedAt: new Date(0).toISOString(),
};

export function getUserSettingsPath(): string {
  return process.env.CURXOR_USER_SETTINGS_PATH ?? "/etc/curxor/user-settings.json";
}

export function getLlmCredentialsPath(): string {
  return process.env.CURXOR_LLM_CREDENTIALS_PATH ?? "/etc/curxor/llm-credentials.json";
}
