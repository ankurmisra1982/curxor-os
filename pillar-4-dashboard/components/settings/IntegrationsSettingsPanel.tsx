"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { BrokerIntegrationStatus } from "@/lib/capital-queue-types";
import type { ConnectorLinkDefinition } from "@/lib/connector-link-catalog";
import type {
  ConnectorDomainHealth,
  ConnectorDomainSummary,
  MessagingConnectorEntry,
  ShellConnectorsReport,
  WebConnectorEntry,
  WorkLiveProofVaultSummary,
} from "@/lib/shell-connectors-types";
import type { BridgeHealthEntryRow, BridgeHealthSummary } from "@/components/apps/content/ContentBridgeHealthPanel";
import type { WorkConnectorHealthRow } from "@/lib/work-queue-types";

const MESSAGING_PLATFORM_IDS = new Set(["telegram", "whatsapp", "discord"]);

function domainHealthClass(health: ConnectorDomainHealth): string {
  if (health === "ready") return "border-emerald-500/40 bg-emerald-950/20";
  if (health === "attention") return "border-amber-400/40 bg-amber-950/20";
  if (health === "planned") return "border-line bg-void/50";
  return "border-line bg-void/50";
}

function domainHealthLabel(health: ConnectorDomainHealth): string {
  if (health === "ready") return "Live";
  if (health === "attention") return "Needs attention";
  if (health === "planned") return "Planned";
  return "Setup";
}

function itemHealthClass(health: string): string {
  if (health === "ready" || health === "live") return "text-emerald-400";
  if (health === "degraded" || health === "auth_expired") return "text-amber-400";
  return "text-muted";
}

function badgeClass(configured: boolean, health: string): string {
  if (health === "ready" || health === "live") return "text-emerald-400";
  if (configured) return "text-amber-400";
  return "text-muted";
}

function badgeLabel(configured: boolean, health: string): string {
  if (health === "ready" || health === "live") return "Live";
  if (configured) return "Connected";
  return "Setup";
}

interface IntegrationsSettingsPanelProps {
  isExpert?: boolean;
}

