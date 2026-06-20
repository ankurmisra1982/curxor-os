#!/usr/bin/env node
/**
 * Poll until the dashboard responds on /api/setup/status.
 * Usage: node scripts/wait-for-server.mjs [baseUrl] [timeoutMs]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";
const TIMEOUT_MS = Number.parseInt(process.argv[3] ?? "60000", 10);
const started = Date.now();

while (Date.now() - started < TIMEOUT_MS) {
  try {
    const res = await fetch(`${BASE}/api/setup/status`, { cache: "no-store" });
    if (res.ok) {
      console.log(`Server ready · ${BASE}`);
      process.exit(0);
    }
  } catch {
    /* retry */
  }
  await new Promise((r) => setTimeout(r, 500));
}

console.error(`Timed out waiting for ${BASE}`);
process.exit(1);
