import "server-only";

import { spawnSync } from "node:child_process";
import path from "node:path";

export type TtsEngine = "piper" | "espeak" | "none";

export function detectTtsEngine(): TtsEngine {
  const forced = process.env.CURXOR_TTS_ENGINE?.trim().toLowerCase();
  if (forced === "off" || forced === "none") return "none";
  if (forced === "espeak") return espeakAvailable() ? "espeak" : "none";
  if (forced === "piper") return piperAvailable() ? "piper" : "none";

  if (piperAvailable()) return "piper";
  if (espeakAvailable()) return "espeak";
  return "none";
}

function espeakAvailable(): boolean {
  const proc = spawnSync("espeak-ng", ["--version"], { encoding: "utf8" });
  if (proc.status === 0) return true;
  const legacy = spawnSync("espeak", ["--version"], { encoding: "utf8" });
  return legacy.status === 0;
}

function piperAvailable(): boolean {
  const bin = process.env.CURXOR_PIPER_BIN?.trim() || "piper";
  const model = process.env.CURXOR_PIPER_MODEL?.trim();
  if (!model) return false;
  const proc = spawnSync(bin, ["--version"], { encoding: "utf8" });
  return proc.status === 0;
}

function voiceoverText(script: string): string {
  const cleaned = script.replace(/#[\w]+/g, "").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 500) || "CurXor Creator Claw on sovereign edge.";
}

export function synthesizeVoiceover(
  script: string,
  wavPath: string,
  options?: { voice?: string },
): { engine: TtsEngine; path: string } {
  const engine = detectTtsEngine();
  const text = voiceoverText(script);
  if (engine === "none") {
    throw new Error("No TTS engine — install espeak-ng or configure CURXOR_PIPER_MODEL");
  }

  if (engine === "piper") {
    const bin = process.env.CURXOR_PIPER_BIN?.trim() || "piper";
    const model = process.env.CURXOR_PIPER_MODEL!.trim();
    const proc = spawnSync(
      bin,
      ["--model", model, "--output_file", wavPath],
      { encoding: "utf8", input: text },
    );
    if (proc.status !== 0) {
      throw new Error((proc.stderr || "piper TTS failed").slice(0, 200));
    }
    return { engine, path: wavPath };
  }

  const espeakBin = spawnSync("espeak-ng", ["--version"], { encoding: "utf8" }).status === 0 ? "espeak-ng" : "espeak";
  const voice = options?.voice?.trim() || process.env.CURXOR_TTS_VOICE?.trim() || "en-us";
  const proc = spawnSync(
    espeakBin,
    ["-w", wavPath, "-s", process.env.CURXOR_TTS_SPEED?.trim() || "160", "-v", voice, text],
    { encoding: "utf8" },
  );
  if (proc.status !== 0) {
    throw new Error((proc.stderr || "espeak TTS failed").slice(0, 200));
  }
  return { engine, path: wavPath };
}

export function ttsLabel(): string {
  const e = detectTtsEngine();
  if (e === "piper") return "piper";
  if (e === "espeak") return "espeak-ng";
  return "none";
}
