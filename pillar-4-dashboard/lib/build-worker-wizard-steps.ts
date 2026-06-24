import type { BuildPlaneSettings, BuildWorkerWizardStepId } from "./user-settings-types";

export type { BuildWorkerWizardStepId };

export const BUILD_WORKER_WIZARD_STEP_IDS: BuildWorkerWizardStepId[] = [
  "prerequisites",
  "install_cursor",
  "connect_mcp",
  "configure_worker",
  "probe_worker",
  "phone_control",
];

export interface BuildWorkerWizardStep {
  id: BuildWorkerWizardStepId;
  title: string;
  detail: string;
  complete: boolean;
}

function stepMarkedComplete(settings: BuildPlaneSettings, id: BuildWorkerWizardStepId): boolean {
  return (settings.workerCompletedSteps ?? []).includes(id);
}

export function buildWorkerWizardSteps(settings: BuildPlaneSettings): BuildWorkerWizardStep[] {
  const host = settings.workerHost?.trim();
  const port = settings.workerSshPort > 0 ? settings.workerSshPort : 22;
  return [
    {
      id: "prerequisites",
      title: "Enable Build Plane overlay",
      detail: "Turn on builder overlay and mark bridge linked (demo link OK until Cursor OAuth ships).",
      complete: settings.enabled && settings.linkStatus === "linked",
    },
    {
      id: "install_cursor",
      title: "Install Cursor on MS-S1",
      detail: "Cursor desktop or CLI on the appliance eno1 path — your subscription, not bundled with CurXor.",
      complete: stepMarkedComplete(settings, "install_cursor"),
    },
    {
      id: "connect_mcp",
      title: "Connect inbound MCP",
      detail: "Add curxor-build MCP server so Cursor reads CCP, Cafe, and desk status from the appliance.",
      complete: stepMarkedComplete(settings, "connect_mcp"),
    },
    {
      id: "configure_worker",
      title: "Configure remote worker",
      detail: host
        ? `Worker host ${host}:${port} (${settings.workerSshUser || "curxor"}) saved.`
        : "Set worker host (usually appliance LAN IP on eno1) for SSH probe.",
      complete: Boolean(host) && stepMarkedComplete(settings, "configure_worker"),
    },
    {
      id: "probe_worker",
      title: "Probe worker online",
      detail: "TCP reachability to SSH port or CURXOR_BUILD_WORKER_ONLINE=1 in digital.env.",
      complete: settings.workerStatus === "online" || stepMarkedComplete(settings, "probe_worker"),
    },
    {
      id: "phone_control",
      title: "Control from phone",
      detail: "SSH tunnel dashboard to phone, or Cursor mobile against your linked account — build path stays on eno1.",
      complete: stepMarkedComplete(settings, "phone_control"),
    },
  ];
}

export function workerWizardProgress(settings: BuildPlaneSettings): { complete: number; total: number } {
  const steps = buildWorkerWizardSteps(settings);
  return { complete: steps.filter((s) => s.complete).length, total: steps.length };
}
