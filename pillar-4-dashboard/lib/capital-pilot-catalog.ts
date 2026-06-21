import type { CapitalPilot } from "./capital-queue-types";

const now = new Date().toISOString();

export const PILOT_CATALOG: CapitalPilot[] = [
  {
    id: "PILOT-INVERSE-SENTIMENT",
    name: "Inverse Sentiment (demo)",
    author: "Capital Claw",
    category: "tracker",
    description:
      "Contrarian basket inspired by inverse-media trackers — demo holdings, not affiliated with third-party apps.",
    featured: true,
    referenceAumUsd: 106_000_000,
    minAllocationUsd: 500,
    holdings: [
      { symbol: "SQQQ", weightPct: 25 },
      { symbol: "SPY", weightPct: 25 },
      { symbol: "GLD", weightPct: 25 },
      { symbol: "CASH", weightPct: 25 },
    ],
    performance: { w1: 4.2, m1: 12.8, m3: 28.4, m6: 52.1, y1: 141.8 },
    updatedAt: now,
  },
  {
    id: "PILOT-NDAQ10",
    name: "NASDAQ-10 Growth",
    author: "Raincheck-style demo",
    category: "index",
    description: "Top growth names — proportional copy into your linked brokerage.",
    featured: true,
    referenceAumUsd: 85_000_000,
    minAllocationUsd: 500,
    holdings: [
      { symbol: "NVDA", weightPct: 18 },
      { symbol: "MSFT", weightPct: 16 },
      { symbol: "AAPL", weightPct: 14 },
      { symbol: "AMZN", weightPct: 12 },
      { symbol: "META", weightPct: 10 },
      { symbol: "GOOGL", weightPct: 10 },
      { symbol: "AVGO", weightPct: 8 },
      { symbol: "TSLA", weightPct: 6 },
      { symbol: "COST", weightPct: 4 },
      { symbol: "NFLX", weightPct: 2 },
    ],
    performance: { w1: 2.1, m1: 8.4, m3: 19.2, m6: 34.5, y1: 58.3 },
    updatedAt: now,
  },
  {
    id: "PILOT-CONGRESS-TRACKER",
    name: "Congressional Disclosure Tracker (demo)",
    author: "Quiver-style demo",
    category: "tracker",
    description: "Mirrors a demo disclosure basket — sovereign on-appliance, not live congressional data.",
    featured: true,
    referenceAumUsd: 525_600_000,
    minAllocationUsd: 500,
    holdings: [
      { symbol: "NVDA", weightPct: 22 },
      { symbol: "MSFT", weightPct: 18 },
      { symbol: "AAPL", weightPct: 15 },
      { symbol: "AVGO", weightPct: 12 },
      { symbol: "CRM", weightPct: 10 },
      { symbol: "UBER", weightPct: 8 },
      { symbol: "V", weightPct: 8 },
      { symbol: "MA", weightPct: 7 },
    ],
    performance: { w1: 1.8, m1: 6.2, m3: 14.1, m6: 31.2, y1: 63.9 },
    updatedAt: now,
  },
  {
    id: "PILOT-AI-THEMATIC",
    name: "AI World War III (demo)",
    author: "Thematic Labs demo",
    category: "ai",
    description: "AI infrastructure + semiconductor tilt — thematic pilot for agent-led copy trading.",
    featured: false,
    referenceAumUsd: 42_000_000,
    minAllocationUsd: 500,
    holdings: [
      { symbol: "NVDA", weightPct: 30 },
      { symbol: "AMD", weightPct: 15 },
      { symbol: "SMCI", weightPct: 12 },
      { symbol: "MSFT", weightPct: 15 },
      { symbol: "PLTR", weightPct: 13 },
      { symbol: "ARM", weightPct: 15 },
    ],
    performance: { w1: 5.6, m1: 18.2, m3: 42.5, m6: 88.1, y1: 149.9 },
    updatedAt: now,
  },
  {
    id: "PILOT-HF-QUANT",
    name: "Quant Fund Tracker (demo)",
    author: "Capital Claw",
    category: "tracker",
    description: "Demo 13F-style allocation — rebalance on heartbeat when weights drift.",
    featured: false,
    referenceAumUsd: 77_300_000,
    minAllocationUsd: 500,
    holdings: [
      { symbol: "SPY", weightPct: 20 },
      { symbol: "QQQ", weightPct: 20 },
      { symbol: "IWM", weightPct: 10 },
      { symbol: "TLT", weightPct: 15 },
      { symbol: "GLD", weightPct: 10 },
      { symbol: "NVDA", weightPct: 15 },
      { symbol: "MSFT", weightPct: 10 },
    ],
    performance: { w1: 0.9, m1: 4.1, m3: 11.8, m6: 24.6, y1: 91.4 },
    updatedAt: now,
  },
  {
    id: "PILOT-ACTIVELY-MANAGED",
    name: "Actively Managed Momentum",
    author: "InTheMoney-style demo",
    category: "managed",
    description: "Signal-driven pilot — agent emits trades; subscribers mirror proportionally.",
    featured: true,
    referenceAumUsd: 140_900_000,
    minAllocationUsd: 500,
    holdings: [
      { symbol: "SPY", weightPct: 35 },
      { symbol: "QQQ", weightPct: 25 },
      { symbol: "NVDA", weightPct: 20 },
      { symbol: "META", weightPct: 10 },
      { symbol: "CASH", weightPct: 10 },
    ],
    performance: { w1: 3.2, m1: 9.8, m3: 22.4, m6: 41.2, y1: 72.5 },
    updatedAt: now,
  },
];

export function getPilotById(pilotId: string): CapitalPilot | null {
  return PILOT_CATALOG.find((p) => p.id === pilotId) ?? null;
}

export function mergePilotCatalog(stored: CapitalPilot[] | undefined): CapitalPilot[] {
  const map = new Map(PILOT_CATALOG.map((p) => [p.id, p]));
  for (const row of stored ?? []) {
    if (map.has(row.id)) {
      map.set(row.id, { ...map.get(row.id)!, ...row, holdings: row.holdings?.length ? row.holdings : map.get(row.id)!.holdings });
    }
  }
  return [...map.values()];
}
