import "server-only";

import dns from "node:dns/promises";

import { isWorkEmailBridgeConfigured } from "./work-store";

export type DnsFieldStatus = "ok" | "missing" | "advisory";

export interface DnsDeliverabilityReport {
  domain: string;
  spf: { status: DnsFieldStatus; record: string | null };
  dkim: { status: DnsFieldStatus; selector: string | null; hint: string | null };
  dmarc: { status: DnsFieldStatus; policy: string | null };
  checkedAt: string;
  demoSeeded: boolean;
  recommendations: string[];
}

function flattenTxt(records: string[][]): string[] {
  return records.map((parts) => parts.join(""));
}

function findSpf(txt: string[]): string | null {
  return txt.find((r) => r.toLowerCase().startsWith("v=spf1")) ?? null;
}

function findDmarc(txt: string[]): string | null {
  return txt.find((r) => r.toLowerCase().startsWith("v=dmarc1")) ?? null;
}

function demoReport(domain: string): DnsDeliverabilityReport {
  return {
    domain,
    spf: { status: "ok", record: `v=spf1 include:_spf.${domain} ~all` },
    dkim: { status: "advisory", selector: "curxor", hint: `curxor._domainkey.${domain}` },
    dmarc: { status: "ok", policy: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}` },
    checkedAt: new Date().toISOString(),
    demoSeeded: true,
    recommendations: [`Demo DNS seeded for ${domain} — verify SPF/DKIM/DMARC when SMTP is live`],
  };
}

function buildRecommendations(report: Omit<DnsDeliverabilityReport, "recommendations">): string[] {
  const out: string[] = [];
  if (report.spf.status === "missing") out.push(`Add SPF TXT record for ${report.domain}`);
  if (report.dkim.status !== "ok") out.push(`Configure DKIM at your SMTP provider for ${report.domain}`);
  if (report.dmarc.status === "missing") out.push(`Publish DMARC at _dmarc.${report.domain}`);
  return out;
}

export async function checkDnsDeliverability(domain: string): Promise<DnsDeliverabilityReport> {
  const normalized = domain.trim().toLowerCase();
  const bridge = await isWorkEmailBridgeConfigured();
  if (!bridge || process.env.CURXOR_DNS_CHECK === "demo") {
    return demoReport(normalized);
  }

  try {
    const rootTxt = flattenTxt(await dns.resolveTxt(normalized));
    const spfRecord = findSpf(rootTxt);
    let dmarcRecord: string | null = null;
    try {
      const dmarcTxt = flattenTxt(await dns.resolveTxt(`_dmarc.${normalized}`));
      dmarcRecord = findDmarc(dmarcTxt);
    } catch {
      dmarcRecord = null;
    }

    const base: Omit<DnsDeliverabilityReport, "recommendations"> = {
      domain: normalized,
      spf: { status: spfRecord ? "ok" : "missing", record: spfRecord },
      dkim: {
        status: "advisory",
        selector: null,
        hint: `Add DKIM at your SMTP provider for ${normalized}`,
      },
      dmarc: { status: dmarcRecord ? "ok" : "missing", policy: dmarcRecord },
      checkedAt: new Date().toISOString(),
      demoSeeded: false,
    };
    return { ...base, recommendations: buildRecommendations(base) };
  } catch {
    return demoReport(normalized);
  }
}

/** @deprecated use checkDnsDeliverability */
export const checkDomainDnsDeliverability = checkDnsDeliverability;
