import "server-only";

import { connect } from "node:net";

import { isDigitalEnvFlag } from "./digital-env";
import { readBuildDelegationQueue } from "./build-delegation-queue";
import {
  buildWorkerWizardSteps,
  BUILD_WORKER_WIZARD_STEP_IDS,
  type BuildWorkerWizardStepId,
} from "./build-worker-wizard-steps";
import { readUserSettings, updateUserSettings } from "./user-settings";
import type { BuildPlaneSettings, BuildPlaneWorkerStatus } from "./user-settings-types";

export type { BuildWorkerWizardStepId };
export { BUILD_WORKER_WIZARD_STEP_IDS };

export interface BuildWorkerWizardCommands {
  installCursor: string;
  mcpAdd: string;
  sshTunnel: string;
  workerStart: string;
}

export interface BuildWorkerWizardReport {
  ok: true;
  enabled: boolean;
  workerStatus: BuildPlaneWorkerStatus;
  workerHost: string | null;
  workerSshPort: number;
  workerSshUser: string;
  workerWizardCompletedAt: string | null;
  workerLastProbeAt: string | null;
  steps: ReturnType<typeof buildWorkerWizardSteps>;
  progress: { complete: number; total: number };
  ready: boolean;
  commands: BuildWorkerWizardCommands;
  delegationQueueCount: number;
  probe: { online: boolean; reason: string } | null;
}

function defaultHost(): string {
  return process.env.CURXOR_BUILD_WORKER_HOST?.trim() || "127.0.0.1";
}

function defaultPort(settings: BuildPlaneSettings): number {
  const port = settings.workerSshPort;
  return Number.isFinite(port) && port > 0 ? port : 22;
}

export function buildWorkerWizardCommands(
  origin: string,
  settings: BuildPlaneSettings,
): BuildWorkerWizardCommands {
  const host = settings.workerHost?.trim() || defaultHost();
  const port = defaultPort(settings);
  const user = settings.workerSshUser?.trim() || "curxor";
  const mcpUrl = `${origin.replace(/\/$/, "")}/api/build/mcp`;

  return {
    installCursor:
      "# On MS-S1 (eno1 dev path): install Cursor desktop or CLI per cursor.com/docs — builder overlay only",
    mcpAdd: `claude mcp add curxor-build --transport http ${mcpUrl}`,
    sshTunnel: `ssh -N -L 3080:127.0.0.1:3080 ${user}@${host} -p ${port}`,
    workerStart:
      "# In Cursor on the appliance: enable Remote / Background Agent on this repo · verify MCP tools/list against curxor-build",
  };
}

async function tcpProbe(host: string, port: number, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: timeoutMs });
    const finish = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

export async function probeRemoteWorker(
  settings: BuildPlaneSettings,
): Promise<{ online: boolean; reason: string }> {
  if (await isDigitalEnvFlag("CURXOR_BUILD_WORKER_ONLINE")) {
    return { online: true, reason: "CURXOR_BUILD_WORKER_ONLINE flag set" };
  }

  const host = settings.workerHost?.trim();
  if (!host) {
    return { online: false, reason: "workerHost not configured — set host in wizard step 4" };
  }

  const port = defaultPort(settings);
  const reachable = await tcpProbe(host, port);
  if (reachable) {
    return { online: true, reason: `TCP ${host}:${port} reachable` };
  }
  return { online: false, reason: `Cannot reach ${host}:${port} — check eno1 SSH and firewall` };
}

export async function buildWorkerWizardReport(origin: string): Promise<BuildWorkerWizardReport> {
  const settings = await readUserSettings();
  const bp = settings.buildPlane;
  const steps = buildWorkerWizardSteps(bp);
  const complete = steps.filter((s) => s.complete).length;
  const probe = bp.enabled ? await probeRemoteWorker(bp) : null;
  const delegation = await readBuildDelegationQueue(8);

  const workerStatus: BuildPlaneWorkerStatus =
    probe?.online === true ? "online" : bp.workerStatus === "online" ? "online" : "offline";

  return {
    ok: true,
    enabled: bp.enabled,
    workerStatus,
    workerHost: bp.workerHost,
    workerSshPort: defaultPort(bp),
    workerSshUser: bp.workerSshUser?.trim() || "curxor",
    workerWizardCompletedAt: bp.workerWizardCompletedAt,
    workerLastProbeAt: bp.workerLastProbeAt,
    steps,
    progress: { complete, total: steps.length },
    ready: complete >= steps.length - 1 && workerStatus === "online",
    commands: buildWorkerWizardCommands(origin, bp),
    delegationQueueCount: delegation.length,
    probe,
  };
}

export async function completeWorkerWizardStep(
  stepId: BuildWorkerWizardStepId,
  origin: string,
): Promise<BuildWorkerWizardReport> {
  const settings = await readUserSettings();
  const bp = settings.buildPlane;
  const steps = new Set(bp.workerCompletedSteps ?? []);
  steps.add(stepId);

  const patch: Partial<BuildPlaneSettings> = {
    workerCompletedSteps: [...steps],
  };

  if (stepId === "probe_worker") {
    const probe = await probeRemoteWorker(bp);
    patch.workerStatus = probe.online ? "online" : "offline";
    patch.workerLastProbeAt = new Date().toISOString();
    if (probe.online) {
      patch.linkStatus = "linked";
      patch.linkedAt = bp.linkedAt ?? new Date().toISOString();
    }
  }

  const merged = { ...bp, ...patch };
  const allSteps = buildWorkerWizardSteps(merged);
  if (allSteps.every((s) => s.complete)) {
    patch.workerWizardCompletedAt = new Date().toISOString();
  }

  await updateUserSettings({ buildPlane: patch });
  return buildWorkerWizardReport(origin);
}

export async function setWorkerHostConfig(
  input: { workerHost: string; workerSshPort?: number; workerSshUser?: string },
  origin: string,
): Promise<BuildWorkerWizardReport> {
  const host = input.workerHost.trim();
  const port = input.workerSshPort ?? 22;
  await updateUserSettings({
    buildPlane: {
      workerHost: host || null,
      workerSshPort: port > 0 ? port : 22,
      workerSshUser: input.workerSshUser?.trim() || "curxor",
    },
  });
  return buildWorkerWizardReport(origin);
}

export async function runWorkerProbeAndPersist(origin: string): Promise<BuildWorkerWizardReport> {
  const settings = await readUserSettings();
  const probe = await probeRemoteWorker(settings.buildPlane);
  await updateUserSettings({
    buildPlane: {
      workerStatus: probe.online ? "online" : "offline",
      workerLastProbeAt: new Date().toISOString(),
      ...(probe.online
        ? {
            linkStatus: "linked" as const,
            linkedAt: settings.buildPlane.linkedAt ?? new Date().toISOString(),
          }
        : {}),
    },
  });
  return buildWorkerWizardReport(origin);
}

export function resolveBuildWorkerOrigin(request: Request): string {
  const envOrigin = process.env.CURXOR_PUBLIC_ORIGIN?.trim();
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  try {
    return new URL(request.url).origin;
  } catch {
    return "http://127.0.0.1:3080";
  }
}
