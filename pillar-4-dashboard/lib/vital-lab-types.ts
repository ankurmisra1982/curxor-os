import type { LongevityProtocolStep } from "./vital-health-types";

export type VitalExpertLensId = "sinclair" | "johnson" | "attia" | "huberman" | "patrick" | "balanced";

export interface VitalLiteratureHit {
  id: string;
  title: string;
  source: string;
  expertIds: string[];
  excerpt: string;
  score: number;
}

export interface VitalLabAskResult {
  query: string;
  answer: string;
  mode: "llm" | "structured" | "fallback";
  expertLens: VitalExpertLensId;
  citations: VitalLiteratureHit[];
  contextUsed: {
    focus: string;
    vitalsCount: number;
    reportCount: number;
    protocolSteps: number;
  };
  disclaimer: string;
}

export interface ProtocolDiffRow {
  id: string;
  title: string;
  category: LongevityProtocolStep["category"];
  frequency: string;
  status: "aligned" | "missing" | "extra";
  detail: string;
}

export interface VitalProtocolDiffReport {
  expertLens: VitalExpertLensId;
  expertLabel: string;
  alignmentScore: number;
  aligned: ProtocolDiffRow[];
  missing: ProtocolDiffRow[];
  extra: ProtocolDiffRow[];
  summary: string;
}

export interface VitalLabStatus {
  literatureChunks: number;
  expertLenses: VitalExpertLensId[];
  features: {
    personalizedQa: boolean;
    literatureRag: boolean;
    protocolDiff: boolean;
    clinicianExport: boolean;
  };
}
