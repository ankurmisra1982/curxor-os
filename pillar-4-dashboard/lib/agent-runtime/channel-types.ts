import type { OotbAppId } from "../ootb-apps";
import type { AgentChatTurn } from "../app-agent-types";

export type ChannelType = "telegram" | "slack" | "whatsapp" | "imessage" | "webchat";

export interface ChannelConfig {
  version: 1;
  enabled: boolean;
  defaultAppId: OotbAppId;
  telegram: {
    enabled: boolean;
    botUsername: string | null;
    webhookSecret: string | null;
  };
  slack: {
    enabled: boolean;
    signingSecret: string | null;
  };
  whatsapp: {
    enabled: boolean;
    verifyToken: string | null;
    phoneNumberId: string | null;
  };
  imessage: {
    enabled: boolean;
    webhookSecret: string | null;
  };
  /** Map external chat id → appId override */
  routeRules: Array<{ channel: ChannelType; externalChatId: string; appId: OotbAppId }>;
  updatedAt: string;
}

export interface ChannelSession {
  id: string;
  channel: ChannelType;
  externalChatId: string;
  appId: OotbAppId;
  profileId: string | null;
  senderLabel: string | null;
  lastPreview: string | null;
  history: AgentChatTurn[];
  updatedAt: string;
}

export const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  version: 1,
  enabled: false,
  defaultAppId: "my-capital",
  telegram: { enabled: false, botUsername: null, webhookSecret: null },
  slack: { enabled: false, signingSecret: null },
  whatsapp: { enabled: false, verifyToken: null, phoneNumberId: null },
  imessage: { enabled: false, webhookSecret: null },
  routeRules: [],
  updatedAt: new Date(0).toISOString(),
};
