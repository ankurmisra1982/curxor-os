import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import type { OotbAppId } from "../ootb-apps";

import {
  DEFAULT_CHANNEL_CONFIG,
  type ChannelConfig,
  type ChannelSession,
  type ChannelType,
} from "./channel-types";
import type { AgentChatTurn } from "../app-agent-types";
import { parseChannelCommand, parseTelegramCommand, channelHelpText } from "./channel-commands";

export { parseChannelCommand, parseTelegramCommand, channelHelpText };

function channelsDir(): string {
  return process.env.CURXOR_CHANNELS_PATH ?? "/etc/curxor/channels";
}

function configPath(): string {
  return path.join(channelsDir(), "config.json");
}

function sessionsPath(): string {
  return path.join(channelsDir(), "sessions.json");
}

async function readConfig(): Promise<ChannelConfig> {
  try {
    const raw = await readFile(configPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ChannelConfig>;
    if (parsed.version !== 1) throw new Error("invalid");
    return normalizeChannelConfig(parsed);
  } catch {
    return { ...DEFAULT_CHANNEL_CONFIG, updatedAt: new Date().toISOString() };
  }
}

function normalizeChannelConfig(parsed: Partial<ChannelConfig>): ChannelConfig {
  return {
    version: 1,
    enabled: parsed.enabled ?? DEFAULT_CHANNEL_CONFIG.enabled,
    defaultAppId: parsed.defaultAppId ?? DEFAULT_CHANNEL_CONFIG.defaultAppId,
    telegram: { ...DEFAULT_CHANNEL_CONFIG.telegram, ...parsed.telegram },
    slack: { ...DEFAULT_CHANNEL_CONFIG.slack, ...parsed.slack },
    whatsapp: { ...DEFAULT_CHANNEL_CONFIG.whatsapp, ...parsed.whatsapp },
    imessage: { ...DEFAULT_CHANNEL_CONFIG.imessage, ...parsed.imessage },
    routeRules: Array.isArray(parsed.routeRules) ? parsed.routeRules : [],
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeSession(raw: Partial<ChannelSession> & { id: string }): ChannelSession {
  return {
    id: raw.id,
    channel: raw.channel ?? "webchat",
    externalChatId: raw.externalChatId ?? raw.id.split(":").slice(1).join(":") ?? raw.id,
    appId: raw.appId ?? "my-capital",
    profileId: raw.profileId ?? null,
    senderLabel: raw.senderLabel ?? null,
    lastPreview: raw.lastPreview ?? null,
    history: Array.isArray(raw.history) ? raw.history : [],
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

async function writeConfig(config: ChannelConfig): Promise<void> {
  await mkdir(channelsDir(), { recursive: true });
  config.updatedAt = new Date().toISOString();
  await writeFile(configPath(), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o640 });
}

async function readSessions(): Promise<ChannelSession[]> {
  try {
    const raw = await readFile(sessionsPath(), "utf8");
    const parsed = JSON.parse(raw) as { sessions?: Array<Partial<ChannelSession> & { id: string }> };
    if (!Array.isArray(parsed.sessions)) return [];
    return parsed.sessions.map(normalizeSession);
  } catch {
    return [];
  }
}

async function writeSessions(sessions: ChannelSession[]): Promise<void> {
  await mkdir(channelsDir(), { recursive: true });
  await writeFile(sessionsPath(), `${JSON.stringify({ sessions }, null, 2)}\n`, { mode: 0o640 });
}

export async function getChannelConfig(): Promise<ChannelConfig> {
  return readConfig();
}

export async function updateChannelConfig(patch: Partial<ChannelConfig>): Promise<ChannelConfig> {
  const current = await readConfig();
  const next: ChannelConfig = {
    ...current,
    ...patch,
    telegram: { ...current.telegram, ...patch.telegram },
    slack: { ...current.slack, ...patch.slack },
    whatsapp: { ...current.whatsapp, ...patch.whatsapp },
    imessage: { ...current.imessage, ...patch.imessage },
    routeRules: patch.routeRules ?? current.routeRules,
  };
  await writeConfig(next);
  return next;
}

export async function ensureWhatsAppVerifyToken(): Promise<string> {
  const config = await readConfig();
  if (config.whatsapp.verifyToken) return config.whatsapp.verifyToken;
  const token = randomBytes(16).toString("hex");
  config.whatsapp.verifyToken = token;
  await writeConfig(config);
  return token;
}

export async function ensureIMessageWebhookSecret(): Promise<string> {
  const config = await readConfig();
  if (config.imessage.webhookSecret) return config.imessage.webhookSecret;
  const secret = randomBytes(16).toString("hex");
  config.imessage.webhookSecret = secret;
  await writeConfig(config);
  return secret;
}

export async function ensureTelegramWebhookSecret(): Promise<string> {
  const config = await readConfig();
  if (config.telegram.webhookSecret) return config.telegram.webhookSecret;
  const secret = randomBytes(16).toString("hex");
  config.telegram.webhookSecret = secret;
  await writeConfig(config);
  return secret;
}

export function resolveAppIdForChat(
  config: ChannelConfig,
  channel: ChannelType,
  externalChatId: string,
  commandAppId?: OotbAppId | null,
): OotbAppId {
  if (commandAppId) return commandAppId;
  const rule = config.routeRules.find((r) => r.channel === channel && r.externalChatId === externalChatId);
  if (rule) return rule.appId;
  return config.defaultAppId;
}

export async function getOrCreateSession(
  channel: ChannelType,
  externalChatId: string,
  appId: OotbAppId,
  opts?: { profileId?: string | null; senderLabel?: string | null },
): Promise<ChannelSession> {
  const sessions = await readSessions();
  const id = `${channel}:${externalChatId}`;
  let session = sessions.find((s) => s.id === id);
  if (!session) {
    session = {
      id,
      channel,
      externalChatId,
      appId,
      profileId: opts?.profileId ?? null,
      senderLabel: opts?.senderLabel ?? null,
      lastPreview: null,
      history: [],
      updatedAt: new Date().toISOString(),
    };
    sessions.push(session);
  } else {
    session.appId = appId;
    if (opts?.profileId) session.profileId = opts.profileId;
    if (opts?.senderLabel) session.senderLabel = opts.senderLabel;
    session.updatedAt = new Date().toISOString();
  }
  await writeSessions(sessions);
  return session;
}

export async function appendSessionTurn(
  sessionId: string,
  turn: AgentChatTurn,
  maxHistory = 20,
): Promise<ChannelSession | null> {
  const sessions = await readSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  session.history = [...session.history, turn].slice(-maxHistory);
  session.lastPreview = turn.text.slice(0, 160);
  session.updatedAt = new Date().toISOString();
  await writeSessions(sessions);
  return session;
}

export async function getChannelSession(sessionId: string): Promise<ChannelSession | null> {
  const sessions = await readSessions();
  return sessions.find((s) => s.id === sessionId) ?? null;
}

export async function listChannelSessions(): Promise<ChannelSession[]> {
  return readSessions();
}
