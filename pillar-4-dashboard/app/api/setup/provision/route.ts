export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { markFreProvisioned, validateAppIds } from "@/lib/fre-state";

interface ProvisionRequest {
  apps?: string[];
}

const PROVISION_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request): Promise<Response> {
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

  return Response.json({ ok: true }, { status: 200 });
}
