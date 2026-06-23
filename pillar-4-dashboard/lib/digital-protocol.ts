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

const PUBLISH_URL_KEYS = [
  "post_url",
  "pin_url",
  "url",
  "share_url",
  "permalink",
  "video_url",
] as const;

export function extractPublishedUrl(receipt: DigitalReceipt): string | null {
  if (!receipt.ok) return null;
  const r = receipt.receipt;
  for (const key of PUBLISH_URL_KEYS) {
    const val = r[key];
    if (typeof val === "string" && val.startsWith("http")) return val;
  }
  const postId = r.post_id ?? r.pin_id ?? r.video_id;
  if (typeof postId === "string" && postId.length > 0) {
    if (receipt.tool.includes("pinterest")) return `https://www.pinterest.com/pin/${postId}/`;
    if (receipt.tool.includes("youtube")) return `https://www.youtube.com/watch?v=${postId}`;
    if (receipt.tool.includes("x") || receipt.tool.includes("twitter")) {
      return `https://x.com/i/web/status/${postId}`;
    }
  }
  return null;
}

export function formatPostReceipt(receipt: DigitalReceipt): string {
  if (!receipt.ok) return receipt.error ?? "Post failed";
  return extractPublishedUrl(receipt) ?? String(receipt.receipt.post_id ?? receipt.receipt.pin_id ?? "Published");
}

export function formatCommerceReceipt(receipt: DigitalReceipt): string {
  if (!receipt.ok) return receipt.error ?? "Commerce bridge failed";
  if (receipt.tool.startsWith("commerce.shopify")) {
    const count = receipt.receipt.productCount ?? receipt.receipt.orderLineCount ?? "—";
    const domain = receipt.receipt.shopDomain ?? "shop";
    return `Shopify ${domain} · ${count} rows`;
  }
  return JSON.stringify(receipt.receipt).slice(0, 120);
}
