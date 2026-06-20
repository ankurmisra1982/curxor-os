/**
 * JSON digital intents — engine publishes to telemetry/digital_out (motor XSUB :9200).
 */

export interface DigitalIntent {
  id: string;
  tool: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface DigitalReceipt {
  id: string;
  tool: string;
  ok: boolean;
  timestamp: string;
  receipt: Record<string, unknown>;
  error?: string;
}

export function packDigitalIntent(tool: string, payload: Record<string, unknown>): DigitalIntent {
  return {
    id: crypto.randomUUID(),
    tool,
    timestamp: new Date().toISOString(),
    payload,
  };
}

export function parseDigitalReceipt(raw: Buffer | string): DigitalReceipt {
  const text = typeof raw === "string" ? raw : raw.toString("utf8");
  const data = JSON.parse(text) as DigitalReceipt;
  return {
    id: String(data.id ?? ""),
    tool: String(data.tool ?? ""),
    ok: Boolean(data.ok),
    timestamp: String(data.timestamp ?? ""),
    receipt: typeof data.receipt === "object" && data.receipt ? data.receipt : {},
    error: typeof data.error === "string" ? data.error : undefined,
  };
}
