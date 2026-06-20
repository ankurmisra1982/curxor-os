import { existsSync } from "node:fs";
import { mkdirSync, openSync, readSync, closeSync, statSync, watch, type FSWatcher } from "node:fs";
import { dirname } from "node:path";

export function getOtaLogPath(): string {
  return process.env.CURXOR_OTA_LOG ?? "/var/log/curxor/ota-update.log";
}

export type OtaLogLevel = "info" | "error" | "system";

export interface OtaLogEvent {
  line: string;
  seq: number;
  ts: string;
  level: OtaLogLevel;
  status?: "waiting" | "live" | "bootstrap";
}

const BOOTSTRAP_BYTES = 32_768;

export function classifyOtaLine(line: string): OtaLogLevel {
  if (/\bERROR\b/i.test(line)) return "error";
  if (line.includes("──") || (/\bOTA\b/i.test(line) && /started|successful|ROLLBACK/i.test(line))) {
    return "system";
  }
  return "info";
}

/** Tail OTA log file; invokes callback for each line and on bootstrap status. */
export function createOtaLogTail(onEvent: (event: OtaLogEvent) => void): () => void {
  const logPath = getOtaLogPath();
  let position = 0;
  let seq = 0;
  let leftover = "";
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let fileWatcher: FSWatcher | null = null;
  let dirWatcher: FSWatcher | null = null;

  const emit = (line: string, status?: OtaLogEvent["status"]) => {
    const trimmed = line.trimEnd();
    if (!trimmed) return;
    seq += 1;
    onEvent({
      line: trimmed,
      seq,
      ts: new Date().toISOString(),
      level: classifyOtaLine(trimmed),
      status,
    });
  };

  const readNewBytes = (): boolean => {
    if (!existsSync(logPath)) return false;

    const fd = openSync(logPath, "r");
    try {
      const stat = statSync(logPath);
      if (stat.size < position) {
        position = 0;
        leftover = "";
      }

      const toRead = stat.size - position;
      if (toRead <= 0) return true;

      const buf = Buffer.alloc(toRead);
      readSync(fd, buf, 0, toRead, position);
      position = stat.size;

      const text = leftover + buf.toString("utf8");
      const lines = text.split("\n");
      leftover = lines.pop() ?? "";
      for (const line of lines) emit(line, "live");
      return true;
    } finally {
      closeSync(fd);
    }
  };

  const clearPoll = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  };

  const attachWatchers = () => {
    clearPoll();
    try {
      fileWatcher = watch(logPath, () => readNewBytes());
    } catch {
      /* file may rotate mid-read */
    }
    pollTimer = setInterval(() => readNewBytes(), 2000);
  };

  const watchForCreation = () => {
    const dir = dirname(logPath);
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      /* directory may be root-owned */
    }

    emit(`[curxor] OTA log not yet created — awaiting first ota-updater.sh run`, "waiting");
    emit(`[curxor] Expected path: ${logPath}`, "waiting");

    const onCreated = () => {
      if (!existsSync(logPath)) return;
      dirWatcher?.close();
      dirWatcher = null;
      clearPoll();
      position = 0;
      leftover = "";
      emit(`[curxor] Log file detected — streaming live`, "bootstrap");
      readNewBytes();
      attachWatchers();
    };

    try {
      dirWatcher = watch(dir, () => onCreated());
    } catch {
      /* log dir may not exist yet on dev machines */
    }

    pollTimer = setInterval(onCreated, 3000);
  };

  if (!existsSync(logPath)) {
    watchForCreation();
  } else {
    const stat = statSync(logPath);
    position = Math.max(0, stat.size - BOOTSTRAP_BYTES);
    readNewBytes();
    emit(`[curxor] Tailing ${logPath}`, "bootstrap");
    attachWatchers();
  }

  return () => {
    fileWatcher?.close();
    dirWatcher?.close();
    clearPoll();
  };
}

export function sseEncodeOta(event: OtaLogEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}
