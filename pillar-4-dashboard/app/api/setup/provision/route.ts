export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { defaultFreConfig } from "@/lib/app-agent-catalog";
import { markAppFreComplete } from "@/lib/app-fre-state";
import { markFreProvisioned, validateAppIds } from "@/lib/fre-state";
import { requireLanAuth } from "@/lib/lan-auth";
import { updateSelectedClaws } from "@/lib/user-settings";

interface ProvisionRequest {
  apps?: string[];
}

const PROVISION_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: ProvisionRequest;
  try {
    body = (await request.json()) as ProvisionRequest;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const rawApps = Array.isArray(body.apps) ? body.apps : [];
  const apps = validateAppIds(rawApps.map(String));

  if (apps.length === 0) {
    return Response.json({ ok: false, error: "Select at least one module" }, { status: 400 });
  }

  await sleep(PROVISION_DELAY_MS);

  await markFreProvisioned(apps);
  await updateSelectedClaws(apps);

  for (const appId of apps) {
    try {
      await markAppFreComplete(appId, defaultFreConfig(appId));
    } catch (err) {
      console.warn(`[setup/provision] Could not pre-seed app FRE for ${appId}:`, err);
    }
  }

  return Response.json({ ok: true, apps }, { status: 200 });
}
