import "server-only";

import { readFile, writeFile } from "node:fs/promises";

import { curxorDataPath } from "./curxor-data-dir";
import { isDigitalEnvFlag } from "./digital-env";
import { emitOsEvent } from "./os-event-bus";

interface EnO2HealthState {
  down: boolean;
  updatedAt: string;
  reason: string | null;
}

async function readState(): Promise<EnO2HealthState | null> {
  try {
    const raw = await readFile(curxorDataPath("eno2-health-state.json"), "utf8");
    return JSON.parse(raw) as EnO2HealthState;
  } catch {
    return null;
  }
}

async function writeState(state: EnO2HealthState): Promise<void> {
  await writeFile(curxorDataPath("eno2-health-state.json"), `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o640,
  });
}

export async function probeEno2Health(): Promise<{ down: boolean; reason: string }> {
  if (await isDigitalEnvFlag("CURXOR_ENO2_DOWN")) {
    return { down: true, reason: "CURXOR_ENO2_DOWN flag set in digital.env" };
  }

  try {
    const { getMeshBridge } = await import("./zmq-bridge");
    await getMeshBridge().ensureStarted();
    return { down: false, reason: "mesh bridge connected" };
  } catch (err) {
    return {
      down: true,
      reason: err instanceof Error ? err.message : "mesh bridge unavailable",
    };
  }
}

/** Emit eno2.down on transition to down (not on every poll). */
export async function pollEno2HealthAndEmit(): Promise<{
  down: boolean;
  reason: string;
  emitted: boolean;
}> {
  const probe = await probeEno2Health();
  const prev = await readState();
  let emitted = false;

  if (probe.down && !prev?.down) {
    await emitOsEvent("eno2.down", {
      dedupeKey: "eno2:down",
      reason: probe.reason,
    });
    emitted = true;
  }

  await writeState({
    down: probe.down,
    updatedAt: new Date().toISOString(),
    reason: probe.down ? probe.reason : null,
  });

  return { ...probe, emitted };
}
