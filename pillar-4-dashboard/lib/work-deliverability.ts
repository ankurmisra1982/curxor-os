import "server-only";

import { loadDigitalEnv } from "./digital-env";
import { checkDnsDeliverability, type DnsDeliverabilityReport } from "./work-dns-deliverability";
import { buildWarmupChartSeries, type WarmupChartDay } from "./work-warmup-chart";
import type { OutboundSend, WorkSequence } from "./work-queue-types";

const BOUNCE_RE = /\b(bounce|550|551|552|553|mailbox unavailable|user unknown|does not exist|rejected)\b/i;

export interface WorkDeliverabilitySummary {
  fromAddress: string | null;
  domain: string | null;
  domainHealth: "healthy" | "warning" | "unknown";
  domainHealthDetail: string;
  spfStatus: "ok" | "advisory" | "unknown" | "missing";
  dkimStatus: "ok" | "advisory" | "unknown" | "missing";
  dmarcStatus: "ok" | "advisory" | "unknown" | "missing";
  dns: DnsDeliverabilityReport | null;
  warmupMode: boolean;
  warmupDailyCap: number | null;
  failedSendCount: number;
  bounceLikeCount: number;
  recentFailures: Array<{ sendId: string; to: string; subject: string; error: string }>;
  reputationScore: number;
  reputationLabel: "excellent" | "good" | "fair" | "at_risk";
  unsubscribeTokensActive: number;
  sequencesWithUnsubscribe: number;
  warmupChart: WarmupChartDay[];
  sendsToday: number;
}

