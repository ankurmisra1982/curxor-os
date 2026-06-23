export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import {
  approvePendingCapitalTrade,
  rejectPendingCapitalTrade,
} from "@/lib/capital-approval-telegram";
import { fetchCapitalStatus } from "@/lib/capital-store";

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { tradeId?: string; decision?: string; action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tradeId = body.tradeId?.trim();
  const decision = body.decision ?? body.action;
  if (!tradeId || !decision) {
    return Response.json({ ok: false, error: "tradeId and decision required" }, { status: 400 });
  }

  if (decision === "approve" || decision === "approved") {
    const result = await approvePendingCapitalTrade(tradeId, "api");
    return Response.json({ ok: result.ok, trade: result.trade, error: result.error, status: await fetchCapitalStatus() });
  }

  if (decision === "reject" || decision === "rejected") {
    const trade = await rejectPendingCapitalTrade(tradeId, "Rejected via API", "api");
    if (!trade) return Response.json({ ok: false, error: "Trade not pending" }, { status: 404 });
    return Response.json({ ok: true, trade, status: await fetchCapitalStatus() });
  }

  return Response.json({ ok: false, error: "Unknown decision" }, { status: 400 });
}
