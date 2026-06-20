#!/usr/bin/env node
/**
 * CurXor OS Pillar 2 — OpenClaw pivot entrypoint.
 * Physical I/O only. Local inference only.
 */

import { AgentLoop } from "./agent/loop.js";
import { loadConfig } from "./config/env.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const agent = new AgentLoop(config);

  const shutdown = () => {
    console.error("[curxor-engine] shutting down");
    agent.stop();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await agent.start();
}

main().catch((error) => {
  console.error("[curxor-engine] fatal:", error);
  process.exit(1);
});
