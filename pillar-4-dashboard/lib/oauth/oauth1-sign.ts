import { createHmac, randomBytes } from "node:crypto";

function pctEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizeUrl(url: string): string {
  const u = new URL(url);
  u.search = "";
  return `${u.protocol}//${u.host}${u.pathname}`;
}

export function generateOAuthNonce(): string {
  return randomBytes(16).toString("hex");
}

export function buildOAuth1AuthorizationHeader(input: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  extraParams?: Record<string, string>;
  callback?: string;
  verifier?: string;
}): { header: string; params: Record<string, string> } {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: input.consumerKey,
    oauth_nonce: generateOAuthNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
  };
  if (input.token) oauthParams.oauth_token = input.token;
  if (input.callback) oauthParams.oauth_callback = input.callback;
  if (input.verifier) oauthParams.oauth_verifier = input.verifier;

  const allParams = { ...oauthParams, ...(input.extraParams ?? {}) };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(allParams[k]!)}`)
    .join("&");

  const baseString = [
    input.method.toUpperCase(),
    pctEncode(normalizeUrl(input.url)),
    pctEncode(paramString),
  ].join("&");

  const signingKey = `${pctEncode(input.consumerSecret)}&${pctEncode(input.tokenSecret ?? "")}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");
  oauthParams.oauth_signature = signature;

  const header =
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${pctEncode(k)}="${pctEncode(oauthParams[k]!)}"`)
      .join(", ");

  return { header, params: oauthParams };
}
