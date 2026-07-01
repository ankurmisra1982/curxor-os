"use client";

import { useCallback, useEffect, useState } from "react";

import type { BuildPlaneLinkStatus, SanitizedBuildPlaneSettings } from "@/lib/user-settings-types";

import { BuildPlaneWorkerWizard } from "./BuildPlaneWorkerWizard";
import { BuildPlaneDelegationQueue } from "./BuildPlaneDelegationQueue";

interface BuildPlanePanelProps {
  enabled: boolean;
  linkStatus: BuildPlaneLinkStatus;
  allowDelegation: boolean;
  allowWriteTools: boolean;
  onSaved?: () => void;
}

async function postSettings(buildPlane: Record<string, unknown>) {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buildPlane }),
    cache: "no-store",
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
}

function linkStatusLabel(status: BuildPlaneLinkStatus): string {
  if (status === "linked") return "Linked";
  if (status === "error") return "Error";
  return "Disconnected";
}

function linkStatusClass(status: BuildPlaneLinkStatus): string {
  if (status === "linked") return "text-cursor-glow";
  if (status === "error") return "text-amber-400";
  return "text-muted";
}

export function BuildPlanePanel({
  enabled: initialEnabled,
  linkStatus: initialLinkStatus,
  allowDelegation: initialAllowDelegation,
  allowWriteTools: initialAllowWriteTools,
  onSaved,
}: BuildPlanePanelProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [linkStatus, setLinkStatus] = useState(initialLinkStatus);
  const [allowDelegation, setAllowDelegation] = useState(initialAllowDelegation);
  const [allowWriteTools, setAllowWriteTools] = useState(initialAllowWriteTools);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecretDraft, setWebhookSecretDraft] = useState("");
  const [hasWebhookUrl, setHasWebhookUrl] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<SanitizedBuildPlaneSettings["workerStatus"]>("unknown");
  const [linkedAt, setLinkedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(initialEnabled);
    setLinkStatus(initialLinkStatus);
    setAllowDelegation(initialAllowDelegation);
    setAllowWriteTools(initialAllowWriteTools);
  }, [initialEnabled, initialLinkStatus, initialAllowDelegation, initialAllowWriteTools]);

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/build/status", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      buildPlane?: SanitizedBuildPlaneSettings;
      eventBus?: { endpoint?: string; recentCount?: number };
    };
    if (!data.buildPlane) return;
    setLinkStatus(data.buildPlane.linkStatus);
    setWorkerStatus(data.buildPlane.workerStatus);
    setLinkedAt(data.buildPlane.linkedAt);
    setEnabled(data.buildPlane.enabled);
    setAllowDelegation(data.buildPlane.allowDelegation);
    setAllowWriteTools(data.buildPlane.allowWriteTools);
    setHasWebhookUrl(data.buildPlane.hasWebhookUrl);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      setMessage(null);
      try {
        await postSettings(patch);
        setMessage("Builder overlay saved.");
        await refreshStatus();
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [onSaved, refreshStatus],
  );

  return (
    <section className="space-y-4 border border-line bg-panel/40 p-4">
      <div>
        <h2 className="font-sans text-lg font-semibold text-stark">Builder overlay</h2>
        <p className="mt-1 font-sans text-xs text-muted">
          Optional power-user layer for a future Cursor Bridge — extend, debug, and automate the OS from your
          Cursor subscription. Claws run fully on the appliance without this; nothing here is required for GTM
          operation.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-line/60 bg-void/30 px-3 py-2 font-mono text-[10px]">
        <div>
          <span className="uppercase tracking-widest text-muted">Bridge link</span>
          <p className={`mt-1 uppercase tracking-widest ${linkStatusClass(linkStatus)}`}>
            {linkStatusLabel(linkStatus)}
            {linkedAt ? ` · ${new Date(linkedAt).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="text-muted">
          Worker <span className="text-stark">{workerStatus}</span>
          {hasWebhookUrl ? " · webhook configured" : ""}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 font-sans text-sm text-stark">
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={(e) => {
            const next = e.target.checked;
            setEnabled(next);
            void save({ enabled: next });
          }}
          className="accent-curxor"
        />
        Enable Build Plane overlay
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || linkStatus === "linked"}
          onClick={() =>
            void save({
              enabled: true,
              linkStatus: "linked",
              linkedAt: new Date().toISOString(),
            })
          }
          className="border border-cursor-glow px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
        >
          Mark as linked (demo)
        </button>
        <button
          type="button"
          disabled={saving || linkStatus === "disconnected"}
          onClick={() =>
            void save({
              linkStatus: "disconnected",
              linkedAt: null,
            })
          }
          className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-stark disabled:opacity-40"
        >
          Disconnect
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void refreshStatus()}
          className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-stark"
        >
          Refresh status
        </button>
      </div>

      <p className="font-mono text-[10px] text-muted">
        Configure inbound MCP and OS event webhooks below. Use the remote worker wizard to wire MS-S1 as a Cursor
        devbox — separate from Intelligence → frontier providers.
      </p>

      <div className="border border-line/60 bg-void/30 px-3 py-2 font-mono text-[10px] text-muted">
        <p className="uppercase tracking-widest text-cursor-glow">Inbound MCP (BP1)</p>
        <p className="mt-1 text-stark">GET /api/build/mcp · POST JSON-RPC tools/list · tools/call</p>
        <p className="mt-1">
          Cursor: add server →{" "}
          <code className="text-stark">{typeof window !== "undefined" ? `${window.location.origin}/api/build/mcp` : "http://127.0.0.1:3080/api/build/mcp"}</code>
        </p>
        <p className="mt-1">Enable overlay above before tools respond. Read-only: CCP summary, Cafe snapshot, Forge fleet, desk status.</p>
      </div>

      <div className="space-y-2 border border-line/60 bg-void/30 px-3 py-2 font-mono text-[10px]">
        <p className="uppercase tracking-widest text-cursor-glow">OS event bus (BP2 / v0.8.2)</p>
        <p className="text-muted">
          Outbound webhooks when Forge mints, Go Live fails, OTA is available, or eno2 drops. Events also append to{" "}
          <code className="text-stark">/api/build/events</code> and ingest into Claw Cafe when relevant.
        </p>
        <label className="mt-2 block font-sans text-xs text-muted">
          Webhook URL (Cursor Automation / n8n)
          <input
            type="url"
            placeholder="https://…"
            disabled={saving || !enabled}
            className="mt-1 w-full border border-line bg-void px-2 py-1.5 font-mono text-[11px] text-stark"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            onBlur={() => {
              if (webhookUrl.trim()) void save({ webhookUrl: webhookUrl.trim() });
            }}
          />
        </label>
        <label className="block font-sans text-xs text-muted">
          Webhook signing secret (optional · HMAC sha256)
          <input
            type="password"
            placeholder="Leave blank to keep existing"
            disabled={saving || !enabled}
            className="mt-1 w-full border border-line bg-void px-2 py-1.5 font-mono text-[11px] text-stark"
            value={webhookSecretDraft}
            onChange={(e) => setWebhookSecretDraft(e.target.value)}
            onBlur={() => {
              if (webhookSecretDraft.trim()) void save({ webhookSecret: webhookSecretDraft.trim() });
            }}
          />
        </label>
        <p className="text-muted">
          Or set <code className="text-stark">CURXOR_BUILD_PLANE_WEBHOOK_URL</code> in digital.env. Poll OTA/eno2 via POST{" "}
          <code className="text-stark">/api/build/events</code> action <code className="text-stark">poll</code>.
        </p>
      </div>

      <BuildPlaneWorkerWizard enabled={enabled} onRefresh={() => void refreshStatus()} />

      <BuildPlaneDelegationQueue enabled={enabled} allowDelegation={allowDelegation} />

      <div className="space-y-2 border-t border-line/60 pt-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Policy (future gates)</p>
        <label className="flex cursor-pointer items-center gap-2 font-sans text-xs text-muted">
          <input
            type="checkbox"
            checked={allowDelegation}
            disabled={saving || !enabled}
            onChange={(e) => {
              const next = e.target.checked;
              setAllowDelegation(next);
              void save({ allowDelegation: next });
            }}
            className="accent-curxor"
          />
          Allow Master AI delegation (G5+ suggest · G6 full queue)
        </label>
        <label className="flex cursor-pointer items-center gap-2 font-sans text-xs text-muted">
          <input
            type="checkbox"
            checked={allowWriteTools}
            disabled={saving || !enabled}
            onChange={(e) => {
              const next = e.target.checked;
              setAllowWriteTools(next);
              void save({ allowWriteTools: next });
            }}
            className="accent-curxor"
          />
          Allow inbound MCP write tools (default off)
        </label>
      </div>

      {error ? <p className="font-sans text-sm text-red-300">{error}</p> : null}
      {message ? <p className="font-sans text-sm text-cursor-glow">{message}</p> : null}
    </section>
  );
}
