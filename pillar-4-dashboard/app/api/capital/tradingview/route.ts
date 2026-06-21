export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createHash, timingSafeEqual } from "node:crypto";

import { executeCapitalTrade } from "@/lib/capital-trade-executor";
import { ensureCapitalQueue } from "@/lib/capital-store";
import { buildIdempotencyKey } from "@/lib/capital-rule-engine";

function verifySecret(header: string | null, expected: string): boolean {
  if (!header || !expected) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const file = await ensureCapitalQueue();
  const envSecret = process.env.CURXOR_CAPITAL_TV_SECRET?.trim() ?? "";
  const storeSecret = file.permissions.tradingviewWebhookSecret?.trim() ?? "";
  const secret = storeSecret || envSecret;
  if (!secret) {
    return Response.json({ ok: false, error: "TradingView webhook not configured" }, { status: 503 });
  }

  const auth =
    request.headers.get("x-curxor-tv-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (!verifySecret(auth, secret)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    ticker?: string;
    symbol?: string;
    action?: string;
    qty?: number;
    ruleId?: string;
    alert_id?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, ack: false, error: "invalid_json" }, { status: 400 });
  }

  const ticker = (body.ticker ?? body.symbol ?? "").trim().toUpperCase();
  const action = body.action?.toLowerCase() === "sell" ? "sell" : "buy";
  const qty = typeof body.qty === "number" && body.qty > 0 ? body.qty : 1;
  if (!ticker) {
    return Response.json({ ok: true, ack: true, skipped: "missing_ticker" });
  }

  const bucket = new Date().toISOString().slice(0, 13);
  const idem = buildIdempotencyKey(body.ruleId ?? "tv", ticker, body.alert_id ?? bucket);

  void executeCapitalTrade({
    ruleId: body.ruleId,
    ticker,
    qty,
    action,
    source: "tradingview",
    idempotencyKey: createHash("sha256").update(idem).digest("hex").slice(0, 24),
  }).catch(() => undefined);

  return Response.json({ ok: true, ack: true, ticker, action });
}