export function IntegrationsSettingsPanel({ isExpert = false }: IntegrationsSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [report, setReport] = useState<ShellConnectorsReport | null>(null);
  const [expanded, setExpanded] = useState<ConnectorDomainSummary["id"] | null>(null);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyPassword, setBlueskyPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shell/connectors", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load connector status");
      const data = (await res.json()) as ShellConnectorsReport;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runLink = useCallback(
    async (connectorId: string, action = "start", extra?: Record<string, unknown>) => {
      setLinkBusy(connectorId);
      setMessage(null);
      setError(null);
      try {
        const res = await fetch("/api/shell/connectors/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectorId, action, ...extra }),
        });
        const json = (await res.json()) as {
          authorizeUrl?: string;
          loginLink?: string;
          detail?: string;
          message?: string;
          connected?: boolean;
          demo?: boolean;
          error?: string;
          steps?: string[];
        };
        if (!res.ok) throw new Error(json.error ?? "Link failed");

        const url = json.authorizeUrl ?? json.loginLink;
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
          setMessage(`${connectorId.replace(/_/g, " ")} OAuth opened — complete in the new tab, then refresh.`);
        } else if (json.connected) {
          setMessage(json.detail ?? "Connected.");
          await load();
        } else if (json.demo) {
          setMessage(json.detail ?? json.message ?? "Demo mode — add OAuth client keys to digital.env first.");
        } else if (action === "verify") {
          setMessage(json.detail ?? (json.connected ? "Verified." : "Not connected yet."));
          if (json.connected) await load();
        } else if (json.steps) {
          setMessage(json.steps.join(" "));
        } else {
          setMessage(json.detail ?? json.message ?? "Check digital.env and try again.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Link failed");
      } finally {
        setLinkBusy(null);
      }
    },
    [load],
  );

  const saveBluesky = useCallback(async () => {
    await runLink("bluesky", "save", {
      credentials: {
        BLUESKY_HANDLE: blueskyHandle,
        BLUESKY_APP_PASSWORD: blueskyPassword,
      },
    });
    setBlueskyPassword("");
  }, [blueskyHandle, blueskyPassword, runLink]);

  if (loading && !report) {
    return <p className="p-6 font-sans text-sm text-muted">Loading integrations…</p>;
  }

  if (error && !report) {
    return (
      <div className="space-y-3 p-6">
        <p className="font-sans text-sm text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="border border-line px-3 py-2 font-sans text-xs text-stark hover:border-cursor-glow"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!report) return null;

  const { domains, publish, trade, comms, messaging, web, digitalEnvPath, links, summary } = report;
  const domainLinks = (id: ConnectorDomainSummary["id"]) => links.filter((l) => l.domain === id);

  return (
    <div className="space-y-6 p-6">
      <section>
        <h2 className="font-sans text-lg font-semibold text-stark">Integrations</h2>
        <p className="mt-1 max-w-2xl font-sans text-sm text-muted">
          Five bridge lanes on this appliance — publish, trade, comms, messaging, and web context.
          Credentials stay in{" "}
          <span className="font-mono text-[11px] text-stark">{digitalEnvPath}</span>. Connect here
          first; open a Claw desk only when you need to test a specific bridge.
        </p>
        {summary.attentionTotal > 0 ? (
          <p className="mt-2 font-sans text-xs text-amber-400">
            {summary.domainsNeedingAttention} lane{summary.domainsNeedingAttention === 1 ? "" : "s"}{" "}
            need setup or attention.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="border border-line px-3 py-1.5 font-sans text-xs text-muted hover:border-cursor-glow hover:text-stark disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </section>

      {error ? (
        <p className="border border-red-900/60 bg-red-950/30 px-4 py-3 font-sans text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="border border-line bg-surface px-4 py-3 font-sans text-sm text-cursor-glow">
          {message}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((domain) => (
          <button
            key={domain.id}
            type="button"
            onClick={() => setExpanded((prev) => (prev === domain.id ? null : domain.id))}
            className={`border p-4 text-left transition hover:border-cursor/40 ${domainHealthClass(domain.health)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-sans text-sm font-medium text-stark">{domain.label}</p>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                {domainHealthLabel(domain.health)}
              </span>
            </div>
            <p className="mt-2 font-sans text-xs text-stark">{domain.statusLabel}</p>
            <p className="mt-2 font-sans text-[11px] text-muted">
              {domain.configured}/{domain.total} configured
              {domain.attention > 0 ? ` · ${domain.attention} need attention` : ""}
            </p>
            <p className="mt-3 font-sans text-[10px] text-cursor-glow">
              {expanded === domain.id ? "Hide details" : "Show details"}
              {domain.clawHref.startsWith("/") ? (
                <>
                  {" · "}
                  <Link
                    href={domain.clawHref}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline"
                  >
                    {domain.clawLabel}
                  </Link>
                </>
              ) : null}
            </p>
          </button>
        ))}
      </section>

      {expanded ? (
        <LinkActions
          domain={expanded}
          links={domainLinks(expanded)}
          linkBusy={linkBusy}
          onLink={(id, action) => void runLink(id, action)}
        />
      ) : null}

      {expanded === "publish" ? (
        <DomainDetail title="Publish bridges" hint="Social accounts for Creator Claw outbound posts.">
          <PublishRows summary={publish.summary} platforms={publish.platforms} isExpert={isExpert} />
          <BlueskyConnect
            handle={blueskyHandle}
            password={blueskyPassword}
            onHandleChange={setBlueskyHandle}
            onPasswordChange={setBlueskyPassword}
            onSave={() => void saveBluesky()}
            busy={linkBusy === "bluesky"}
          />
        </DomainDetail>
      ) : null}

      {expanded === "trade" ? (
        <DomainDetail
          title="Trade bridges"
          hint={`Portfolio egress ${trade.bridgeConfigured ? "armed" : "not configured"} on eno2.`}
        >
          {trade.fixHints[0] ? (
            <p className="mb-3 font-sans text-xs text-muted">{trade.fixHints[0]}</p>
          ) : null}
          <BrokerRows brokers={trade.brokers} isExpert={isExpert} />
        </DomainDetail>
      ) : null}

      {expanded === "comms" ? (
        <DomainDetail
          title="Comms connectors"
          hint={
            comms.liveProof?.badge
              ? `Live proof verified — ${comms.liveProof.detail}`
              : comms.commsPathReady
                ? "At least one outbound comms path is available."
                : "Demo sends only until Google, Microsoft, or SMTP is linked."
          }
        >
          <CommsRows connectors={comms.connectors} liveProof={comms.liveProof} isExpert={isExpert} />
        </DomainDetail>
      ) : null}

      {expanded === "messaging" ? (
        <DomainDetail
          title="Messaging bridges"
          hint="Telegram, WhatsApp, and Discord for Engage and approval routing — separate from social publish."
        >
          <MessagingRows connectors={messaging.connectors} isExpert={isExpert} />
        </DomainDetail>
      ) : null}

      {expanded === "web" ? (
        <DomainDetail
          title="Web context (BYOK)"
          hint="Optional cloud bridges — not included at $3,999. Piper voice stays local by default."
        >
          <WebRows connectors={web.connectors} isExpert={isExpert} />
          <FirecrawlTestPanel onMessage={setMessage} onError={setError} onDone={() => void load()} />
          <FirecrawlMcpPanel onMessage={setMessage} onError={setError} onDone={() => void load()} />
        </DomainDetail>
      ) : null}
    </div>
  );
}

function LinkActions({
  domain,
  links,
  linkBusy,
  onLink,
}: {
  domain: ConnectorDomainSummary["id"];
  links: ConnectorLinkDefinition[];
  linkBusy: string | null;
  onLink: (id: string, action: string) => void;
}) {
  if (links.length === 0) return null;

  return (
    <section className="border border-line bg-panel p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Connect from Settings</p>
      <p className="mt-1 font-sans text-xs text-muted">
        {domain === "trade"
          ? "Wire paper trading or broker links without opening Capital Claw."
          : domain === "comms"
            ? "OAuth for mail and CRM — same paths as Outreach Integrations."
            : "Guided setup on this appliance."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) =>
          link.id === "alpaca_paper" ? (
            <span key={link.id} className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={linkBusy === link.id}
                onClick={() => onLink(link.id, "start")}
                className="border border-line px-3 py-1.5 font-sans text-xs text-stark hover:border-cursor-glow disabled:opacity-50"
              >
                Alpaca setup guide
              </button>
              <button
                type="button"
                disabled={linkBusy === link.id}
                onClick={() => onLink(link.id, "verify")}
                className="border border-cursor-glow px-3 py-1.5 font-sans text-xs text-stark hover:text-cursor-glow disabled:opacity-50"
              >
                Verify Alpaca
              </button>
            </span>
          ) : (
            <button
              key={link.id}
              type="button"
              disabled={linkBusy === link.id}
              onClick={() => onLink(link.id, "start")}
              className="border border-line px-3 py-1.5 font-sans text-xs text-stark hover:border-cursor-glow disabled:opacity-50"
              title={link.setupHint}
            >
              {linkBusy === link.id ? "…" : `Link ${link.label}`}
            </button>
          ),
        )}
      </div>
    </section>
  );
}

function DomainDetail({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-void p-4">
      <h3 className="font-sans text-sm font-medium text-stark">{title}</h3>
      <p className="mt-1 font-sans text-xs text-muted">{hint}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BlueskyConnect({
  handle,
  password,
  onHandleChange,
  onPasswordChange,
  onSave,
  busy,
}: {
  handle: string;
  password: string;
  onHandleChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSave: () => void;
  busy: boolean;
}) {
  return (
    <div className="mt-4 border border-line bg-panel p-4">
      <p className="font-sans text-sm font-medium text-stark">Connect Bluesky (publish)</p>
      <p className="mt-1 font-sans text-xs text-muted">
        App password from bsky.app — simplest social publish bridge from Settings.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={handle}
          onChange={(e) => onHandleChange(e.target.value)}
          placeholder="handle.bsky.social"
          className="border border-line bg-void px-3 py-2 font-mono text-xs text-stark"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="App password"
          className="border border-line bg-void px-3 py-2 font-mono text-xs text-stark"
        />
      </div>
      <button
        type="button"
        disabled={busy || !handle.trim() || !password.trim()}
        onClick={onSave}
        className="mt-3 border border-cursor-glow px-3 py-1.5 font-sans text-xs text-stark disabled:opacity-50"
      >
        Save Bluesky credentials
      </button>
    </div>
  );
}

function PublishRows({
  summary,
  platforms,
  isExpert,
}: {
  summary: BridgeHealthSummary;
  platforms: BridgeHealthEntryRow[];
  isExpert: boolean;
}) {
  const live = platforms.filter(
    (p) => p.bridgeTier === "live" && !MESSAGING_PLATFORM_IDS.has(p.platform),
  );
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] text-muted">
        {summary.ready}/{summary.live} accounts ready · {summary.degraded} degraded ·{" "}
        {summary.authExpired} expired
      </p>
      <ul className="space-y-2">
        {live.map((p) => (
          <li key={p.platform} className="border border-line px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-sans text-sm text-stark">{p.name}</span>
              <span className={`font-mono text-[9px] uppercase ${itemHealthClass(p.health)}`}>
                {badgeLabel(p.configured, p.health)}
              </span>
            </div>
            <p className="mt-1 font-sans text-[11px] text-muted">{p.healthLabel}</p>
            {isExpert && p.fixHints[0] ? (
              <p className="mt-1 font-sans text-[11px] text-muted">{p.fixHints[0]}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BrokerRows({ brokers, isExpert }: { brokers: BrokerIntegrationStatus[]; isExpert: boolean }) {
  return (
    <ul className="space-y-2">
      {brokers.map((b) => (
        <li
          key={b.id}
          className={`border px-3 py-2 ${b.configured ? "border-emerald-500/30" : "border-line"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-sans text-sm text-stark">{b.label}</span>
            <span
              className={`font-mono text-[9px] uppercase ${badgeClass(b.configured, b.configured ? "live" : "unconfigured")}`}
            >
              {b.configured ? "Live" : b.tier === "planned" || b.tier === "unavailable" ? "Planned" : "Setup"}
            </span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-muted">{b.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function CommsRows({
  connectors,
  liveProof,
  isExpert,
}: {
  connectors: WorkConnectorHealthRow[];
  liveProof?: WorkLiveProofVaultSummary;
  isExpert: boolean;
}) {
  const commsIds = new Set([
    "smtp",
    "imap",
    "google_workspace",
    "microsoft_365",
    "slack",
    "hubspot",
  ]);
  const rows = connectors.filter((c) => commsIds.has(c.id));
  return (
    <ul className="space-y-2">
      {liveProof ? (
        <li
          className={`border px-3 py-2 ${liveProof.badge ? "border-cursor-glow/50 text-cursor-glow" : "border-line text-muted"}`}
        >
          <span className="font-sans text-sm">{liveProof.badge ? "Live proof" : "Live proof path"}</span>
          <p className="mt-1 font-sans text-[11px]">{liveProof.detail}</p>
        </li>
      ) : null}
      {rows.map((c) => (
        <li key={c.id} className="border border-line px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-sans text-sm text-stark">{c.label}</span>
            <span className={`font-mono text-[9px] uppercase ${badgeClass(c.configured, c.health)}`}>
              {badgeLabel(c.configured, c.health)}
            </span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-muted">{c.healthLabel}</p>
          {isExpert && c.fixHints[0] ? (
            <p className="mt-1 font-sans text-[11px] text-muted">{c.fixHints[0]}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function MessagingRows({
  connectors,
  isExpert,
}: {
  connectors: MessagingConnectorEntry[];
  isExpert: boolean;
}) {
  return (
    <ul className="space-y-2">
      {connectors.map((c) => (
        <li key={c.id} className="border border-line px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-sans text-sm text-stark">{c.label}</span>
            <span className={`font-mono text-[9px] uppercase ${badgeClass(c.configured, c.health)}`}>
              {badgeLabel(c.configured, c.health)}
            </span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-muted">{c.healthLabel}</p>
          {c.fixHints[0] ? (
            <p className="mt-1 font-sans text-[11px] text-muted">{c.fixHints[0]}</p>
          ) : null}
          {isExpert && c.fixHints[1] ? (
            <p className="mt-1 font-sans text-[11px] text-muted">{c.fixHints[1]}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function WebRows({ connectors, isExpert }: { connectors: WebConnectorEntry[]; isExpert: boolean }) {
  return (
    <ul className="space-y-2">
      {connectors.map((c) => (
        <li key={c.id} className="border border-line px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-sans text-sm text-stark">{c.label}</span>
            <span
              className={`font-mono text-[9px] uppercase ${
                c.health === "ready" ? "text-emerald-400" : "text-muted"
              }`}
            >
              {c.healthLabel}
            </span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-muted">{c.fixHints[0]}</p>
          {isExpert && c.fixHints[1] ? (
            <p className="mt-1 font-sans text-[11px] text-muted">{c.fixHints[1]}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function FirecrawlTestPanel({
  onMessage,
  onError,
  onDone,
}: {
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
  onDone: () => void;
}) {
  const [url, setUrl] = useState("https://firecrawl.dev");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const runTest = async () => {
    setBusy(true);
    setPreview(null);
    onError("");
    try {
      const res = await fetch("/api/web/firecrawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scrape_test", url }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        result?: {
          ok?: boolean;
          demo?: boolean;
          title?: string;
          markdown?: string;
          via?: string;
          error?: string;
        };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Scrape test failed");
      const r = json.result;
      if (!r?.ok) throw new Error(r?.error ?? "Scrape failed");
      const label = r.demo ? "Demo scrape" : `Live via ${r.via ?? "eno2"}`;
      onMessage(`${label} — ${r.title || url}`);
      setPreview(r.markdown?.slice(0, 600) ?? null);
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Scrape test failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border border-line bg-panel p-4">
      <p className="font-sans text-sm font-medium text-stark">Test Firecrawl scrape</p>
      <p className="mt-1 font-sans text-xs text-muted">
        Publishes web.scrape on eno2 when the digital bridge is running — otherwise returns demo markdown.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-[240px] flex-1 border border-line bg-void px-3 py-2 font-mono text-xs text-stark"
          placeholder="https://example.com"
        />
        <button
          type="button"
          disabled={busy || !url.trim()}
          onClick={() => void runTest()}
          className="border border-cursor-glow px-3 py-2 font-sans text-xs text-stark disabled:opacity-50"
        >
          {busy ? "Scraping…" : "Test scrape"}
        </button>
      </div>
      {preview ? (
        <pre className="mt-3 max-h-40 overflow-auto border border-line bg-void p-3 font-mono text-[10px] text-muted whitespace-pre-wrap">
          {preview}
        </pre>
      ) : null}
    </div>
  );
}

function FirecrawlMcpPanel({
  onMessage,
  onError,
  onDone,
}: {
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<"probe" | "register" | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const run = async (action: "mcp_probe" | "mcp_register") => {
    setBusy(action === "mcp_probe" ? "probe" : "register");
    setDetail(null);
    onError("");
    try {
      const res = await fetch("/api/web/firecrawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        probe?: { ok?: boolean; configured?: boolean; detail?: string; toolCount?: number };
        detail?: string;
        registered?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? json.probe?.detail ?? "MCP action failed");
      const msg =
        action === "mcp_probe"
          ? json.probe?.detail ?? (json.probe?.ok ? "MCP reachable" : "MCP probe failed")
          : json.detail ?? "Firecrawl MCP registered for Build Plane agents";
      onMessage(msg);
      setDetail(msg);
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "MCP action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 border border-line bg-panel p-4">
      <p className="font-sans text-sm font-medium text-stark">Firecrawl outbound MCP</p>
      <p className="mt-1 font-sans text-xs text-muted">
        Registers mcp.firecrawl.dev in Agent runtime so Build Plane tools can scrape without custom glue.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("mcp_probe")}
          className="border border-line px-3 py-2 font-sans text-xs text-stark disabled:opacity-50"
        >
          {busy === "probe" ? "Probing…" : "Probe MCP"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("mcp_register")}
          className="border border-cursor-glow px-3 py-2 font-sans text-xs text-stark disabled:opacity-50"
        >
          {busy === "register" ? "Registering…" : "Register MCP server"}
        </button>
      </div>
      {detail ? (
        <p className="mt-3 font-sans text-[11px] text-muted">{detail}</p>
      ) : null}
    </div>
  );
}
