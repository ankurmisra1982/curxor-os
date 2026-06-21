import "server-only";

import { createHash, randomBytes } from "node:crypto";

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}

/** Parse authorization code from a pasted callback URL or raw code string. */
export function parseAuthorizationCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      return url.searchParams.get("code");
    } catch {
      return null;
    }
  }

  return trimmed;
}
