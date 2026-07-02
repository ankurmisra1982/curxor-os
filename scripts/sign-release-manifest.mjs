#!/usr/bin/env node
/**
 * Build signed OTA version.json manifest (UP1).
 *
 * Usage:
 *   node scripts/sign-release-manifest.mjs \
 *     --version 1.0.0 \
 *     --released 2026-07-01 \
 *     --artifact-url https://…/curxor-os-1.0.0.tar.gz \
 *     --sha256 abc… \
 *     --out dist/release/version.json
 *
 * Signing: set CURXOR_RELEASE_SIGNING_KEY to PEM ed25519 private key (GitHub secret in CI).
 * Public key for future verify (UP7): config/ota/release-public.pem
 */
import { sign } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const out = {
    version: "",
    released: new Date().toISOString().slice(0, 10),
    artifactUrl: "",
    sha256: "",
    channel: "stable",
    minVersion: "",
    severity: "patch",
    requiresReboot: false,
    releaseNotesUrl: "",
    out: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--version" && next) {
      out.version = next;
      i++;
    } else if (arg === "--released" && next) {
      out.released = next;
      i++;
    } else if (arg === "--artifact-url" && next) {
      out.artifactUrl = next;
      i++;
    } else if (arg === "--sha256" && next) {
      out.sha256 = next;
      i++;
    } else if (arg === "--channel" && next) {
      out.channel = next;
      i++;
    } else if (arg === "--min-version" && next) {
      out.minVersion = next;
      i++;
    } else if (arg === "--severity" && next) {
      out.severity = next;
      i++;
    } else if (arg === "--release-notes-url" && next) {
      out.releaseNotesUrl = next;
      i++;
    } else if (arg === "--out" && next) {
      out.out = next;
      i++;
    }
  }
  return out;
}

function semverMajorMinor(v) {
  const parts = v.replace(/^v/i, "").split(".");
  return `${parts[0] ?? 0}.${parts[1] ?? 0}.0`;
}

function signingPayload(manifest) {
  return JSON.stringify({
    version: manifest.version,
    released: manifest.released,
    channel: manifest.channel,
    artifact: { sha256: manifest.artifact.sha256 },
  });
}

async function signManifest(manifest) {
  const keyPem = process.env.CURXOR_RELEASE_SIGNING_KEY?.trim();
  if (!keyPem) return "";

  try {
    const payload = Buffer.from(signingPayload(manifest), "utf8");
    const sig = sign(null, payload, keyPem);
    return sig.toString("base64");
  } catch (err) {
    console.warn("[sign-release-manifest] signing skipped:", err instanceof Error ? err.message : err);
    return "";
  }
}

const args = parseArgs(process.argv);
if (!args.version || !args.artifactUrl || !args.sha256 || !args.out) {
  console.error(
    "Usage: node sign-release-manifest.mjs --version V --artifact-url URL --sha256 HASH --out PATH",
  );
  process.exit(2);
}

const minVersion = args.minVersion || semverMajorMinor(args.version);
const releaseNotesUrl =
  args.releaseNotesUrl || `https://github.com/curxor/curxor-os/releases/tag/v${args.version}`;

const manifest = {
  version: args.version,
  released: args.released,
  channel: args.channel,
  min_version: minVersion,
  severity: args.severity,
  requires_reboot: args.requiresReboot,
  release_notes_url: releaseNotesUrl,
  artifact: {
    url: args.artifactUrl,
    sha256: args.sha256,
  },
  post_update: "scripts/post-update.sh",
  signature: "",
};

manifest.signature = await signManifest(manifest);

await mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
await writeFile(args.out, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${args.out}${manifest.signature ? " (signed)" : ""}`);
