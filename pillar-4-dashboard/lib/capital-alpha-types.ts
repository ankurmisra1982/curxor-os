export type AlphaFeedKind =
  | "trade_fill"
  | "trade_pending"
  | "pilot_signal"
  | "pilot_disclosure"
  | "mover_spike"
  | "intel_alert"
  | "thesis"
  | "rule_armed";

export interface AlphaFeedItem {
  id: string;
  kind: AlphaFeedKind;
  symbol: string | null;
  title: string;
  body: string;
  at: string;
  meta?: Record<string, string | number | null>;
}

export type ThesisSource = "manual" | "trade" | "rule" | "pilot" | "intel";

export interface CapitalThesisEntry {
  id: string;
  symbol: string;
  body: string;
  source: ThesisSource;
  linkedTradeId: string | null;
  linkedRuleId: string | null;
  linkedPilotId: string | null;
  createdAt: string;
}

export type PilotLeaderboardWindow = "w1" | "m1" | "m3" | "y1";

export interface PilotLeaderboardRow {
  pilotId: string;
  name: string;
  author: string;
  category: string;
  returnPct: number;
  featured: boolean;
  subscribed: boolean;
}

export interface ChartTradeMarker {
  t: string;
  price: number;
  kind: "buy" | "sell" | "pilot" | "rule";
  label?: string;
}
