import "server-only";

export interface PublicBaseProbeResult {
  ok: boolean;
  detail: string;
}

/** HEAD/GET probe — 404 on missing asset still means the dashboard is reachable. */
export async function probePublicContentBase(baseUrl: string): Promise<PublicBaseProbeResult> {
  const normalized = baseUrl.replace(/\/$/, "");
  const probeUrl = `${normalized}/api/content/asset?file=__curxor_probe__`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    let res: Response;
    try {
      res = await fetch(probeUrl, { method: "HEAD", signal: controller.signal, cache: "no-store" });
    } catch {
      res = await fetch(probeUrl, { method: "GET", signal: controller.signal, cache: "no-store" });
    } finally {
      clearTimeout(timer);
    }

    if (res.ok || res.status === 404 || res.status === 400) {
      return { ok: true, detail: `${normalized} reachable (HTTP ${res.status})` };
    }
    return { ok: false, detail: `Public base returned HTTP ${res.status} — check reverse proxy / TLS` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: `Unreachable from appliance: ${msg}` };
  }
}
