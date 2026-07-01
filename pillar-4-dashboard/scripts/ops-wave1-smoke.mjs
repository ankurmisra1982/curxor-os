#!/usr/bin/env node
/**
 * Ops Wave 1 — key audit + first-bridge smoke for ops@curxor.ai.
 * Reads config/local/ops-digital.env only (never prints secret values).
 *
 * Usage:
 *   node scripts/ops-wave1-smoke.mjs [baseUrl]
 *   npm run ops:wave1-smoke
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const OPS_ENV = path.join(REPO, "config", "local", "ops-digital.env");
const GOOGLE_OAUTH = path.join(__dirname, "dev-qa", "work-google-oauth.json");
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

const WAVE1_KEYS = {
  google: ["CURXOR_GOOGLE_OAUTH_CLIENT_ID", "CURXOR_GOOGLE_OAUTH_CLIENT_SECRET"],
  alpaca: ["ALPACA_API_KEY_ID", "ALPACA_API_SECRET_KEY"],
  bluesky: ["BLUESKY_HANDLE", "BLUESKY_APP_PASSWORD"],
  x: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"],
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_DEFAULT_CHAT_ID"],
  discord: ["DISCORD_BOT_TOKEN", "DISCORD_CHANNEL_ID"],
};

let pass = 0;
let skip = 0;
let fail = 0;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const vars = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    vars[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

function groupReady(env, keys) {
  const missing = keys.filter((k) => !env[k]?.trim());
  return { ready: missing.length === 0, missing };
}

async function check(name, fn, { optional = false } = {}) {
  try {
    const result = await fn();
    if (result === "skip") {
      console.log(`SKIP · ${name}`);
      skip++;
      return;
    }
    if (result) {
      console.log(`PASS · ${name}`);
      pass++;
    } else {
      console.log(`FAIL · ${name}`);
      fail++;
    }
  } catch (err) {
    console.log(`FAIL · ${name} (${err instanceof Error ? err.message : String(err)})`);
    fail++;
  }
}

async function serverUp() {
  try {
    const res = await fetch(`${BASE}/api/setup/status`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function postJson(p, body) {
  const res = await fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

console.log("==> Ops Wave 1 smoke · ops@curxor.ai");
console.log(`    env: ${OPS_ENV}`);
console.log(`    base: ${BASE}\n`);

await check("ops-digital.env exists", async () => existsSync(OPS_ENV));

const env = loadEnvFile(OPS_ENV);

for (const [group, keys] of Object.entries(WAVE1_KEYS)) {
  const { ready, missing } = groupReady(env, keys);
  const label = ready ? "keys SET" : `keys missing: ${missing.join(", ")}`;
  console.log(`AUDIT · ${group} · ${label}`);
}

console.log("");

// ── Google Workspace (Wave 0.5 — first live bridge) ───────────────────────────
const googleKeys = groupReady(env, WAVE1_KEYS.google);
let googleLinked = false;
if (existsSync(GOOGLE_OAUTH)) {
  try {
    const oauth = JSON.parse(readFileSync(GOOGLE_OAUTH, "utf8"));
    googleLinked = Boolean(oauth.linked && oauth.tokens?.accessToken);
    const exp = oauth.tokens?.expiresAt;
    console.log(`INFO · Google OAuth file · linked=${googleLinked}${exp ? ` · expires=${exp}` : ""}`);
  } catch {
    console.log("INFO · Google OAuth file · unreadable");
  }
}

await check("Google OAuth client configured", async () => googleKeys.ready);

await check(
  "Google OAuth tokens linked",
  async () => googleLinked,
  { optional: !googleKeys.ready },
);

if (googleKeys.ready && googleLinked) {
  await check("Google token refresh / userinfo", async () => {
    const clientId = env.CURXOR_GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = env.CURXOR_GOOGLE_OAUTH_CLIENT_SECRET;
    const oauth = JSON.parse(readFileSync(GOOGLE_OAUTH, "utf8"));
    let accessToken = oauth.tokens?.accessToken;
    const refreshToken = oauth.tokens?.refreshToken;
    const expiresAt = oauth.tokens?.expiresAt ? Date.parse(oauth.tokens.expiresAt) : 0;
    if (expiresAt && expiresAt <= Date.now() + 60_000 && refreshToken) {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      });
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) return false;
      const data = await res.json();
      accessToken = data.access_token;
    }
    if (!accessToken) return false;
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const user = await res.json();
    console.log(`      → ${user.email ?? user.id ?? "authenticated"}`);
    return true;
  });
}

const up = await serverUp();
console.log(`\nINFO · dashboard ${up ? "UP" : "DOWN"} at ${BASE}\n`);

if (up) {
  await check("API /api/work/google linked", async () => {
    const res = await fetch(`${BASE}/api/work/google`, { cache: "no-store" });
    const json = await res.json();
    return res.ok && json.linked === true && json.clientConfigured === true;
  });

  await check("API work live_proof googleLinked", async () => {
    const { ok, json } = await postJson("/api/work/status", { action: "live_proof" });
    const lp = json.liveProof;
    return ok && lp?.googleLinked === true;
  });
}

// ── Alpaca paper ──────────────────────────────────────────────────────────────
const alpaca = groupReady(env, WAVE1_KEYS.alpaca);
if (!alpaca.ready) {
  await check("Alpaca paper account", async () => "skip");
} else {
  await check("Alpaca paper account", async () => {
    const base = (env.ALPACA_PAPER_BASE_URL ?? "https://paper-api.alpaca.markets").replace(/\/$/, "");
    const res = await fetch(`${base}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": env.ALPACA_API_KEY_ID,
        "APCA-API-SECRET-KEY": env.ALPACA_API_SECRET_KEY,
      },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    console.log(`      → equity $${data.equity ?? "—"} · status ${data.status ?? "—"}`);
    return true;
  });

  if (up) {
    await check("API connector alpaca_paper verify", async () => {
      const { ok, json } = await postJson("/api/shell/connectors/link", {
        connectorId: "alpaca_paper",
        action: "verify",
      });
      return ok && json.connected === true;
    });
  }
}

// ── Bluesky ───────────────────────────────────────────────────────────────────
const bsky = groupReady(env, WAVE1_KEYS.bluesky);
if (!bsky.ready) {
  await check("Bluesky session", async () => "skip");
} else {
  await check("Bluesky session", async () => {
    const pds = (env.BLUESKY_PDS_URL ?? "https://bsky.social").replace(/\/$/, "");
    const res = await fetch(`${pds}/xrpc/com.atproto.server.createSession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: env.BLUESKY_HANDLE, password: env.BLUESKY_APP_PASSWORD }),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    console.log(`      → @${data.handle ?? env.BLUESKY_HANDLE}`);
    return Boolean(data.did && data.accessJwt);
  });
}

// ── X / Twitter ─────────────────────────────────────────────────────────────────
const xKeys = groupReady(env, WAVE1_KEYS.x);
if (!xKeys.ready) {
  await check("X API credentials", async () => "skip");
} else {
  await check("X API verify_credentials", async () => {
    const url = "https://api.twitter.com/1.1/account/verify_credentials.json";
    // OAuth 1.0a user context — minimal smoke via bearer if only bearer set
    const bearer = env.X_BEARER_TOKEN?.trim();
    if (bearer) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` }, cache: "no-store" });
      return res.ok;
    }
    return "skip"; // full OAuth1 signing deferred — keys present, manual publish smoke
  });
}

// ── Telegram ────────────────────────────────────────────────────────────────────
const tg = groupReady(env, WAVE1_KEYS.telegram);
if (!tg.ready) {
  await check("Telegram bot", async () => "skip");
} else {
  await check("Telegram bot getMe", async () => {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`, {
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.ok) return false;
    console.log(`      → @${data.result?.username ?? "bot"}`);
    return true;
  });
}

// ── Discord ─────────────────────────────────────────────────────────────────────
const discord = groupReady(env, WAVE1_KEYS.discord);
if (!discord.ready) {
  await check("Discord bot", async () => "skip");
} else {
  await check("Discord bot @me", async () => {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    console.log(`      → ${data.username ?? "bot"}#${data.discriminator ?? "0000"}`);
    return Boolean(data.id);
  });
}

// ── Live money gate ─────────────────────────────────────────────────────────────
const live = env.CURXOR_CAPITAL_LIVE_ENABLED?.trim();
console.log(`\nINFO · CURXOR_CAPITAL_LIVE_ENABLED=${live || "0"} (paper only expected)`);

console.log(`\nResults: ${pass} passed, ${skip} skipped, ${fail} failed`);

const wave1Pending = Object.entries(WAVE1_KEYS)
  .filter(([group]) => {
    if (group === "google") return !googleLinked;
    return !groupReady(env, WAVE1_KEYS[group]).ready;
  })
  .map(([g]) => g);

if (wave1Pending.length) {
  console.log(`\nWave 1 still open: ${wave1Pending.join(", ")}`);
  console.log("Edit config/local/ops-digital.env — never paste keys in chat.");
}

if (fail > 0) process.exitCode = 1;
else if (pass === 0 && skip > 0) process.exitCode = 2;
