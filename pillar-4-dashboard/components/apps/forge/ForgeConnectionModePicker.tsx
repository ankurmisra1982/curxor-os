"use client";

import {
  FORGE_CONNECTION_MODES,
  type ForgeProvisioningMode,
  provisioningModeDescription,
  wizardProvisioningModeAvailable,
} from "@/lib/forge-provisioning";

interface ForgeConnectionModePickerProps {
  value: ForgeProvisioningMode;
  onChange: (mode: ForgeProvisioningMode) => void;
  compact?: boolean;
}

const MINT_ROUTE_HINT: Record<ForgeProvisioningMode, string> = {
  island: "Engine profile · Fleet registry",
  framework: "Full desk · nav + FRE + workspace",
  imported: "JSON bundle · island or framework",
};

export function ForgeConnectionModePicker({ value, onChange, compact = false }: ForgeConnectionModePickerProps) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact ? (
        <p className="font-mono text-[11px] text-muted">
          All three paths are live. Island mints an engine profile only — not a Capital/Creator desk. Framework and
          import provision full CurXor desks with agent workspace and nav.
        </p>
      ) : null}
      <div className={`grid gap-2 ${compact ? "" : "md:grid-cols-3"}`}>
        {FORGE_CONNECTION_MODES.map((mode) => {
          const selected = value === mode.id;
          const disabled = !wizardProvisioningModeAvailable(mode.id);
          return (
            <button
              key={mode.id}
              type="button"
              disabled={disabled}
              title={mode.description}
              onClick={() => {
                if (!disabled) onChange(mode.id);
              }}
              className={`border px-3 py-2 text-left ${
                disabled
                  ? "cursor-not-allowed border-line/50 bg-void/50 opacity-60"
                  : selected
                    ? "border-cursor-glow bg-surface shadow-cursor"
                    : "border-line bg-void hover:border-line/80"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    selected && !disabled ? "text-cursor-glow" : "text-stark"
                  }`}
                >
                  {mode.label}
                </span>
              </div>
              {!compact ? (
                <>
                  <p className="mt-2 font-mono text-[10px] text-muted">{mode.description}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-cursor-glow/70">
                    {MINT_ROUTE_HINT[mode.id]}
                  </p>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
      {value ? (
        <p className="font-mono text-[10px] text-muted">{provisioningModeDescription(value)}</p>
      ) : null}
    </div>
  );
}
