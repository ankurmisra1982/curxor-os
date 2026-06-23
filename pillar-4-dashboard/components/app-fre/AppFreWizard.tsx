"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import type { AppFreField, AppAgentDefinition } from "@/lib/app-agent-catalog";
import { defaultFreConfig, getAppAgent } from "@/lib/app-agent-catalog";
import { ComingSoonBadge } from "@/components/app-shared/ComingSoonBadge";
import type { ResolvedAppAgent } from "@/lib/forged-agent-catalog";
import { defaultFreConfigForApp } from "@/lib/forged-agent-catalog";
import { isPreviewApp, PREVIEW_FRE_ACTIVATE_TIPS, PREVIEW_FRE_WELCOME_SUFFIX } from "@/lib/claw-preview-apps";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import { isForgedAppId } from "@/lib/workspace-app-id";

const STEPS = ["Welcome", "Configure", "Activate"] as const;

const FALLBACK_AGENT: ResolvedAppAgent = {
  appId: "forged-unknown",
  agentName: "Claw",
  tagline: "Custom forged desk",
  ootbLabel: "Claw",
  purpose: ["Operator desk on CurXor OS."],
  howToUse: ["Chat in the agent panel.", "Tap skills for explicit actions."],
  skills: [],
  fre: {
    welcomeTitle: "Welcome",
    welcomeLead: "",
    configureTitle: "Configure",
    configureLead: "",
    fields: [],
    activateTitle: "Activate",
    activateTips: [],
  },
  bootMessage: "Claw ready.",
};

interface AppFreWizardProps {
  appId: string;
  agent?: AppAgentDefinition | ResolvedAppAgent;
  onComplete: (config: Record<string, unknown>) => void;
}

