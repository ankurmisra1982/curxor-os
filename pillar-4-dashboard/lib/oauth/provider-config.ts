import "server-only";

export type OAuthLinkMode = "redirect" | "manual_callback";

export interface OAuthProviderConfig {
  providerId: string;
  clientId: string;
  clientSecret?: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  /** How the provider expects the OAuth redirect to complete. */
  linkMode: OAuthLinkMode;
  /** Fixed redirect URI (OpenAI Codex flow). */
  fixedRedirectUri?: string;
  extraAuthorizeParams?: Record<string, string>;
}

const OPENAI_REDIRECT_URI = "http://localhost:1455/auth/callback";

export function getOAuthConfig(providerId: string): OAuthProviderConfig | null {
  switch (providerId) {
    case "openai":
      return {
        providerId: "openai",
        clientId: "app_EMoamEEZ73f0CkXaXp7hrann",
        authorizeUrl: "https://auth.openai.com/oauth/authorize",
        tokenUrl: "https://auth.openai.com/oauth/token",
        scopes: "openid profile email offline_access",
        linkMode: "manual_callback",
        fixedRedirectUri: OPENAI_REDIRECT_URI,
        extraAuthorizeParams: {
          id_token_add_organizations: "true",
          codex_cli_simplified_flow: "true",
          originator: "curxor_os",
        },
      };
    case "google": {
      const clientId = process.env.CURXOR_GOOGLE_OAUTH_CLIENT_ID?.trim();
      if (!clientId) return null;
      return {
        providerId: "google",
        clientId,
        clientSecret: process.env.CURXOR_GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes:
          "openid email profile https://www.googleapis.com/auth/generative-language",
        linkMode: "redirect",
      };
    }
    default:
      return null;
  }
}

export function resolveOAuthRedirectUri(
  config: OAuthProviderConfig,
  requestOrigin: string,
): string {
  if (config.fixedRedirectUri) return config.fixedRedirectUri;
  return `${requestOrigin.replace(/\/$/, "")}/api/settings/llm/oauth/callback`;
}

export function providerSupportsOAuth(providerId: string): boolean {
  return getOAuthConfig(providerId) !== null;
}
