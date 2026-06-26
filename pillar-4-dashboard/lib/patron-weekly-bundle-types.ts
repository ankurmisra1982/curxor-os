import type { OotbAppId } from "./ootb-apps";

export interface PatronWeeklyClawSlice {
  appId: OotbAppId;
  short: string;
  name: string;
  headline: string;
  bullets: string[];
  href: string;
  score: number;
}

export interface PatronWeeklyCrossAction {
  id: string;
  title: string;
  detail: string;
  href: string | null;
  clawShort: string | null;
}

export interface PatronWeeklyBundle {
  weekOf: string;
  generatedAt: string;
  headline: string;
  planSummary: string;
  claws: PatronWeeklyClawSlice[];
  crossActions: PatronWeeklyCrossAction[];
  confirmed: boolean;
  lastConfirmedAt: string | null;
}
