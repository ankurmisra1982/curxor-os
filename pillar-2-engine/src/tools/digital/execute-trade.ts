import type { AgentActionContext } from "../../actions/physical/types.js";
import { packDigitalIntent } from "../../telemetry/digital-protocol.js";

export const executeTradeTool = {
  name: "capital.execute_trade",
  description:
    "Publish a paper trade intent to the digital bridge (Alpaca). Does NOT call the internet from the engine.",
  parameters: {
    type: "object",
    required: ["ticker", "qty", "action"],
    properties: {
      ticker: { type: "string", description: "Stock or crypto symbol e.g. AAPL, BTCUSD" },
      qty: { type: "number", description: "Quantity to trade" },
      action: { type: "string", enum: ["buy", "sell"], description: "Trade side" },
    },
    additionalProperties: false,
  },
  async execute(
    args: Record<string, unknown>,
    ctx: AgentActionContext,
  ): Promise<{ queued: true; intentId: string; tool: string }> {
    const ticker = String(args.ticker ?? "").trim();
    const action = String(args.action ?? "").toLowerCase();
    const qty = Number(args.qty);

    if (!ticker) throw new Error("ticker is required");
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("qty must be a positive number");
    if (action !== "buy" && action !== "sell") throw new Error("action must be buy or sell");

    const intent = packDigitalIntent("capital.execute_trade", { ticker, qty, action });
    await ctx.mesh.publishDigital(intent);
    return { queued: true, intentId: intent.id, tool: intent.tool };
  },
};
