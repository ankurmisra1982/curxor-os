"use client";

import { bridgeTierBadgeClass } from "@/lib/social-channels";

export type BridgeHealthStatus =
  | "ready"
  | "degraded"
  | "auth_expired"
  | "unconfigured"
  | "planned";

export interface BridgeHealthEntryRow {
  platform: string;
  name: string;
  bridgeTier: string;
  bridgeTool: string | null;
  configured: boolean;
  enabledInFre: boolean;
  health: BridgeHealthStatus;
  healthLabel: string;
  missingEnvKeys: string[];
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastErrorKind: string | null;
  consecutiveFailures: number;
  successCount: number;
  failureCount: number;
  tokenExpiresAt: string | null;
  fixHints: string[];
}

export interface BridgeHealthSummary {
  total: number;
  live: number;
  configured: number;
  ready: number;
  degraded: number;
  authExpired: number;
  unconfigured: number;
  planned: number;
}

interface ContentBridgeHealthPanelProps {
  report: {
    digitalEnvPath: string;
    summary: BridgeHealthSummary;
    platforms: BridgeHealthEntryRow[];
  } | null;
  onRefresh: () => void;
  busy?: boolean;
}

function healthClass(health: BridgeHealthStatus): string {
  if (health === "ready") return "text-cursor-glow border-cursor-glow/50";
  if (health === "degraded") return "text-amber-400 border-amber-400/50";
  if (health === "auth_expired") return "text-red-400 border-red-400/50";
  if (health === "unconfigured") return "text-muted border-line";
  return "text-muted border-line/60";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ContentBridgeHealthPanel({ report, onRefresh, busy }: ContentBridgeHealthPanelProps) {
  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading bridge health…</p>;
  }

  const { summary, platforms, digitalEnvPath } = report;

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          {summary.ready}/{summary.live} live bridges ready · {summary.degraded} degraded · {summary.authExpired}{" "}
          auth · creds at {digitalEnvPath}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => (
          <div
            key={p.platform}
            className={`border bg-panel p-3 ${p.enabledInFre ? "border-cursor-glow/30" : "border-line"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-stark">{p.name}</p>
                <p className="text-[9px] text-muted">{p.bridgeTool ?? "no bridge tool"}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`border px-1.5 py-0.5 text-[9px] uppercase ${bridgeTierBadgeClass(p.bridgeTier as import("@/lib/social-channels").BridgeTier)}`}>
                  {p.bridgeTier === "live" ? "LIVE" : p.bridgeTier}
                </span>
                <span className={`border px-1.5 py-0.5 text-[9px] uppercase ${healthClass(p.health)}`}>
                  {p.health.replace("_", " ")}
                </span>
              </div>
            </div>

            <p className="mt-2 text-muted">{p.healthLabel}</p>

            <div className="mt-2 space-y-0.5 text-[9px] text-muted">
              <p>Last OK: {formatWhen(p.lastSuccessAt)}</p>
              <p>Last fail: {formatWhen(p.lastFailureAt)}</p>
              {p.lastError ? <p className="text-red-400/90 line-clamp-2">{p.lastErrorKind}: {p.lastError}</p> : null}
              {p.tokenExpiresAt ? (
                <p className={Date.parse(p.tokenExpiresAt) <= Date.now() ? "text-red-400" : "text-muted"}>
                  Token exp: {formatWhen(p.tokenExpiresAt)}
                </p>
              ) : null}
              <p>
                Receipts: {p.successCount} ok · {p.failureCount} fail
                {p.consecutiveFailures > 0 ? ` · ${p.consecutiveFailures} streak` : ""}
              </p>
            </div>

            {p.missingEnvKeys.length > 0 ? (
              <p className="mt-2 text-[9px] text-amber-400">Missing: {p.missingEnvKeys.join(", ")}</p>
            ) : null}

            <ul className="mt-2 space-y-0.5 text-[9px] text-muted">
              {p.fixHints.slice(0, 3).map((hint) => (
                <li key={hint}>→ {hint}</li>
              ))}
            </ul>

            {p.enabledInFre ? (
              <p className="mt-2 text-[9px] uppercase tracking-widest text-cursor-glow">FRE enabled</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
