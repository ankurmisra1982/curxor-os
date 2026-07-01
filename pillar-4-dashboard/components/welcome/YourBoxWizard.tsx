"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { WelcomeConnectionsStep } from "@/components/welcome/WelcomeConnectionsStep";
import { HOME_PATH } from "@/lib/ui-categories";
import { enabledOperateAppRoutes } from "@/lib/fre-routing";
import { getOotbApp, type OotbAppId } from "@/lib/ootb-apps";

const STEPS = ["Your metal", "About you", "Connections", "Your team"] as const;

const ESSENTIAL_JOB_TITLES: Partial<Record<OotbAppId, string>> = {
  "my-capital": "Money",
  "my-content-creator": "Content",
  "my-work": "Outreach",
};

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

export function YourBoxWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("");
  const [privacyDeferred, setPrivacyDeferred] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [selectedApps, setSelectedApps] = useState<OotbAppId[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ackBusy, setAckBusy] = useState(false);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const timezoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimezone(detectTimezone());
    void (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          settings?: {
            selectedApps?: OotbAppId[];
            operatorProfile?: {
              displayName?: string;
              city?: string;
              privacyAcknowledgedAt?: string | null;
              privacyDeferred?: boolean;
            };
          };
        };
        const profile = data.settings?.operatorProfile;
        if (Array.isArray(data.settings?.selectedApps)) {
          setSelectedApps(data.settings.selectedApps);
        }
        if (profile?.displayName) setDisplayName(profile.displayName);
        if (profile?.city) setCity(profile.city);
        if (profile?.privacyAcknowledgedAt) {
          setPrivacyAcknowledged(true);
          setPrivacyDeferred(false);
        } else if (profile?.privacyDeferred) {
          setPrivacyDeferred(true);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const teamRoutes = useMemo(() => enabledOperateAppRoutes(selectedApps), [selectedApps]);

  const canAdvance = useMemo(() => {
    if (step === 1) {
      const fromDom = displayNameRef.current?.value.trim() ?? "";
      return displayName.trim().length > 0 || fromDom.length > 0;
    }
    return true;
  }, [step, displayName]);

  const syncAboutYouFromDom = useCallback(() => {
    const name = (displayNameRef.current?.value ?? displayName).trim();
    const nextCity = cityRef.current?.value ?? city;
    const nextTz = timezoneRef.current?.value ?? timezone;
    if (name) setDisplayName(name);
    setCity(nextCity);
    if (nextTz.trim()) setTimezone(nextTz.trim());
    return name;
  }, [city, displayName, timezone]);

  const advanceStep = useCallback(() => {
    if (step === 1) {
      const name = syncAboutYouFromDom();
      if (!name) {
        setError("Please enter your name to continue.");
        displayNameRef.current?.focus();
        return;
      }
      setError(null);
      setStep(2);
      return;
    }
    setStep((s) => s + 1);
  }, [step, syncAboutYouFromDom]);

  // Browser autofill often skips React onChange — re-check when About you is shown.
  useEffect(() => {
    if (step !== 1) return;
    const sync = () => {
      const el = displayNameRef.current;
      if (el?.value && el.value !== displayName) setDisplayName(el.value);
      const cityEl = cityRef.current;
      if (cityEl?.value && cityEl.value !== city) setCity(cityEl.value);
      const tzEl = timezoneRef.current;
      if (tzEl?.value && tzEl.value !== timezone) setTimezone(tzEl.value);
    };
    sync();
    const t1 = window.setTimeout(sync, 150);
    const t2 = window.setTimeout(sync, 600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [step, displayName, city, timezone]);

  const acknowledgePrivacyNow = useCallback(async () => {
    setAckBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/privacy-ack", { method: "POST" });
      if (!res.ok) throw new Error("Ack failed");
      setPrivacyAcknowledged(true);
      setPrivacyDeferred(false);
      setStep(1);
    } catch {
      setError("Could not save privacy acknowledgment. Try again.");
    } finally {
      setAckBusy(false);
    }
  }, []);

  const finish = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          city: city.trim() || undefined,
          timezone: timezone.trim() || undefined,
          privacyAcknowledged,
          privacyDeferred,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push(HOME_PATH);
      router.refresh();
    } catch {
      setError("Could not save your profile. Try again.");
      setSaving(false);
    }
  }, [city, displayName, privacyAcknowledged, privacyDeferred, router, timezone]);

  return (
    <div className="min-h-screen bg-void">
      <header className="border-b border-line px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">CurXor OS</p>
            <h1 className="font-sans text-2xl font-semibold tracking-tight text-stark">Your Box</h1>
            <p className="mt-1 font-sans text-sm text-muted">Setup — tell us who you are so your team can help.</p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            STEP {step + 1} / {STEPS.length}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <nav className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((label, idx) => (
            <div
              key={label}
              className={`border px-3 py-2 text-center font-mono text-[10px] uppercase tracking-widest ${
                idx === step
                  ? "border-cursor-glow bg-surface text-cursor-glow shadow-cursor"
                  : idx < step
                    ? "border-line bg-panel text-stark"
                    : "border-line bg-void text-muted"
              }`}
            >
              {label}
            </div>
          ))}
        </nav>

        {error ? (
          <p className="mb-4 border border-cursor/30 bg-surface px-4 py-2 font-mono text-xs text-cursor-glow">
            {error}
          </p>
        ) : null}

        <section className="border border-line bg-panel shadow-panel">
          {step === 0 ? (
            <div className="p-6">
              <h2 className="font-sans text-lg font-semibold text-stark">Your metal stays yours</h2>
              <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted">
                CurXor runs on your appliance. Chats, files, and reasoning stay on this box until you
                connect a broker, social account, or other service. We never sell your data.
              </p>
              <p className="mt-4 font-sans text-sm text-muted">
                Connecting accounts later is optional — nothing leaves without your say-so.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={ackBusy}
                  onClick={() => void acknowledgePrivacyNow()}
                  className="border border-cursor-glow bg-surface px-6 py-2 font-sans text-sm text-cursor-glow shadow-cursor disabled:opacity-50"
                >
                  {ackBusy ? "Saving…" : "Continue"}
                </button>
                <button
                  type="button"
                  disabled={ackBusy}
                  onClick={() => {
                    setAckBusy(true);
                    void fetch("/api/onboarding/privacy-ack", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ defer: true }),
                    })
                      .then(() => {
                        setPrivacyDeferred(true);
                        setPrivacyAcknowledged(false);
                        setStep(1);
                      })
                      .catch(() => setError("Could not save. Try again."))
                      .finally(() => setAckBusy(false));
                  }}
                  className="border border-line px-6 py-2 font-sans text-sm text-muted hover:text-stark disabled:opacity-50"
                >
                  Remind me later
                </button>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <form
              className="p-6"
              onSubmit={(e) => {
                e.preventDefault();
                advanceStep();
              }}
            >
              <h2 className="font-sans text-lg font-semibold text-stark">About you</h2>
              <p className="mt-2 font-sans text-sm text-muted">
                Your team uses this to greet you and keep schedules in your timezone.
              </p>
              <div className="mt-6 max-w-md space-y-4">
                <label className="block">
                  <span className="font-sans text-xs text-muted">Your name</span>
                  <input
                    ref={displayNameRef}
                    type="text"
                    name="displayName"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onInput={(e) => setDisplayName(e.currentTarget.value)}
                    placeholder="Ankur"
                    className="mt-1 w-full border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
                    autoFocus
                  />
                </label>
                <label className="block">
                  <span className="font-sans text-xs text-muted">City (optional)</span>
                  <input
                    ref={cityRef}
                    type="text"
                    name="city"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onInput={(e) => setCity(e.currentTarget.value)}
                    placeholder="Austin"
                    className="mt-1 w-full border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
                  />
                </label>
                <label className="block">
                  <span className="font-sans text-xs text-muted">Timezone</span>
                  <input
                    ref={timezoneRef}
                    type="text"
                    name="timezone"
                    autoComplete="off"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    onInput={(e) => setTimezone(e.currentTarget.value)}
                    className="mt-1 w-full border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
                  />
                </label>
              </div>
            </form>
          ) : null}

          {step === 2 ? (
            <WelcomeConnectionsStep
              selectedApps={selectedApps}
              privacyAcknowledged={privacyAcknowledged}
              onSkipAll={() => setStep(3)}
            />
          ) : null}

          {step === 3 ? (
            <div className="p-6">
              <h2 className="font-sans text-lg font-semibold text-stark">Your team</h2>
              <p className="mt-2 font-sans text-sm text-muted">
                These specialists are on your box. Open any job from Home or ask Patron at the bottom of the screen.
              </p>
              <ul className="mt-6 space-y-3">
                {teamRoutes.map((route) => {
                  const app = getOotbApp(route.id);
                  const plain = ESSENTIAL_JOB_TITLES[route.id] ?? app.name;
                  return (
                    <li key={route.href} className="border border-line bg-void px-4 py-3">
                      <span className="font-sans text-sm font-medium text-stark">{plain}</span>
                      <p className="mt-1 font-sans text-xs text-muted">{app.description}</p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-6 font-sans text-sm text-muted">
                Voice mode for Patron is on by default. Change experience level anytime in Settings.
              </p>
            </div>
          ) : null}

          <footer className="flex items-center justify-between border-t border-line px-6 py-4">
            <button
              type="button"
              disabled={step === 0 || saving}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="font-mono text-[10px] uppercase tracking-widest text-muted disabled:opacity-30"
            >
              ← Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                disabled={step !== 1 && !canAdvance}
                onClick={() => advanceStep()}
                className="border border-cursor-glow bg-surface px-6 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow shadow-cursor disabled:opacity-30"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => void finish()}
                className="border border-cursor-glow bg-surface px-6 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow shadow-cursor disabled:opacity-30"
              >
                {saving ? "Saving…" : "Go to Home →"}
              </button>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}
