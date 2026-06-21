import "server-only";

import { createHash } from "node:crypto";

import { loadAlpacaCreds } from "./capital-alpaca-client";
import type { CorporateActionItem } from "./capital-intel-types";

function idFor(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 14);
}

function dataBaseUrl(): string {
  return (process.env.ALPACA_DATA_BASE_URL ?? "https://data.alpaca.markets").replace(/\/$/, "");
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function fetchAlpacaCorporateActions(symbol: string): Promise<CorporateActionItem[]> {
  const creds = await loadAlpacaCreds();
  if (!creds) return [];

  const sym = symbol.replace("-", "").toUpperCase();
  const params = new URLSearchParams({
    ca_types: "dividend,split,spinoff,merger",
    since: daysAgoIso(180),
    symbols: sym,
  });

  try {
    const res = await fetch(`${dataBaseUrl()}/v1/corporate-actions/announcements?${params}`, {
      headers: {
        "APCA-API-KEY-ID": creds.key,
        "APCA-API-SECRET-KEY": creds.secret,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      corporate_actions?: Array<Record<string, unknown>>;
    };

    return (data.corporate_actions ?? []).slice(0, 6).map((ca) => {
      const caType = String(ca.ca_type ?? ca.type ?? "other");
      const exDate =
        typeof ca.ex_date === "string"
          ? ca.ex_date
          : typeof ca.record_date === "string"
            ? ca.record_date
            : null;
      const cash = ca.cash as { amount?: number; currency?: string } | undefined;
      const split = ca.split as { old_rate?: number; new_rate?: number } | undefined;

      let label = caType;
      let amount: string | null = null;
      if (caType.includes("dividend") && cash?.amount != null) {
        label = "Dividend";
        amount = `$${cash.amount.toFixed(4)}${cash.currency ? ` ${cash.currency}` : ""}`;
      } else if (caType.includes("split") && split?.old_rate && split?.new_rate) {
        label = "Split";
        amount = `${split.old_rate}:${split.new_rate}`;
      } else {
        label = caType.replace(/_/g, " ");
      }

      return {
        id: idFor(["corp", sym, caType, exDate ?? "", String(ca.id ?? "")]),
        type: caType.includes("dividend") ? "dividend" : caType.includes("split") ? "split" : "other",
        label,
        exDate,
        amount,
      } satisfies CorporateActionItem;
    });
  } catch {
    return [];
  }
}
