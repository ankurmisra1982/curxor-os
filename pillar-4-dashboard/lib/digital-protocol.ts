export interface DigitalReceipt {
  id: string;
  tool: string;
  ok: boolean;
  timestamp: string;
  receipt: Record<string, unknown>;
  error?: string;
}

export function parseDigitalReceipt(raw: Buffer | string): DigitalReceipt | null {
  try {
    const text = typeof raw === "string" ? raw : raw.toString("utf8");
    const data = JSON.parse(text) as Partial<DigitalReceipt>;
    if (!data.tool) return null;
    return {
      id: String(data.id ?? ""),
      tool: String(data.tool),
      ok: Boolean(data.ok),
      timestamp: String(data.timestamp ?? new Date().toISOString()),
      receipt: typeof data.receipt === "object" && data.receipt ? data.receipt : {},
      error: typeof data.error === "string" ? data.error : undefined,
    };
  } catch {
    return null;
  }
}

export function formatTradeReceipt(receipt: DigitalReceipt): string {
  if (!receipt.ok) return receipt.error ?? "Trade failed";
  const r = receipt.receipt;
  const price = r.filled_price ?? r.price ?? "—";
  return `${r.side ?? "?"} ${r.qty ?? "?"} ${r.symbol ?? "?"} @ ${price} (${r.status ?? "ok"})`;
}

export function formatPostReceipt(receipt: DigitalReceipt): string {
  if (!receipt.ok) return receipt.error ?? "Post failed";
  return String(receipt.receipt.post_url ?? receipt.receipt.post_id ?? "Published");
}