export function AppFreWizard({ appId, agent: agentOverride, onComplete }: AppFreWizardProps) {
  const agent =
    agentOverride ??
    (isValidAppId(appId) ? getAppAgent(appId as OotbAppId) : null) ??
    FALLBACK_AGENT;
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Record<string, unknown>>(() =>
    isValidAppId(appId) ? defaultFreConfig(appId as OotbAppId) : defaultFreConfigForApp(appId),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdvance = useMemo(() => {
    if (step !== 1) return true;
    return agent.fre.fields
      .filter((f) => f.required && f.type !== "toggle")
      .every((f) => {
        const v = config[f.id];
        return typeof v === "string" ? v.trim().length > 0 : true;
      });
  }, [step, config, agent.fre.fields]);

  const finish = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/app-fre/${appId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error("Failed");
      onComplete(config);
    } catch {
      setError("Could not save app setup. Check /etc/curxor permissions.");
      setSubmitting(false);
    }
  }, [appId, config, onComplete]);

  const preview = isPreviewApp(appId);
  const activateTips = preview ? [...agent.fre.activateTips, ...PREVIEW_FRE_ACTIVATE_TIPS] : agent.fre.activateTips;
  const welcomeLead = preview ? `${agent.fre.welcomeLead}${PREVIEW_FRE_WELCOME_SUFFIX}` : agent.fre.welcomeLead;

  return (
    <div className="flex min-h-[480px] flex-col border border-line bg-panel">
      <header className="border-b border-line px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
            {agent.ootbLabel} · First Run
          </p>
          {preview ? <ComingSoonBadge /> : null}
        </div>
        <h1 className="mt-1 font-sans text-xl font-semibold text-stark">{agent.fre.welcomeTitle}</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted">{welcomeLead}</p>
      </header>

      <nav className="grid grid-cols-3 gap-1 border-b border-line px-4 py-2">
        {STEPS.map((label, idx) => (
          <div
            key={label}
            className={`py-1 text-center font-mono text-[10px] uppercase tracking-widest ${
              idx === step ? "text-cursor-glow" : idx < step ? "text-stark" : "text-muted"
            }`}
          >
            {label}
          </div>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {error ? (
          <p className="mb-4 border border-cursor/30 bg-surface px-3 py-2 font-mono text-xs text-cursor-glow">{error}</p>
        ) : null}

        {step === 0 && (
          <div className="max-w-2xl space-y-4">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">Meet {agent.agentName}</h2>
            <p className="font-mono text-[11px] text-muted">{agent.tagline}</p>
            <ul className="space-y-2 font-mono text-xs text-stark">
              {agent.purpose.map((p) => (
                <li key={p} className="border-l-2 border-cursor-glow pl-3">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-xl space-y-4">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">{agent.fre.configureTitle}</h2>
            <p className="font-mono text-[11px] text-muted">{agent.fre.configureLead}</p>
            <div className="space-y-4">
              {agent.fre.fields.map((field) => (
                <FreFieldInput key={field.id} field={field} config={config} setConfig={setConfig} />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl space-y-4">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">{agent.fre.activateTitle}</h2>
            <p className="font-mono text-[11px] text-cursor-glow">{agent.bootMessage}</p>
            <div className="border border-line bg-void p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Quick start</div>
              <ul className="mt-3 space-y-2 font-mono text-[11px] text-stark">
                {activateTips.map((tip) => (
                  <li key={tip}>→ {tip}</li>
                ))}
              </ul>
            </div>
            <div className="border border-line bg-surface p-4 font-mono text-[10px]">
              <div className="uppercase tracking-widest text-cursor-glow">How to use</div>
              <ul className="mt-2 space-y-1 text-muted">
                {agent.howToUse.map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <footer className="flex justify-between border-t border-line px-6 py-4">
        <button
          type="button"
          disabled={step === 0 || submitting}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="font-mono text-[10px] uppercase tracking-widest text-muted disabled:opacity-30"
        >
          ← Back
        </button>
        {step < 2 ? (
          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => setStep((s) => s + 1)}
            className="border border-cursor-glow px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void finish()}
            className="border border-cursor-glow bg-surface px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow shadow-cursor disabled:opacity-40"
          >
            {submitting ? "Activating…" : `Activate ${agent.agentName} →`}
          </button>
        )}
      </footer>
    </div>
  );
}

function FreFieldInput({
  field,
  config,
  setConfig,
}: {
  field: AppFreField;
  config: Record<string, unknown>;
  setConfig: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const value = config[field.id];

  if (field.type === "toggle") {
    return (
      <label className="flex cursor-pointer items-center gap-3 border border-line bg-void px-4 py-3">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => setConfig((c) => ({ ...c, [field.id]: e.target.checked }))}
          className="accent-[#bc13fe]"
        />
        <span className="font-mono text-xs text-stark">{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block font-mono text-xs">
        <span className="text-[10px] uppercase tracking-widest text-muted">{field.label}</span>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setConfig((c) => ({ ...c, [field.id]: e.target.value }))}
          className="mt-1 w-full border border-line bg-panel px-2 py-2 text-stark"
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {field.help ? <span className="mt-1 block text-[10px] text-muted">{field.help}</span> : null}
      </label>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="font-mono text-xs">
        <span className="text-[10px] uppercase tracking-widest text-muted">{field.label}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {field.options?.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  setConfig((c) => {
                    const cur = Array.isArray(c[field.id]) ? ([...(c[field.id] as string[])] as string[]) : [];
                    const next = on ? cur.filter((x) => x !== o.value) : [...cur, o.value];
                    return { ...c, [field.id]: next };
                  })
                }
                className={`border px-3 py-1.5 text-[10px] uppercase tracking-widest ${
                  on ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <label className="block font-mono text-xs">
      <span className="text-[10px] uppercase tracking-widest text-muted">{field.label}</span>
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        onChange={(e) => setConfig((c) => ({ ...c, [field.id]: e.target.value }))}
        className="mt-1 w-full border border-line bg-panel px-3 py-2 text-stark outline-none focus:border-cursor-glow"
      />
    </label>
  );
}
