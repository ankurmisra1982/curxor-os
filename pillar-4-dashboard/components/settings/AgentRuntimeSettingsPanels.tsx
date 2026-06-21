"use client";

import { useCallback, useEffect, useState } from "react";

import type { OotbAppId } from "@/lib/ootb-apps";

interface ChannelConfig {
  enabled: boolean;
  defaultAppId: OotbAppId;
  telegram: { enabled: boolean; botUsername: string | null; webhookSecret: string | null };
  slack: { enabled: boolean; signingSecret: string | null };
  whatsapp: { enabled: boolean; verifyToken: string | null; phoneNumberId: string | null };
  imessage: { enabled: boolean; webhookSecret: string | null };
}

interface GarminStatus {
  linked: boolean;
  expiresAt: string | null;
  clientConfigured: boolean;
  redirectUri: string;
}

interface ConsentEntry {
  subscriberAppId: string;
  scope: string;
  allowed: boolean;
}

interface SchedulerJob {
  id: string;
  appId: string;
  kind: string;
  schedule: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
}

interface McpState {
  enabled: boolean;
  servers: Array<{ id: string; url: string; enabled: boolean }>;
}

export function AgentRuntimeSettingsPanels() {
  const [channels, setChannels] = useState<ChannelConfig | null>(null);
  const [consent, setConsent] = useState<ConsentEntry[]>([]);
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [mcp, setMcp] = useState<McpState | null>(null);
  const [egressHosts, setEgressHosts] = useState("");
  const [mcpServerId, setMcpServerId] = useState("local");
  const [mcpServerUrl, setMcpServerUrl] = useState("http://127.0.0.1:3100");
  const [telegramWebhookUrl, setTelegramWebhookUrl] = useState("");
  const [slackEventsUrl, setSlackEventsUrl] = useState("");
  const [whatsappWebhookUrl, setWhatsappWebhookUrl] = useState("");
  const [imessageWebhookUrl, setIMessageWebhookUrl] = useState("");
  const [garmin, setGarmin] = useState<GarminStatus | null>(null);
  const [garminAuthorizeUrl, setGarminAuthorizeUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [chRes, consentRes, schedRes, mcpRes, garminRes] = await Promise.all([
        fetch("/api/channels?sessions=0", { cache: "no-store" }),
        fetch("/api/mesh/consent", { cache: "no-store" }),
        fetch("/api/scheduler", { cache: "no-store" }),
        fetch("/api/mcp", { cache: "no-store" }),
        fetch("/api/vital/garmin", { cache: "no-store" }),
      ]);
      const ch = (await chRes.json()) as { config: ChannelConfig };
      const co = (await consentRes.json()) as { consent: { entries: ConsentEntry[] } };
      const sc = (await schedRes.json()) as { jobs: SchedulerJob[] };
      const mc = (await mcpRes.json()) as { mcp: McpState; egress: { allowHosts: string[] } };
      const gm = (await garminRes.json()) as GarminStatus & { ok?: boolean };
      setChannels(ch.config);
      setConsent(co.consent.entries);
      setJobs(sc.jobs ?? []);
      setMcp(mc.mcp);
      setGarmin(gm);
      setEgressHosts((mc.egress?.allowHosts ?? []).join(", "));
      const tgSecret = ch.config.telegram.webhookSecret;
      if (tgSecret) {
        setTelegramWebhookUrl(`${window.location.origin}/api/channels/telegram/webhook?secret=${tgSecret}`);
      }
      setSlackEventsUrl(`${window.location.origin}/api/channels/slack/events`);
      const waToken = ch.config.whatsapp?.verifyToken;
      if (waToken) {
        setWhatsappWebhookUrl(`${window.location.origin}/api/channels/whatsapp/webhook`);
      }
      setIMessageWebhookUrl(`${window.location.origin}/api/channels/imessage/webhook`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveChannels = async () => {
    if (!channels) return;
    setError(null);
    setMessage(null);
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: channels.enabled,
        defaultAppId: channels.defaultAppId,
        telegram: { enabled: channels.telegram.enabled, botUsername: channels.telegram.botUsername },
        slack: { enabled: channels.slack.enabled, signingSecret: channels.slack.signingSecret },
        whatsapp: {
          enabled: channels.whatsapp.enabled,
          verifyToken: channels.whatsapp.verifyToken,
          phoneNumberId: channels.whatsapp.phoneNumberId,
        },
        imessage: { enabled: channels.imessage.enabled, webhookSecret: channels.imessage.webhookSecret },
      }),
    });
    if (!res.ok) {
      setError("Could not save channels");
      return;
    }
    setMessage("Channel settings saved.");
    void load();
  };

  const ensureTelegramSecret = async () => {
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ensure_telegram_secret" }),
    });
    const data = (await res.json()) as { webhookSecret?: string };
    if (data.webhookSecret) {
      setTelegramWebhookUrl(`${window.location.origin}/api/channels/telegram/webhook?secret=${data.webhookSecret}`);
      setMessage("Telegram webhook secret generated.");
    }
    void load();
  };

  const ensureWhatsAppToken = async () => {
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ensure_whatsapp_verify_token" }),
    });
    const data = (await res.json()) as { verifyToken?: string };
    if (data.verifyToken) {
      setWhatsappWebhookUrl(`${window.location.origin}/api/channels/whatsapp/webhook`);
      setMessage("WhatsApp verify token generated — use it in Meta webhook setup.");
    }
    void load();
  };

  const ensureIMessageSecret = async () => {
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ensure_imessage_secret" }),
    });
    if (res.ok) setMessage("iMessage webhook secret generated.");
    void load();
  };

  const startGarminLink = async () => {
    const res = await fetch("/api/vital/garmin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const data = (await res.json()) as { authorizeUrl?: string; error?: string };
    if (data.authorizeUrl) {
      setGarminAuthorizeUrl(data.authorizeUrl);
      setMessage("Open Garmin authorize URL in this browser, then return here.");
    } else {
      setError(data.error ?? "Could not start Garmin OAuth");
    }
  };

  const unlinkGarmin = async () => {
    await fetch("/api/vital/garmin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlink" }),
    });
    setGarminAuthorizeUrl("");
    setMessage("Garmin unlinked.");
    void load();
  };

  const saveMcp = async () => {
    setError(null);
    setMessage(null);
    const hosts = egressHosts
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const res = await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: mcp?.enabled ?? false,
        server: { id: mcpServerId, url: mcpServerUrl, enabled: true },
        allowHosts: hosts,
      }),
    });
    if (!res.ok) {
      setError("Could not save MCP / egress settings");
      return;
    }
    setMessage("MCP and egress settings saved.");
    void load();
  };

  const toggleConsent = async (entry: ConsentEntry) => {
    await fetch("/api/mesh/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriberAppId: entry.subscriberAppId,
        scope: entry.scope,
        allowed: !entry.allowed,
      }),
    });
    void load();
  };

  const runDue = async () => {
    await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run_due" }),
    });
    setMessage("Ran due scheduler jobs.");
    void load();
  };

  return (
    <div className="space-y-8">
      {message ? <p className="text-sm text-green-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">Channels</h3>
        <p className="text-sm text-muted">
          Message gateways route to Claws with session isolation. Outbound replies egress via eno2 bridges only.
        </p>
        {channels ? (
          <div className="space-y-4 rounded border border-border p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={channels.enabled}
                onChange={(e) => setChannels({ ...channels, enabled: e.target.checked })}
              />
              Enable channel gateway
            </label>

            <div className="space-y-2 border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channels.telegram.enabled}
                  onChange={(e) =>
                    setChannels({
                      ...channels,
                      telegram: { ...channels.telegram, enabled: e.target.checked },
                    })
                  }
                />
                Telegram
              </label>
              <p className="text-xs text-muted">TELEGRAM_BOT_TOKEN in digital.env · /vital /capital /kin</p>
              {telegramWebhookUrl ? (
                <code className="block break-all rounded bg-black/40 p-2 text-xs">{telegramWebhookUrl}</code>
              ) : (
                <button type="button" className="text-xs text-neon-purple underline" onClick={() => void ensureTelegramSecret()}>
                  Generate Telegram webhook URL
                </button>
              )}
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channels.slack.enabled}
                  onChange={(e) =>
                    setChannels({
                      ...channels,
                      slack: { ...channels.slack, enabled: e.target.checked },
                    })
                  }
                />
                Slack Events API
              </label>
              <p className="text-xs text-muted">SLACK_BOT_TOKEN + SLACK_SIGNING_SECRET in digital.env</p>
              <code className="block break-all rounded bg-black/40 p-2 text-xs">{slackEventsUrl}</code>
              <input
                type="text"
                placeholder="Signing secret (optional override)"
                value={channels.slack.signingSecret ?? ""}
                onChange={(e) =>
                  setChannels({
                    ...channels,
                    slack: { ...channels.slack, signingSecret: e.target.value || null },
                  })
                }
                className="w-full rounded border border-border bg-black/20 px-2 py-1 text-xs"
              />
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channels.whatsapp.enabled}
                  onChange={(e) =>
                    setChannels({
                      ...channels,
                      whatsapp: { ...channels.whatsapp, enabled: e.target.checked },
                    })
                  }
                />
                WhatsApp Cloud API
              </label>
              <p className="text-xs text-muted">
                WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID in digital.env
              </p>
              {whatsappWebhookUrl ? (
                <code className="block break-all rounded bg-black/40 p-2 text-xs">{whatsappWebhookUrl}</code>
              ) : (
                <button type="button" className="text-xs text-neon-purple underline" onClick={() => void ensureWhatsAppToken()}>
                  Generate WhatsApp verify token
                </button>
              )}
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channels.imessage.enabled}
                  onChange={(e) =>
                    setChannels({
                      ...channels,
                      imessage: { ...channels.imessage, enabled: e.target.checked },
                    })
                  }
                />
                iMessage (BlueBubbles)
              </label>
              <p className="text-xs text-muted">
                BLUEBUBBLES_SERVER_URL + BLUEBUBBLES_PASSWORD on a Mac bridge · header x-curxor-imessage-secret
              </p>
              <code className="block break-all rounded bg-black/40 p-2 text-xs">{imessageWebhookUrl}</code>
              <button type="button" className="text-xs text-neon-purple underline" onClick={() => void ensureIMessageSecret()}>
                Regenerate iMessage webhook secret
              </button>
            </div>

            <button
              type="button"
              className="rounded border border-border px-3 py-1 text-sm hover:border-neon-purple"
              onClick={() => void saveChannels()}
            >
              Save channels
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">Garmin OAuth (My Vital)</h3>
        <p className="text-sm text-muted">
          PKCE OAuth with token refresh. Tokens stored at /etc/curxor/garmin-oauth.json for eno2 health sync.
        </p>
        <div className="space-y-2 rounded border border-border p-4 text-sm">
          <p>
            Status:{" "}
            <span className={garmin?.linked ? "text-green-400" : "text-muted"}>
              {garmin?.linked ? `linked · expires ${garmin.expiresAt ?? "?"}` : "not linked"}
            </span>
          </p>
          {!garmin?.clientConfigured ? (
            <p className="text-xs text-amber-400">Set GARMIN_CLIENT_ID and GARMIN_CLIENT_SECRET in digital.env</p>
          ) : null}
          {garminAuthorizeUrl ? (
            <a href={garminAuthorizeUrl} className="block break-all text-xs text-neon-purple underline" target="_blank" rel="noreferrer">
              {garminAuthorizeUrl}
            </a>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-border px-3 py-1 text-sm hover:border-neon-purple"
              onClick={() => void startGarminLink()}
            >
              Link Garmin
            </button>
            {garmin?.linked ? (
              <button
                type="button"
                className="rounded border border-border px-3 py-1 text-sm hover:border-red-400"
                onClick={() => void unlinkGarmin()}
              >
                Unlink
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">MCP & egress</h3>
        <p className="text-sm text-muted">Register MCP servers (live JSON-RPC handshake) and optional eno2 host allowlist.</p>
        <div className="space-y-2 rounded border border-border p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mcp?.enabled ?? false}
              onChange={(e) => setMcp((prev) => ({ enabled: e.target.checked, servers: prev?.servers ?? [] }))}
            />
            Enable MCP (live handshake)
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={mcpServerId}
              onChange={(e) => setMcpServerId(e.target.value)}
              placeholder="Server id"
              className="rounded border border-border bg-black/20 px-2 py-1 text-xs"
            />
            <input
              value={mcpServerUrl}
              onChange={(e) => setMcpServerUrl(e.target.value)}
              placeholder="http://127.0.0.1:3100"
              className="rounded border border-border bg-black/20 px-2 py-1 text-xs"
            />
          </div>
          <input
            value={egressHosts}
            onChange={(e) => setEgressHosts(e.target.value)}
            placeholder="Egress allow hosts (comma-separated, empty = bridge catalog)"
            className="w-full rounded border border-border bg-black/20 px-2 py-1 text-xs"
          />
          <button
            type="button"
            className="rounded border border-border px-3 py-1 text-sm hover:border-neon-purple"
            onClick={() => void saveMcp()}
          >
            Save MCP / egress
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">CCP consent matrix</h3>
        <p className="text-sm text-muted">Control which Claws may read each context scope on the mesh.</p>
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-border p-3 text-xs">
          {consent.map((e) => (
            <li key={`${e.subscriberAppId}-${e.scope}`} className="flex items-center justify-between gap-2">
              <span>
                {e.subscriberAppId} → {e.scope}
              </span>
              <button
                type="button"
                className={e.allowed ? "text-green-400" : "text-red-400"}
                onClick={() => void toggleConsent(e)}
              >
                {e.allowed ? "allowed" : "denied"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">Heartbeat scheduler</h3>
        <p className="text-sm text-muted">Jobs from HEARTBEAT.md. Daemon: curxor-scheduler.service</p>
        <button
          type="button"
          className="rounded border border-border px-3 py-1 text-sm hover:border-neon-purple"
          onClick={() => void runDue()}
        >
          Run due jobs now
        </button>
        <ul className="space-y-1 text-xs text-muted">
          {jobs.slice(0, 8).map((j) => (
            <li key={j.id}>
              {j.id} · {j.schedule} · {j.lastStatus ?? "never"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
