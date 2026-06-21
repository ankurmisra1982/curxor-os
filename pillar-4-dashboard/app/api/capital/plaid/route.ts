export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import {
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  getPlaidStatus,
  syncPlaidToPfm,
} from "@/lib/capital-plaid-pfm";
import { clearPlaidLink } from "@/lib/capital-plaid-store";
import { fetchPfmSnapshot, refreshPfmData } from "@/lib/capital-pfm-store";

export async function GET(): Promise<Response> {
  const status = await getPlaidStatus();
  return Response.json({ ok: true, ...status }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    action?: string;
    publicToken?: string;
    institutionName?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "status";

  try {
    switch (action) {
      case "status": {
        const status = await getPlaidStatus();
        return Response.json({ ok: true, ...status });
      }

      case "create_link_token": {
        const out = await createPlaidLinkToken();
        return Response.json({ ok: true, ...out });
      }

      case "exchange_public_token": {
        if (!body.publicToken?.trim()) {
          return Response.json({ ok: false, error: "publicToken required" }, { status: 400 });
        }
        const link = await exchangePlaidPublicToken(body.publicToken, body.institutionName);
        const snapshot = await refreshPfmData();
        return Response.json({ ok: true, link, snapshot });
      }

      case "sync": {
        const synced = await syncPlaidToPfm();
        const snapshot = await fetchPfmSnapshot();
        return Response.json({ ok: true, synced: Boolean(synced), snapshot });
      }

      case "unlink": {
        await clearPlaidLink();
        const snapshot = await refreshPfmData();
        return Response.json({ ok: true, snapshot });
      }

      default:
        return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Plaid action failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
