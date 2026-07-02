import "server-only";

import { randomUUID } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { promisify } from "node:util";

import { appendOsEventRecord } from "./os-event-log-store";

const execFileAsync = promisify(execFile);

export type PowerAction = "restart_stack" | "reboot" | "shutdown";

export interface PowerUnitStatus {
  name: string;
  active: "active" | "inactive" | "failed" | "unknown";
}

export interface PowerStatus {
  ok: true;
  mode: "appliance" | "dry-run";
  sudoReady: boolean;
  applianceHost: boolean;
  units: PowerUnitStatus[];
  message: string | null;
}

export interface PowerActionResult {
  ok: boolean;
  mode: "apply" | "dry-run";
  action: PowerAction;
  jobId: string;
  message: string;
  error?: string;
}

const POWER_UNITS = ["curxor-os.target", "curxor-dashboard.service"];

function getCurxorRoot(): string {
  return process.env.CURXOR_OTA_ROOT?.trim() || "/opt/curxor";
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isApplianceHost(): Promise<boolean> {
  if (process.env.CURXOR_APPLIANCE === "1") return true;
  if (process.env.NODE_ENV === "production") return true;
  if (await pathExists("/etc/curxor/ota.env")) return true;
  if (await pathExists(getCurxorRoot())) return true;
  return false;
}

async function checkSudoReady(): Promise<boolean> {
  if (process.platform !== "linux") return false;
  try {
    await execFileAsync("sudo", ["-n", "systemctl", "is-active", "curxor-os.target"], {
      timeout: 5000,
    });
    return true;
  } catch {
    try {
      await execFileAsync("sudo", ["-n", "true"], { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

async function getUnitActive(unit: string): Promise<PowerUnitStatus["active"]> {
  if (process.platform !== "linux") return "unknown";
  try {
    const { stdout } = await execFileAsync("sudo", ["-n", "systemctl", "is-active", unit], {
      timeout: 5000,
    });
    const state = stdout.trim();
    if (state === "active") return "active";
    if (state === "inactive" || state === "failed") return state;
    return "unknown";
  } catch {
    try {
      const { stdout } = await execFileAsync("systemctl", ["is-active", unit], { timeout: 5000 });
      const state = stdout.trim();
      if (state === "active") return "active";
      if (state === "inactive" || state === "failed") return state;
      return "unknown";
    } catch {
      return "unknown";
    }
  }
}

export async function buildPowerStatus(): Promise<PowerStatus> {
  const applianceHost = await isApplianceHost();
  const sudoReady = await checkSudoReady();
  const units = await Promise.all(
    POWER_UNITS.map(async (name) => ({ name, active: await getUnitActive(name) })),
  );

  const mode: PowerStatus["mode"] = applianceHost && sudoReady ? "appliance" : "dry-run";
  let message: string | null = null;
  if (mode === "dry-run") {
    if (process.platform !== "linux") {
      message =
        "Power actions are simulated on this host — use Settings → System on the appliance to restart or shut down.";
    } else if (!sudoReady) {
      message =
        "Passwordless sudo not configured — run sudo /opt/curxor/scripts/install-sudo-override.sh on the box.";
    } else {
      message = "Dry-run mode — power commands are logged but not executed on this dev host.";
    }
  }

  return { ok: true, mode, sudoReady, applianceHost, units, message };
}

function spawnDetached(args: string[]): void {
  const child = spawn("sudo", args, { detached: true, stdio: "ignore" });
  child.unref();
}

function confirmValid(action: PowerAction, confirm: unknown): boolean {
  if (action === "restart_stack") return confirm === true || confirm === "RESTART";
  if (action === "reboot") return confirm === "REBOOT";
  if (action === "shutdown") return confirm === "SHUTDOWN";
  return false;
}

function expectedConfirmHint(action: PowerAction): string {
  if (action === "restart_stack") return "Set confirm: true to restart the CurXor stack";
  if (action === "reboot") return 'Type confirm: "REBOOT" to reboot the appliance';
  return 'Type confirm: "SHUTDOWN" to shut down the appliance';
}

async function auditPowerAction(
  action: PowerAction,
  mode: "apply" | "dry-run",
  jobId: string,
  actor: string,
): Promise<void> {
  await appendOsEventRecord({
    id: `power-${randomUUID()}`,
    event: "system.power_action",
    timestamp: new Date().toISOString(),
    payload: { action, mode, jobId, actor },
  });
}

export async function runPowerAction(
  action: PowerAction,
  confirm: unknown,
  actor: string,
): Promise<PowerActionResult> {
  const jobId = randomUUID();
  const status = await buildPowerStatus();

  if (!confirmValid(action, confirm)) {
    return {
      ok: false,
      mode: status.mode === "appliance" && status.sudoReady ? "apply" : "dry-run",
      action,
      jobId,
      message: expectedConfirmHint(action),
      error: "confirm_required",
    };
  }

  const dryRun = status.mode !== "appliance" || !status.sudoReady;

  if (dryRun) {
    await auditPowerAction(action, "dry-run", jobId, actor);
    const labels: Record<PowerAction, string> = {
      restart_stack: "Restart CurXor stack",
      reboot: "Reboot appliance",
      shutdown: "Shut down appliance",
    };
    return {
      ok: true,
      mode: "dry-run",
      action,
      jobId,
      message: `[Dry-run] ${labels[action]} would run now on the appliance. ${status.message ?? ""}`.trim(),
    };
  }

  await auditPowerAction(action, "apply", jobId, actor);

  if (action === "restart_stack") {
    spawnDetached(["systemctl", "restart", "curxor-os.target"]);
    return {
      ok: true,
      mode: "apply",
      action,
      jobId,
      message: "Restarting CurXor stack — dashboard reconnects in ~30 seconds.",
    };
  }
  if (action === "reboot") {
    spawnDetached(["reboot"]);
    return {
      ok: true,
      mode: "apply",
      action,
      jobId,
      message: "Rebooting appliance — reconnect after the box comes back.",
    };
  }
  spawnDetached(["shutdown", "-h", "now"]);
  return {
    ok: true,
    mode: "apply",
    action,
    jobId,
    message: "Shutting down appliance — use the power button to turn back on.",
  };
}

export function isPowerAction(value: unknown): value is PowerAction {
  return value === "restart_stack" || value === "reboot" || value === "shutdown";
}
