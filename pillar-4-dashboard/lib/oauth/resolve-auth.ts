import "server-only";

import {
  getProviderApiKey,
  getProviderOAuthTokens,
  setProviderOAuthTokens,
} from "../llm-credentials";
import { getOAuthConfig } from "./provider-config";
import { refreshOAuthToken } from "./token-exchange";

export interface ResolvedFrontierAuth {
  kind: "api_key" | "oauth";
  credential: string;
}

export async function resolveFrontierAuth(
  providerId: string,
): Promise<ResolvedFrontierAuth | null> {
  const apiKey = await getProviderApiKey(providerId);
  if (apiKey) return { kind: "api_key", credential: apiKey };

  const oauth = await getProviderOAuthTokens(providerId);
  if (!oauth) return null;

  const config = getOAuthConfig(providerId);
  if (!config) return { kind: "oauth", credential: oauth.accessToken };

  const expired =
    oauth.expiresAt !== null && Date.parse(oauth.expiresAt) <= Date.now() + 60_000;

  if (!expired) return { kind: "oauth", credential: oauth.accessToken };

  if (!oauth.refreshToken) return { kind: "oauth", credential: oauth.accessToken };

  try {
    const refreshed = await refreshOAuthToken(config, oauth.refreshToken);
    await setProviderOAuthTokens(providerId, {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
      tokenType: refreshed.tokenType,
      accountId: refreshed.accountId ?? oauth.accountId,
    });
    return { kind: "oauth", credential: refreshed.accessToken };
  } catch {
    return { kind: "oauth", credential: oauth.accessToken };
  }
}
