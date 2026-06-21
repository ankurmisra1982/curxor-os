"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ModuleSelectionStep } from "@/components/setup/ModuleSelectionStep";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useUiMode } from "@/components/ui/UiModeProvider";
import type { FrontierProvider } from "@/lib/frontier-providers";
import { THEME_PRESETS } from "@/lib/theme-presets";
import type { OotbAppId } from "@/lib/ootb-apps";
import type {
  ColorScheme,
  IntelligenceSource,
  UiMode,
  UserSettings,
} from "@/lib/user-settings-types";

type SettingsTab = "claws" | "intelligence" | "appearance" | "general";

interface InferenceStatus {
  localAvailable: boolean;
  frontierAvailable: boolean;
  activeSource: IntelligenceSource;
  localModel: string;
  frontierProvider: string | null;
  frontierModel: string | null;
}

interface SettingsPayload {
  settings: UserSettings;
  providers: FrontierProvider[];
  inference: InferenceStatus;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  return data;
}

export function SettingsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode, setMode, isExpert } = useUiMode();
  const { colorScheme, setColorScheme, themeMode, setThemeMode } = useTheme();

  const [tab, setTab] = useState<SettingsTab>("claws");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [providers, setProviders] = useState<FrontierProvider[]>([]);
  const [inference, setInference] = useState<InferenceStatus | null>(null);

  const [draftClaws, setDraftClaws] = useState<OotbAppId[]>([]);
  const [primarySource, setPrimarySource] = useState<IntelligenceSource>("local");
  const [localModel, setLocalModel] = useState("");
  const [frontierProviderId, setFrontierProviderId] = useState<string | null>(null);
  const [frontierModel, setFrontierModel] = useState<string | null>(null);
  const [allowChat, setAllowChat] = useState(true);
  const [allowPlanning, setAllowPlanning] = useState(true);
  const [apiKeyDraft, setApiKeyDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load settings");
      const data = (await res.json()) as SettingsPayload;
      setSettings(data.settings);
      setProviders(data.providers);
      setInference(data.inference);
      setDraftClaws(data.settings.selectedApps);
      setPrimarySource(data.settings.intelligence.primarySource);
      setLocalModel(data.settings.intelligence.localModel);
      setFrontierProviderId(data.settings.intelligence.frontierProviderId);
      setFrontierModel(data.settings.intelligence.frontierModel);
      setAllowChat(data.settings.intelligence.allowFrontierForChat);
      setAllowPlanning(data.settings.intelligence.allowFrontierForPlanning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const oauthError = searchParams.get("oauth_error");
    if (oauth === "success") {
      setMessage("Provider linked via OAuth.");
      setTab("intelligence");
      router.replace("/settings");
    } else if (oauthError) {
      setError(decodeURIComponent(oauthError));
      setTab("intelligence");
      router.replace("/settings");
    }
  }, [searchParams, router]);

  const activeProvider = useMemo(
    () => providers.find((p) => p.id === frontierProviderId) ?? null,
    [providers, frontierProviderId],
  );

  const connected = frontierProviderId
    ? settings?.intelligence.connectedProviders[frontierProviderId]
    : null;

  const toggleClaw = useCallback((id: OotbAppId) => {
    setDraftClaws((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }, []);

  const saveClaws = useCallback(async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await postJson<{ settings: UserSettings }>("/api/settings/claws", {
        selectedApps: draftClaws,
      });
      setSettings(data.settings);
      setMessage("Claws updated — navigation will refresh.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [draftClaws, router]);

  const saveIntelligence = useCallback(async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await postJson<SettingsPayload>("/api/settings", {
        intelligence: {
          primarySource,
          localModel,
          frontierProviderId,
          frontierModel,
          allowFrontierForChat: allowChat,
          allowFrontierForPlanning: allowPlanning,
        },
      });
      setSettings(data.settings);
      setInference(data.inference);
      setMessage("Intelligence preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [primarySource, localModel, frontierProviderId, frontierModel, allowChat, allowPlanning]);

  const saveAppearance = useCallback(async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await postJson<SettingsPayload>("/api/settings", {
        appearance: { uiMode: mode, colorScheme, themeMode },
      });
      setSettings(data.settings);
      setMessage("Appearance saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [mode, colorScheme, themeMode]);

  const connectProvider = useCallback(async () => {
    if (!frontierProviderId) {
      setError("Choose a provider first");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await postJson<{ settings: UserSettings }>("/api/settings/llm/connect", {
        providerId: frontierProviderId,
        apiKey: apiKeyDraft || undefined,
        frontierModel,
      });
      setSettings(data.settings);
      setApiKeyDraft("");
      setMessage(`${activeProvider?.name ?? "Provider"} connected.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setSaving(false);
    }
  }, [frontierProviderId, apiKeyDraft, frontierModel, activeProvider, load]);

  const linkSubscription = useCallback(async () => {
    if (!frontierProviderId || !activeProvider) return;
    setSaving(true);
    setError(null);
    try {
      const data = await postJson<{ linkPath: string }>("/api/settings/llm/link-session", {
        providerId: frontierProviderId,
        frontierModel,
      });
      router.push(data.linkPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link failed");
    } finally {
      setSaving(false);
    }
  }, [frontierProviderId, activeProvider, frontierModel, router]);

  const disconnectProvider = useCallback(async () => {
    if (!frontierProviderId) return;
    setSaving(true);
    setError(null);
    try {
      const data = await postJson<{ settings: UserSettings }>("/api/settings/llm/disconnect", {
        providerId: frontierProviderId,
      });
      setSettings(data.settings);
      setMessage("Provider disconnected.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setSaving(false);
    }
  }, [frontierProviderId, load]);

  const tabs: { id: SettingsTab; label: string; hint: string }[] = [
    { id: "claws", label: "Claws", hint: "Add or remove digital employees" },
    { id: "intelligence", label: "Intelligence", hint: "Local, frontier, or both" },
    { id: "appearance", label: "Appearance", hint: "Theme and display mode" },
    { id: "general", label: "General", hint: "Appliance preferences" },
  ];

  if (loading && !settings) {
    return (
      <div className="mx-auto max-w-4xl p-6 font-sans text-sm text-muted">Loading settings…</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border border-line bg-panel p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">Preferences</p>
        <h1 className="mt-2 font-sans text-2xl font-semibold text-stark">Settings</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-muted">
          You&apos;re in control — enable Claws, pick local or frontier intelligence, connect an
          existing subscription or add an API key, and tune the look of Flight Command.
        </p>
      </header>

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

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex shrink-0 flex-row gap-2 overflow-x-auto lg:w-48 lg:flex-col lg:gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border px-3 py-2 text-left font-sans text-sm transition ${
                tab === t.id
                  ? "border-cursor-glow bg-surface text-stark shadow-cursor"
                  : "border-line text-muted hover:border-cursor/40 hover:text-stark"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 border border-line bg-panel">
          {tab === "claws" ? (
            <div>
              <ModuleSelectionStep selectedApps={draftClaws} onToggle={toggleClaw} />
              <div className="flex items-center justify-between border-t border-line px-6 py-4">
                <p className="font-sans text-xs text-muted">The Forge is always available.</p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveClaws()}
                  className="border border-cursor-glow bg-surface px-4 py-2 font-sans text-sm text-stark shadow-cursor transition hover:text-cursor-glow disabled:opacity-50"
                >
                  Save Claws
                </button>
              </div>
            </div>
          ) : null}

          {tab === "intelligence" ? (
            <div className="space-y-6 p-6">
              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Primary intelligence</h2>
                <p className="mt-1 font-sans text-sm text-muted">
                  Local models run on this appliance. Frontier models use your own provider account —
                  nothing is bundled or locked in.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      ["local", "Local only"],
                      ["frontier", "Frontier only"],
                      ["auto", "Auto (frontier when connected, else local)"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPrimarySource(value)}
                      className={`border px-3 py-2 font-sans text-xs transition ${
                        primarySource === value
                          ? "border-cursor-glow text-cursor-glow"
                          : "border-line text-muted hover:text-stark"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {inference ? (
                  <p className="mt-3 font-mono text-[11px] text-muted">
                    Local {inference.localAvailable ? "online" : "offline"} · Frontier{" "}
                    {inference.frontierAvailable ? "connected" : "not connected"}
                  </p>
                ) : null}
              </section>

              <section>
                <h3 className="font-sans text-sm font-medium text-stark">Local model</h3>
                <input
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  className="mt-2 w-full border border-line bg-void px-3 py-2 font-mono text-sm text-stark"
                  placeholder="qwen2.5:7b-instruct-q4_K_M"
                />
              </section>

              <section>
                <h3 className="font-sans text-sm font-medium text-stark">Frontier provider</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {providers.map((p) => {
                    const isActive = frontierProviderId === p.id;
                    const isConnected = Boolean(settings?.intelligence.connectedProviders[p.id]);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setFrontierProviderId(p.id);
                          setFrontierModel(p.models[0]?.id ?? null);
                        }}
                        className={`border p-3 text-left transition ${
                          isActive
                            ? "border-cursor-glow bg-surface"
                            : "border-line hover:border-cursor/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-sans text-sm font-medium text-stark">{p.name}</span>
                          <span className="font-sans text-[10px] text-muted">
                            {isConnected ? "Connected" : "Not connected"}
                          </span>
                        </div>
                        <p className="mt-2 font-sans text-xs text-muted">{p.tagline}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {activeProvider ? (
                <section className="space-y-4 border border-line bg-void p-4">
                  <div>
                    <label className="font-sans text-xs text-muted">Frontier model</label>
                    <select
                      value={frontierModel ?? ""}
                      onChange={(e) => setFrontierModel(e.target.value || null)}
                      className="mt-1 w-full border border-line bg-panel px-3 py-2 font-sans text-sm text-stark"
                    >
                      {activeProvider.models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-sans text-xs text-muted">API key (optional if subscription linked)</label>
                    <input
                      type="password"
                      value={apiKeyDraft}
                      onChange={(e) => setApiKeyDraft(e.target.value)}
                      placeholder={connected?.hasApiKey ? "Key stored — enter new to replace" : "sk-…"}
                      className="mt-1 w-full border border-line bg-panel px-3 py-2 font-mono text-sm text-stark"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void connectProvider()}
                      className="border border-cursor-glow px-3 py-2 font-sans text-xs text-stark hover:text-cursor-glow disabled:opacity-50"
                    >
                      Save API key
                    </button>
                    {activeProvider.supportsSubscriptionLogin ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void linkSubscription()}
                        className="border border-line px-3 py-2 font-sans text-xs text-stark hover:border-cursor-glow disabled:opacity-50"
                      >
                        {activeProvider.authMethods.includes("oauth_pkce")
                          ? "Sign in with subscription (OAuth)"
                          : "Link existing subscription"}
                      </button>
                    ) : null}
                    {connected ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void disconnectProvider()}
                        className="font-sans text-xs text-muted hover:text-red-400 disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    ) : null}
                    <a
                      href={activeProvider.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-line px-3 py-2 font-sans text-xs text-muted hover:text-cursor-glow"
                    >
                      Purchase / sign up
                    </a>
                    <a
                      href={activeProvider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-xs text-muted hover:text-cursor-glow"
                    >
                      Docs
                    </a>
                  </div>
                  {connected?.oauthLinked ? (
                    <p className="font-sans text-xs text-cursor-glow">
                      OAuth subscription linked on this appliance.
                    </p>
                  ) : connected?.subscriptionLinked ? (
                    <p className="font-sans text-xs text-cursor-glow">
                      Subscription linked on this appliance.
                    </p>
                  ) : null}
                </section>
              ) : null}

              <section>
                <h3 className="font-sans text-sm font-medium text-stark">Frontier usage</h3>
                <label className="mt-3 flex items-center gap-2 font-sans text-sm text-muted">
                  <input type="checkbox" checked={allowChat} onChange={(e) => setAllowChat(e.target.checked)} />
                  Allow frontier for chat assistance
                </label>
                <label className="mt-2 flex items-center gap-2 font-sans text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={allowPlanning}
                    onChange={(e) => setAllowPlanning(e.target.checked)}
                  />
                  Allow frontier for planning / recommendations
                </label>
              </section>

              <div className="flex justify-end border-t border-line pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveIntelligence()}
                  className="border border-cursor-glow bg-surface px-4 py-2 font-sans text-sm text-stark shadow-cursor disabled:opacity-50"
                >
                  Save intelligence
                </button>
              </div>
            </div>
          ) : null}

          {tab === "appearance" ? (
            <div className="space-y-6 p-6">
              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Display mode</h2>
                <div className="mt-4 flex gap-2">
                  {(
                    [
                      ["simple", "Simple — hide telemetry"],
                      ["expert", "Expert — mesh & metrics"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value as UiMode)}
                      className={`border px-3 py-2 font-sans text-xs ${
                        mode === value
                          ? "border-cursor-glow text-cursor-glow"
                          : "border-line text-muted hover:text-stark"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 font-sans text-xs text-muted">
                  Current: {isExpert ? "Expert" : "Simple"} mode
                </p>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Light / dark</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      ["dark", "Dark"],
                      ["light", "Light"],
                      ["system", "System"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setThemeMode(value)}
                      className={`border px-3 py-2 font-sans text-xs ${
                        themeMode === value
                          ? "border-cursor-glow text-cursor-glow"
                          : "border-line text-muted hover:text-stark"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Color scheme</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setColorScheme(preset.id as ColorScheme)}
                      className={`border p-4 text-left transition ${
                        colorScheme === preset.id
                          ? "border-cursor-glow bg-surface shadow-cursor"
                          : "border-line hover:border-cursor/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-8 w-8 shrink-0 rounded-full border border-line"
                          style={{ background: preset.glow }}
                        />
                        <div>
                          <p className="font-sans text-sm font-medium text-stark">{preset.label}</p>
                          <p className="font-sans text-xs text-muted">{preset.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="flex justify-end border-t border-line pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveAppearance()}
                  className="border border-cursor-glow bg-surface px-4 py-2 font-sans text-sm text-stark shadow-cursor disabled:opacity-50"
                >
                  Save appearance
                </button>
              </div>
            </div>
          ) : null}

          {tab === "general" ? (
            <div className="space-y-4 p-6">
              <h2 className="font-sans text-lg font-semibold text-stark">General</h2>
              <p className="font-sans text-sm text-muted">
                CurXor OS keeps preferences on this appliance. Nothing here locks you into a vendor —
                change Claws, models, or themes anytime.
              </p>
              <dl className="mt-4 space-y-2 font-sans text-sm">
                <div className="flex justify-between gap-4 border-b border-line py-2">
                  <dt className="text-muted">Settings updated</dt>
                  <dd className="font-mono text-xs text-stark">
                    {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-line py-2">
                  <dt className="text-muted">Enabled Claws</dt>
                  <dd className="font-mono text-xs text-stark">{settings?.selectedApps.length ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-line py-2">
                  <dt className="text-muted">Intelligence</dt>
                  <dd className="font-mono text-xs text-stark">{settings?.intelligence.primarySource}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3 pt-4">
                <Link
                  href="/home"
                  className="border border-line px-4 py-2 font-sans text-sm text-stark hover:border-cursor-glow"
                >
                  Back to Home
                </Link>
                <Link
                  href="/setup"
                  className="font-sans text-sm text-muted hover:text-cursor-glow"
                >
                  Re-run setup wizard
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
