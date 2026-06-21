import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getFrontierProvider } from "./frontier-providers";
import {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  type OAuthTokenSet,
} from "./oauth/token-exchange";
import { createPkcePair, generateOAuthState } from "./oauth/pkce";
import {
  getOAuthConfig,
  providerSupportsOAuth,
  resolveOAuthRedirectUri,
} from "./oauth/provider-config";
import { setProviderOAuthTokens } from "./llm-credentials";
import { sanitizeSettingsForClient, updateUserSettings, readUserSettings } from "./user-settings";

import type { ProviderLinkMode } from "./provider-link-types";

export interface ProviderLinkSession {
  id: string;
  providerId: string;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
  status: "pending" | "completed" | "expired";
  frontierModel: string | null;
  linkMode: ProviderLinkMode;
  oauthState: string | null;
  codeVerifier: string | null;
  redirectUri: string | null;
  authorizeUrl: string | null;
}

interface ProviderLinkSessionFile {
  sessions: ProviderLinkSession[];
}

const SESSION_TTL_MS = 30 * 60 * 1000;

function sessionsPath(): string {
  return process.env.CURXOR_PROVIDER_LINK_SESSIONS_PATH ?? "/etc/curxor/provider-link-sessions.json";
}

async function readSessionFile(): Promise<ProviderLinkSessionFile> {
  try {
    const raw = await readFile(sessionsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ProviderLinkSessionFile>;
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    return { sessions: sessions.map(normalizeSession) };
  } catch {
    return { sessions: [] };
  }
}

function normalizeSession(session: ProviderLinkSession): ProviderLinkSession {
  return {
    ...session,
    linkMode: session.linkMode ?? "guided",
    oauthState: session.oauthState ?? null,
    codeVerifier: session.codeVerifier ?? null,
    redirectUri: session.redirectUri ?? null,
    authorizeUrl: session.authorizeUrl ?? null,
    expiresAt: session.expiresAt ?? new Date(Date.parse(session.createdAt) + SESSION_TTL_MS).toISOString(),
    status: session.status ?? "pending",
  };
}

async function writeSessionFile(data: ProviderLinkSessionFile): Promise<void> {
  const filePath = sessionsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function isSessionExpired(session: ProviderLinkSession): boolean {
  return Date.now() > Date.parse(session.expiresAt);
}

export async function createProviderLinkSession(
  providerId: string,
  frontierModel: string | null,
  requestOrigin: string,
): Promise<ProviderLinkSession> {
  const provider = getFrontierProvider(providerId);
  if (!provider || !provider.supportsSubscriptionLogin) {
    throw new Error("Provider does not support subscription linking");
  }

  const oauthConfig = getOAuthConfig(providerId);
  const useOAuth = Boolean(oauthConfig);

  let oauthState: string | null = null;
  let codeVerifier: string | null = null;
  let redirectUri: string | null = null;
  let authorizeUrl: string | null = null;

  if (useOAuth && oauthConfig) {
    const pkce = createPkcePair();
    oauthState = generateOAuthState();
    codeVerifier = pkce.codeVerifier;
    redirectUri = resolveOAuthRedirectUri(oauthConfig, requestOrigin);
    authorizeUrl = buildAuthorizeUrl(
      oauthConfig,
      redirectUri,
      oauthState,
      pkce.codeChallenge,
    );
  }

  const file = await readSessionFile();
  const session: ProviderLinkSession = {
    id: randomUUID(),
    providerId,
    createdAt: new Date().toISOString(),
    completedAt: null,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    status: "pending",
    frontierModel,
    linkMode: useOAuth ? "oauth" : "guided",
    oauthState,
    codeVerifier,
    redirectUri,
    authorizeUrl,
  };
  file.sessions.unshift(session);
  await writeSessionFile(file);
  return session;
}

export async function getProviderLinkSession(sessionId: string): Promise<ProviderLinkSession | null> {
  const file = await readSessionFile();
  const session = file.sessions.find((entry) => entry.id === sessionId);
  if (!session) return null;
  if (session.status === "pending" && isSessionExpired(session)) {
    session.status = "expired";
    await writeSessionFile(file);
  }
  return session;
}

async function markSessionCompleted(session: ProviderLinkSession): Promise<void> {
  const file = await readSessionFile();
  const entry = file.sessions.find((s) => s.id === session.id);
  if (entry) {
    entry.status = "completed";
    entry.completedAt = new Date().toISOString();
    await writeSessionFile(file);
  }
}

async function applyProviderConnection(
  providerId: string,
  frontierModel: string | null,
  options: { oauthLinked: boolean; subscriptionLinked: boolean; hasApiKey?: boolean },
) {
  const provider = getFrontierProvider(providerId);
  if (!provider) throw new Error("Unknown provider");

  const current = await readUserSettings();
  const existing = current.intelligence.connectedProviders[providerId];

  const settings = await updateUserSettings({
    intelligence: {
      frontierProviderId: providerId,
      frontierModel:
        frontierModel ??
        current.intelligence.frontierModel ??
        provider.models[0]?.id ??
        null,
      connectedProviders: {
        ...current.intelligence.connectedProviders,
        [providerId]: {
          connectedAt: new Date().toISOString(),
          label: provider.name,
          hasApiKey: options.hasApiKey ?? existing?.hasApiKey ?? false,
          oauthLinked: options.oauthLinked,
          subscriptionLinked: options.subscriptionLinked,
        },
      },
    },
  });

  return sanitizeSettingsForClient(settings);
}

export async function completeProviderLinkSession(sessionId: string) {
  const session = await getProviderLinkSession(sessionId);
  if (!session) throw new Error("Link session not found");
  if (session.status === "expired") throw new Error("Link session expired — start again from Settings");
  if (session.status === "completed") {
    return applyProviderConnection(session.providerId, session.frontierModel, {
      oauthLinked: false,
      subscriptionLinked: true,
    });
  }

  await markSessionCompleted(session);
  return applyProviderConnection(session.providerId, session.frontierModel, {
    oauthLinked: false,
    subscriptionLinked: true,
  });
}

export async function completeOAuthProviderLink(
  sessionId: string,
  code: string,
  state?: string | null,
) {
  const session = await getProviderLinkSession(sessionId);
  if (!session) throw new Error("Link session not found");
  if (session.linkMode !== "oauth") throw new Error("Session is not an OAuth link");
  if (session.status === "expired") throw new Error("Link session expired — start again from Settings");
  if (session.status === "completed") {
    const current = await readUserSettings();
    return sanitizeSettingsForClient(current);
  }

  if (state && session.oauthState && state !== session.oauthState) {
    throw new Error("OAuth state mismatch — try linking again");
  }

  const oauthConfig = getOAuthConfig(session.providerId);
  if (!oauthConfig || !session.codeVerifier || !session.redirectUri) {
    throw new Error("OAuth session is incomplete");
  }

  const tokens: OAuthTokenSet = await exchangeAuthorizationCode(
    oauthConfig,
    code,
    session.codeVerifier,
    session.redirectUri,
  );

  await setProviderOAuthTokens(session.providerId, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    tokenType: tokens.tokenType,
    accountId: tokens.accountId,
  });

  await markSessionCompleted(session);
  return applyProviderConnection(session.providerId, session.frontierModel, {
    oauthLinked: true,
    subscriptionLinked: true,
  });
}

export async function findOAuthSessionByState(state: string): Promise<ProviderLinkSession | null> {
  const file = await readSessionFile();
  const session = file.sessions.find(
    (entry) => entry.oauthState === state && entry.status === "pending",
  );
  if (!session) return null;
  if (isSessionExpired(session)) {
    session.status = "expired";
    await writeSessionFile(file);
    return null;
  }
  return session;
}

export { providerSupportsOAuth };
