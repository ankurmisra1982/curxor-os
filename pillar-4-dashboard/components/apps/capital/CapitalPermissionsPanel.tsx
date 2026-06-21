"use client";

import type { BrokerIntegrationStatus, CapitalPermissions, CapitalRiskLimits } from "@/lib/capital-queue-types";
import { CapitalTradingViewPanel } from "@/components/apps/capital/CapitalTradingViewPanel";

interface CapitalPermissionsPanelProps {
  permissions: CapitalPermissions;
  riskLimits: CapitalRiskLimits;
  tradingPaused: boolean;
  dailyPnlPct: number;
  tradingMode: string;
  liveEnvEnabled: boolean;
  goLiveReady: boolean;
  onSetAutonomous: (mode: CapitalPermissions["autonomousMode"]) => void;
  onToggleCrisis: (paused: boolean) => void;
  onConfirmLiveMoney?: () => void;
  onSetTradingMode?: (mode: string) => void;
  envTvSecretConfigured?: boolean;
}

export function CapitalPermissionsPanel({
  permissions,
  riskLimits,
  tradingPaused,
  dailyPnlPct,
  tradingMode,
  liveEnvEnabled,
  goLiveReady,
  onSetAutonomous,
  onToggleCrisis,
  onConfirmLiveMoney,
  onSetTradingMode,
  envTvSecretConfigured,
}: CapitalPermissionsPanelProps) {
  const crisisActive = tradingPaused || dailyPnlPct <= -Math.abs(riskLimits.maxDailyLossPct);
  const liveConfirmed = Boolean(permissions.liveMoneyConfirmedAt);

  return (
    <div className="space-y-3 font-mono text-xs">
      {crisisActive ? (
        <div className="border border-red-500/60 bg-red-950/30 px-3 py-2 text-[10px] uppercase tracking-widest text-red-300">
          Crisis mode {tradingPaused ? "· trading paused" : ""}
          {dailyPnlPct <= -Math.abs(riskLimits.maxDailyLossPct)
            ? ` · daily P&L ${dailyPnlPct.toFixed(2)}% (limit −${riskLimits.maxDailyLossPct}%)`
            : ""}
        </div>
      ) : null}
      <div className="grid gap-2 md:grid-cols-3">
        <label className="border border-line p-2">
          <span className="text-[10px] uppercase text-muted">Autonomous mode</span>
          <select
            className="mt-1 w-full bg-transparent text-stark"
            value={permissions.autonomousMode}
            onChange={(e) => onSetAutonomous(e.target.value as CapitalPermissions["autonomousMode"])}
          >
            <option value="off">Off — manual / agent only</option>
            <option value="approval_each">Each trade needs approval</option>
            <option value="auto_armed_rules">Auto — armed rules (risk guard)</option>
          </select>
        </label>
        <div className="border border-line p-2 text-[10px] text-muted">
          Max position {riskLimits.maxPositionPct}% · daily loss cap {riskLimits.maxDailyLossPct}%
          <br />
          Auto trades today cap {permissions.maxAutoTradesPerDay}
        </div>
        <button
          type="button"
          onClick={() => onToggleCrisis(!tradingPaused)}
          className={`border px-2 py-2 text-[10px] uppercase ${tradingPaused ? "border-red-400 text-red-300" : "border-line text-muted"}`}
        >
          {tradingPaused ? "Resume trading" : "Pause all trading"}
        </button>
      </div>

      {liveEnvEnabled ? (
        <div className="border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[10px]">
          <p className="uppercase tracking-widest text-amber-300">Live money (env enabled)</p>
          <p className="mt-1 text-muted">
            Mode: {tradingMode}
            {liveConfirmed ? ` · confirmed ${permissions.liveMoneyConfirmedAt?.slice(0, 10)}` : " · not confirmed"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!liveConfirmed && goLiveReady ? (
              <button
                type="button"
                onClick={() => onConfirmLiveMoney?.()}
                className="border border-amber-400 px-2 py-0.5 uppercase text-amber-200"
              >
                I confirm live money
              </button>
            ) : null}
            {liveConfirmed && tradingMode !== "live" ? (
              <button
                type="button"
                onClick={() => onSetTradingMode?.("live")}
                className="border border-amber-400 px-2 py-0.5 uppercase text-amber-200"
              >
                Switch to live mode
              </button>
            ) : null}
            {tradingMode === "live" ? (
              <button
                type="button"
                onClick={() => onSetTradingMode?.("paper")}
                className="border border-line px-2 py-0.5 uppercase text-muted"
              >
                Revert to paper
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted">Live trading locked — set CURXOR_CAPITAL_LIVE_ENABLED=1 in digital.env</p>
      )}
    </div>
  );
}

interface CapitalBrokersPanelProps {
  brokers: BrokerIntegrationStatus[];
  activeBrokerId?: string;
  tvWebhookSecret?: string | null;
  envTvSecretConfigured?: boolean;
  onSetActive?: (brokerId: string) => void;
  onLink?: (brokerId: string) => void;
  onUnlink?: (brokerId: string) => void;
  onTvRefresh?: () => void;
}

export function CapitalBrokersPanel({
  brokers,
  activeBrokerId,
  tvWebhookSecret,
  envTvSecretConfigured,
  onSetActive,
  onLink,
  onUnlink,
  onTvRefresh,
}: CapitalBrokersPanelProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {brokers.map((b) => (
        <div key={b.id} className="border border-line px-3 py-2 font-mono text-[10px]">
          <div className="flex justify-between">
            <span className="text-stark">{b.label}</span>
            <span className={b.configured ? "text-cursor-glow" : "text-muted"}>{b.tier}</span>
          </div>
          <p className="mt-1 text-muted">{b.detail}</p>
          {activeBrokerId === b.id ? (
            <p className="mt-1 text-[9px] uppercase text-cursor-glow">Active execution broker</p>
          ) : b.configured && onSetActive ? (
            <button
              type="button"
              onClick={() => onSetActive(b.id)}
              className="mt-1 border border-line px-2 py-0.5 text-[9px] uppercase text-muted hover:text-stark"
            >
              Set active
            </button>
          ) : null}
          {b.id === "webull" || b.id === "etrade" ? (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onLink?.(b.id)}
                className="border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow"
              >
                Link account
              </button>
              {b.configured ? (
                <button
                  type="button"
                  onClick={() => onUnlink?.(b.id)}
                  className="border border-line px-2 py-0.5 text-[9px] uppercase text-muted"
                >
                  Unlink
                </button>
              ) : null}
            </div>
          ) : null}
          {b.id === "robinhood_mcp" ? (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onLink?.(b.id)}
                className="border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow"
              >
                Link MCP
              </button>
              {b.configured ? (
                <button
                  type="button"
                  onClick={() => onUnlink?.(b.id)}
                  className="border border-line px-2 py-0.5 text-[9px] uppercase text-muted"
                >
                  Unlink
                </button>
              ) : null}
            </div>
          ) : null}
          {b.id === "snaptrade" ? (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onLink?.(b.id)}
                className="border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow"
              >
                Link broker
              </button>
              {b.configured ? (
                <button
                  type="button"
                  onClick={() => onUnlink?.(b.id)}
                  className="border border-line px-2 py-0.5 text-[9px] uppercase text-muted"
                >
                  Unlink
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
      <CapitalTradingViewPanel
        webhookSecret={tvWebhookSecret ?? null}
        envSecretConfigured={envTvSecretConfigured ?? false}
        onSecretChange={() => onTvRefresh?.()}
      />
    </div>
  );
}
