import type { ActivityFeedRow, ActivityFeedSummary } from "./activity-feed-types";

export function buildActivityFeedSummary(items: ActivityFeedRow[]): ActivityFeedSummary {
  const byClaw: Record<string, number> = {};
  let sinceLastVisit = 0;

  for (const row of items) {
    byClaw[row.claw] = (byClaw[row.claw] ?? 0) + 1;
    if (row.sinceLastVisit) sinceLastVisit++;
  }

  const clawsActive = Object.keys(byClaw).length;
  const totalActions = items.length;
  const sorted = Object.entries(byClaw).sort((a, b) => b[1] - a[1]);

  let headline: string | undefined;
  if (totalActions === 0) {
    headline = undefined;
  } else if (sorted.length === 1) {
    const [claw, count] = sorted[0];
    headline = `${claw} ran ${count} action${count === 1 ? "" : "s"} overnight`;
  } else {
    headline = `${clawsActive} claws · ${totalActions} actions overnight`;
  }

  return { totalActions, sinceLastVisit, clawsActive, byClaw, headline };
}

export interface ClawFeedGroup {
  claw: string;
  items: ActivityFeedRow[];
}

export function groupActivityByClaw(items: ActivityFeedRow[]): ClawFeedGroup[] {
  const map = new Map<string, ActivityFeedRow[]>();

  for (const row of items) {
    const list = map.get(row.claw) ?? [];
    list.push(row);
    map.set(row.claw, list);
  }

  return [...map.entries()]
    .map(([claw, groupItems]) => ({
      claw,
      items: [...groupItems].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    }))
    .sort((a, b) => Date.parse(b.items[0]?.timestamp ?? 0) - Date.parse(a.items[0]?.timestamp ?? 0));
}

const PRACTICE_FILL_RE = /practice fill/i;

export type ActivityDisplayItem =
  | { kind: "row"; row: ActivityFeedRow }
  | { kind: "rollup"; label: string; rows: ActivityFeedRow[] };

/** Collapse repetitive practice-fill rows into a rollup when 3+ match. */
export function buildActivityDisplayItems(items: ActivityFeedRow[]): ActivityDisplayItem[] {
  const practiceFills: ActivityFeedRow[] = [];
  const others: ActivityFeedRow[] = [];

  for (const row of items) {
    if (PRACTICE_FILL_RE.test(row.summary)) {
      practiceFills.push(row);
    } else {
      others.push(row);
    }
  }

  const out: ActivityDisplayItem[] = others.map((row) => ({ kind: "row", row }));

  if (practiceFills.length === 0) {
    return out;
  }

  if (practiceFills.length <= 2) {
    out.push(...practiceFills.map((row) => ({ kind: "row" as const, row })));
    return out.sort((a, b) => {
      const ta = a.kind === "row" ? Date.parse(a.row.timestamp) : 0;
      const tb = b.kind === "row" ? Date.parse(b.row.timestamp) : 0;
      return tb - ta;
    });
  }

  const tickers = [...new Set(practiceFills.map((r) => r.evidence ?? r.summary.split("·")[0]?.trim()).filter(Boolean))];
  const tickerHint = tickers.length <= 3 ? tickers.join(", ") : `${tickers.slice(0, 2).join(", ")} +${tickers.length - 2}`;
  out.push({
    kind: "rollup",
    label: `${practiceFills.length} practice fills${tickerHint ? ` · ${tickerHint}` : ""}`,
    rows: practiceFills,
  });

  return out.sort((a, b) => {
    const ta =
      a.kind === "row"
        ? Date.parse(a.row.timestamp)
        : Date.parse(a.rows[0]?.timestamp ?? 0);
    const tb =
      b.kind === "row"
        ? Date.parse(b.row.timestamp)
        : Date.parse(b.rows[0]?.timestamp ?? 0);
    return tb - ta;
  });
}

export function formatClawChipLine(byClaw: Record<string, number>): string {
  return Object.entries(byClaw)
    .sort((a, b) => b[1] - a[1])
    .map(([claw, count]) => `${claw} ${count}`)
    .join(" · ");
}
