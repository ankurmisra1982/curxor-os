export type ForgedCapitalRuleState = "PAUSED" | "ARMED";

export type ForgedCapitalAction = "buy" | "sell";

export interface ForgedCapitalWatchEntry {
  ticker: string;
  note: string;
  lastPrice: number | null;
  updatedAt: string;
}

export interface ForgedCapitalRule {
  id: string;
  name: string;
  asset: string;
  conditionType: string;
  action: ForgedCapitalAction;
  qty: number;
  state: ForgedCapitalRuleState;
  createdAt: string;
  updatedAt: string;
}

export interface ForgedCapitalQueueFile {
  version: 1;
  updatedAt: string;
  watchlist: ForgedCapitalWatchEntry[];
  rules: ForgedCapitalRule[];
}
