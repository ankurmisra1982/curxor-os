import "server-only";

import { ensureCapitalQueue, updateTrade } from "./capital-store";
import { markTradeFilledFromReceipt } from "./capital-trade-executor";

export async function handleCapitalTradeReceipt(receipt: {
  ok: boolean;
  tool?: string;
  error?: string | null;
  payload?: Record<string, unknown>;
  receipt?: Record<string, unknown>;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (receipt.tool !== "capital.execute_trade" && receipt.tool !== "capital.execute_trade_robinhood") return;

  const payload = receipt.payload ?? {};
  const data = (receipt.receipt ?? receipt.data ?? {}) as Record<string, unknown>;
  const tradeId = typeof payload.trade_id === "string" ? payload.trade_id : "";
  if (!tradeId) return;

  const file = await ensureCapitalQueue();
  const trade = file.trades.find((t) => t.id === tradeId);

  if (!trade) return;

  if (receipt.ok) {
    await markTradeFilledFromReceipt(trade.id, {
      order_id: typeof data.order_id === "string" ? data.order_id : undefined,
      filled_price:
        typeof data.filled_price === "string" || typeof data.filled_price === "number"
          ? data.filled_price
          : undefined,
      status: typeof data.status === "string" ? data.status : undefined,
    });
    return;
  }

  await updateTrade(trade.id, {
    status: "failed",
    error: receipt.error ?? "Trade failed",
  });
}