function parseDomain(from: string | undefined): string | null {
  if (!from?.includes("@")) return null;
  const match = from.match(/@([\w.-]+\.\w+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

function isBounceLike(error: string | null | undefined): boolean {
  return Boolean(error && BOUNCE_RE.test(error));
}

export async function buildWorkDeliverabilitySummary(
  sends: OutboundSend[],
  sequences: WorkSequence[],
  unsubscribeTokenCount: number,
): Promise<WorkDeliverabilitySummary> {
  const env = await loadDigitalEnv();
  const fromAddress = env.SMTP_FROM?.trim() || null;
  const domain = parseDomain(fromAddress ?? undefined);
  const bridgeConfigured = Boolean(env.SMTP_HOST?.trim() && fromAddress);

  const failed = sends.filter((s) => s.status === "failed");
  const bounceLike = failed.filter((s) => isBounceLike(s.error));
  const sent = sends.filter((s) => s.status === "sent" || s.status === "simulated");
  const opened = sent.filter((s) => s.openedAt).length;
  const replied = sent.filter((s) => s.repliedAt).length;

  let reputationScore = 72;
  if (sent.length > 0) {
    const openRate = opened / sent.length;
    const replyRate = replied / sent.length;
    const failRate = failed.length / Math.max(sent.length + failed.length, 1);
    reputationScore = Math.round(
      Math.min(98, Math.max(20, 50 + openRate * 25 + replyRate * 35 - failRate * 40 - bounceLike.length * 8)),
    );
  }
  if (!bridgeConfigured) reputationScore = Math.min(reputationScore, 65);

  const reputationLabel: WorkDeliverabilitySummary["reputationLabel"] =
    reputationScore >= 85 ? "excellent" : reputationScore >= 70 ? "good" : reputationScore >= 50 ? "fair" : "at_risk";

  let domainHealth: WorkDeliverabilitySummary["domainHealth"] = "unknown";
  let domainHealthDetail = "Configure SMTP_FROM to assess sending domain";
  let spfStatus: WorkDeliverabilitySummary["spfStatus"] = "unknown";
  let dkimStatus: WorkDeliverabilitySummary["dkimStatus"] = "unknown";
  let dmarcStatus: WorkDeliverabilitySummary["dmarcStatus"] = "unknown";
  let dns: DnsDeliverabilityReport | null = null;

  if (domain) {
    dns = await checkDnsDeliverability(domain);
    spfStatus = dns.spf.status === "ok" ? "ok" : dns.spf.status === "missing" ? "missing" : "advisory";
    dkimStatus = dns.dkim.status === "ok" ? "ok" : dns.dkim.status === "missing" ? "missing" : "advisory";
    dmarcStatus = dns.dmarc.status === "ok" ? "ok" : dns.dmarc.status === "missing" ? "missing" : "advisory";
    if (dns.demoSeeded && !bridgeConfigured) {
      domainHealthDetail = `${domain} · demo DNS seeded — verify TXT when SMTP live`;
    } else if (dns.recommendations.length > 0 && bounceLike.length === 0) {
      domainHealthDetail = dns.recommendations[0] ?? domainHealthDetail;
    }
  }

  const fre = await (async () => {
    const { readAppFreState } = await import("./app-fre-state");
    return readAppFreState("my-work");
  })();
  const warmupMode = fre.config.warmupMode === true || fre.config.warmupMode === "true";
  const warmupCapRaw = fre.config.warmupDailyCap;
  const warmupDailyCap =
    typeof warmupCapRaw === "number"
      ? warmupCapRaw
      : typeof warmupCapRaw === "string"
        ? Number.parseInt(warmupCapRaw, 10)
        : null;

  if (domain && dns) {
    const isPublicMailbox = /@(gmail|yahoo|hotmail|outlook|icloud)\./i.test(fromAddress ?? "");
    const dnsOk = dns.spf.status === "ok" && dns.dkim.status === "ok" && dns.dmarc.status === "ok";
    if (isPublicMailbox) {
      domainHealth = "warning";
      domainHealthDetail = `${domain} — public mailbox; use a owned domain for cold outbound`;
    } else if (bounceLike.length > 2) {
      domainHealth = "warning";
      domainHealthDetail = `${domain} · ${bounceLike.length} bounce-like failure(s) — review list hygiene`;
    } else if (dnsOk && bridgeConfigured) {
      domainHealth = "healthy";
      domainHealthDetail = `${domain} · SPF/DKIM/DMARC verified`;
    } else if (dns.demoSeeded) {
      domainHealth = "warning";
      domainHealthDetail = `${domain} · demo DNS seeded — verify TXT when SMTP live`;
    } else {
      domainHealth = dns.recommendations.length > 0 ? "warning" : "healthy";
      domainHealthDetail = dns.recommendations[0] ?? `${domain} · DNS check complete`;
    }
  }

  const sequencesWithUnsubscribe = sequences.filter((seq) =>
    seq.steps.some((step) => step.body.includes("{{unsubscribe_url}}")),
  ).length;

  const cap = warmupDailyCap && Number.isFinite(warmupDailyCap) ? warmupDailyCap : warmupMode ? 15 : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sendsToday = sends.filter((s) => {
    if (s.status !== "sent" && s.status !== "simulated") return false;
    const t = Date.parse(s.sentAt ?? s.createdAt);
    return t >= todayStart.getTime();
  }).length;

  return {
    fromAddress,
    domain,
    domainHealth,
    domainHealthDetail,
    spfStatus,
    dkimStatus,
    dmarcStatus,
    dns,
    warmupMode,
    warmupDailyCap: warmupDailyCap && Number.isFinite(warmupDailyCap) ? warmupDailyCap : warmupMode ? 15 : null,
    failedSendCount: failed.length,
    bounceLikeCount: bounceLike.length,
    recentFailures: failed.slice(0, 8).map((s) => ({
      sendId: s.id,
      to: s.to,
      subject: s.subject,
      error: s.error ?? "send failed",
    })),
    reputationScore,
    reputationLabel,
    unsubscribeTokensActive: unsubscribeTokenCount,
    sequencesWithUnsubscribe,
    warmupChart: buildWarmupChartSeries(sends, cap, warmupMode),
    sendsToday,
  };
}
