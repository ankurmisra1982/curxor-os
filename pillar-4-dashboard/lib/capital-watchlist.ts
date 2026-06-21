import "server-only";

import { readAppFreState, writeAppFreState } from "./app-fre-state";

export async function addTickerToWatchlist(ticker: string): Promise<string[]> {
  const sym = ticker.trim().toUpperCase();
  if (!sym) throw new Error("Invalid ticker");

  const fre = await readAppFreState("my-capital");
  const raw = fre.config.seedWatchlist;
  const list = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string").map((x) => x.toUpperCase())
    : [];

  if (!list.includes(sym)) list.unshift(sym);
  const next = list.slice(0, 24);

  await writeAppFreState("my-capital", {
    ...fre,
    config: { ...fre.config, seedWatchlist: next },
  });

  return next;
}
