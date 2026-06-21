import "server-only";

import { createHash } from "node:crypto";

import { loadDigitalEnv } from "./digital-env";
import { scoreSentiment } from "./capital-intel-sentiment";
import type { IntelChatterItem } from "./capital-intel-types";

const UA = "CurXorCapital/1.0 (contact@curxor.local)";

function idFor(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 14);
}

export async function fetchSecEdgarFilings(symbol?: string): Promise<IntelChatterItem[]> {
  const env = await loadDigitalEnv();
  const contact = env.SEC_EDGAR_CONTACT_EMAIL?.trim() || "capital@curxor.local";
  const q = symbol ? `${symbol.replace("-", "").toUpperCase()}` : "8-K";
  const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(q)}&forms=8-K&dateRange=custom&startdt=${daysAgoIso(7)}&enddt=${todayIso()}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `CurXorCapital ${contact}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      hits?: { hits?: Array<{ _source?: Record<string, unknown> }> };
    };
    const hits = data.hits?.hits ?? [];

    return hits.slice(0, 10).map((hit) => {
      const src = hit._source ?? {};
      const names = src.display_names as unknown;
      const entity =
        Array.isArray(names) && typeof names[0] === "string"
          ? names[0]
          : String(src.entity_name ?? "SEC filer");
      const form = String(src.form ?? "8-K");
      const filed = typeof src.file_date === "string" ? src.file_date : null;
      const title = `${entity} filed ${form}`;
      const accession = String(src.adsh ?? src.accession_no ?? "");
      const ciksRaw = src.ciks as unknown;
      const cik = String(
        Array.isArray(ciksRaw) && ciksRaw[0] != null ? ciksRaw[0] : src.entity_id ?? "",
      );
      const link = cik && accession
        ? `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, "")}/${accession.replace(/-/g, "")}/${accession}-index.htm`
        : "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K";
      const excerpt = `Material event disclosure · ${filed ?? "recent"}`;
      const { sentiment, score } = scoreSentiment(title);
      return {
        id: idFor(["sec", accession || title]),
        source: "sec_edgar" as const,
        sourceLabel: "SEC · 8-K",
        title,
        excerpt,
        url: link,
        sentiment,
        score,
        publishedAt: filed ? `${filed}T12:00:00.000Z` : null,
      } satisfies IntelChatterItem;
    });
  } catch {
    return [];
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function fetchSecForm4Filings(symbol?: string): Promise<IntelChatterItem[]> {
  const env = await loadDigitalEnv();
  const contact = env.SEC_EDGAR_CONTACT_EMAIL?.trim() || "capital@curxor.local";
  const q = symbol ? `${symbol.replace("-", "").toUpperCase()}` : "Form 4";
  const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(q)}&forms=4&dateRange=custom&startdt=${daysAgoIso(14)}&enddt=${todayIso()}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `CurXorCapital ${contact}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      hits?: { hits?: Array<{ _source?: Record<string, unknown> }> };
    };
    const hits = data.hits?.hits ?? [];

    return hits.slice(0, 8).map((hit) => {
      const src = hit._source ?? {};
      const names = src.display_names as unknown;
      const entity =
        Array.isArray(names) && typeof names[0] === "string"
          ? names[0]
          : String(src.entity_name ?? "Insider filer");
      const filed = typeof src.file_date === "string" ? src.file_date : null;
      const title = `${entity} · Form 4 insider trade`;
      const accession = String(src.adsh ?? src.accession_no ?? "");
      const ciksRaw = src.ciks as unknown;
      const cik = String(
        Array.isArray(ciksRaw) && ciksRaw[0] != null ? ciksRaw[0] : src.entity_id ?? "",
      );
      const link =
        cik && accession
          ? `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, "")}/${accession.replace(/-/g, "")}/${accession}-index.htm`
          : "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4";
      const { sentiment, score } = scoreSentiment(title);
      return {
        id: idFor(["form4", accession || title]),
        source: "sec_edgar" as const,
        sourceLabel: "SEC · Form 4",
        title,
        excerpt: `Insider transaction disclosure · ${filed ?? "recent"}`,
        url: link,
        sentiment,
        score,
        publishedAt: filed ? `${filed}T12:00:00.000Z` : null,
      } satisfies IntelChatterItem;
    });
  } catch {
    return [];
  }
}
