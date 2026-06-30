"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ModuleSelectionStep } from "@/components/setup/ModuleSelectionStep";
import { AgentRuntimeSettingsPanels } from "@/components/settings/AgentRuntimeSettingsPanels";
import { BuildPlanePanel } from "@/components/settings/BuildPlanePanel";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import {
  EXPERIENCE_LEVEL_DESCRIPTIONS,
  EXPERIENCE_LEVEL_LABELS,
  type ExperienceLevel,
} from "@/lib/experience-level";
import { GROWTH_LABELS, type GrowthLevel } from "@/lib/os-growth-level";
import { FORGE_GROWTH_LABELS } from "@/lib/forge-level-copy";
import type { FrontierProvider } from "@/lib/frontier-providers";
import { THEME_PRESETS } from "@/lib/theme-presets";
import type { OotbAppId } from "@/lib/ootb-apps";
import type {
  ColorScheme,
  IntelligenceSource,
  UiMode,
  UserSettings,
} from "@/lib/user-settings-types";

type SettingsTab = "claws" | "intelligence" | "appearance" | "agent" | "general";

const PRIMARY_SOURCE_HINTS: Record<IntelligenceSource, string> = {
  local: "All chat and planning stay on this appliance's local models.",
  frontier: "Requires a connected frontier provider — no fallback to local.",
  auto: "Uses frontier when connected; otherwise falls back to local models.",
};

const CAFE_TITLE_HINTS: Record<"mythic" | "neutral", string> = {
  mythic: "Mythic titles on your ascension profile — Sprout, Voyager, and beyond.",
  neutral: "Plain tier labels (L1–L6) instead of mythic names on your profile.",
};

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
  const { level, setLevel, levelLabel, levelDescription, isExpert } = useExperienceLevel();
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
  const [multiModelEnabled, setMultiModelEnabled] = useState(false);
  const [planningProviderId, setPlanningProviderId] = useState<string | null>(null);
  const [codingProviderId, setCodingProviderId] = useState<string | null>(null);
  const [longContextProviderId, setLongContextProviderId] = useState<string | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [workGrowthLevel, setWorkGrowthLevel] = useState<GrowthLevel | "">("");
  const [creatorGrowthLevel, setCreatorGrowthLevel] = useState<GrowthLevel | "">("");
  const [capitalGrowthLevel, setCapitalGrowthLevel] = useState<GrowthLevel | "">("");
  const [vitalGrowthLevel, setVitalGrowthLevel] = useState<GrowthLevel | "">("");
  const [forgeGrowthLevel, setForgeGrowthLevel] = useState<GrowthLevel | "">("");
  const [kinGrowthLevel, setKinGrowthLevel] = useState<GrowthLevel | "">("");
  const [shopGrowthLevel, setShopGrowthLevel] = useState<GrowthLevel | "">("");
  const [workGamificationOptOut, setWorkGamificationOptOut] = useState(false);
  const [cafeTitleStyle, setCafeTitleStyle] = useState<"mythic" | "neutral">("mythic");

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
      setMultiModelEnabled(data.settings.multiModel.enabled);
      setPlanningProviderId(data.settings.multiModel.planningProviderId);
      setCodingProviderId(data.settings.multiModel.codingProviderId);
      setLongContextProviderId(data.settings.multiModel.longContextProviderId);
      setWorkGrowthLevel(data.settings.appearance.workGrowthLevel ?? "");
      setCreatorGrowthLevel(data.settings.appearance.creatorGrowthLevel ?? "");
      setCapitalGrowthLevel(data.settings.appearance.capitalGrowthLevel ?? "");
      setVitalGrowthLevel(data.settings.appearance.vitalGrowthLevel ?? "");
      setForgeGrowthLevel(data.settings.appearance.forgeGrowthLevel ?? "");
      setKinGrowthLevel(data.settings.appearance.kinGrowthLevel ?? "");
      setWorkGamificationOptOut(data.settings.appearance.workGamificationOptOut === true);
      setCafeTitleStyle(data.settings.appearance.cafeTitleStyle === "neutral" ? "neutral" : "mythic");
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
        multiModel: {
          enabled: multiModelEnabled,
          planningProviderId,
          codingProviderId,
          longContextProviderId,
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
  }, [
    primarySource,
    localModel,
    frontierProviderId,
    frontierModel,
    allowChat,
    allowPlanning,
    multiModelEnabled,
    planningProviderId,
    codingProviderId,
    longContextProviderId,
  ]);

  const saveAppearance = useCallback(async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await postJson<SettingsPayload>("/api/settings", {
        appearance: {
          experienceLevel: level,
          uiMode: level === "expert" ? "expert" : "simple",
          colorScheme,
          themeMode,
          workGrowthLevel: workGrowthLevel || null,
          creatorGrowthLevel: creatorGrowthLevel || null,
          capitalGrowthLevel: capitalGrowthLevel || null,
          vitalGrowthLevel: vitalGrowthLevel || null,
          forgeGrowthLevel: forgeGrowthLevel || null,
          kinGrowthLevel: kinGrowthLevel || null,
          shopGrowthLevel: shopGrowthLevel || null,
          workGamificationOptOut,
          cafeTitleStyle,
        },
      });
      setSettings(data.settings);
      setMessage("Appearance saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [level, colorScheme, themeMode, workGrowthLevel, creatorGrowthLevel, capitalGrowthLevel, vitalGrowthLevel, forgeGrowthLevel, kinGrowthLevel, shopGrowthLevel, workGamificationOptOut, cafeTitleStyle]);

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
    { id: "agent", label: "Agent runtime", hint: "Channels, CCP, heartbeat" },
    { id: "general", label: "General", hint: "Builder overlay + appliance prefs" },
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
                <p className="mt-3 font-sans text-xs text-muted">
                  Current:{" "}
                  {primarySource === "local"
                    ? "Local only"
                    : primarySource === "frontier"
                      ? "Frontier only"
                      : "Auto"}{" "}
                  — {PRIMARY_SOURCE_HINTS[primarySource]}
                </p>
                {inference ? (
                  <p className="mt-2 font-mono text-[11px] text-muted">
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
                  placeholder="qwen3:8b"
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
                <h3 className="font-sans text-sm font-medium text-stark">Multi-model routing</h3>
                <p className="mt-1 font-sans text-xs text-muted">
                  When frontier is active, route coding, planning, and long-context prompts to different
                  providers you connect — Perplexity-style orchestration using your keys.
                </p>
                <label className="mt-3 flex items-center gap-2 font-sans text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={multiModelEnabled}
                    onChange={(e) => setMultiModelEnabled(e.target.checked)}
                  />
                  Enable multi-model auto-routing
                </label>
                {multiModelEnabled ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="block font-sans text-xs text-muted">
                      Planning
                      <select
                        value={planningProviderId ?? ""}
                        onChange={(e) => setPlanningProviderId(e.target.value || null)}
                        className="mt-1 w-full border border-line bg-surface px-2 py-1.5 text-sm text-stark"
                      >
                        <option value="">Default</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block font-sans text-xs text-muted">
                      Coding
                      <select
                        value={codingProviderId ?? ""}
                        onChange={(e) => setCodingProviderId(e.target.value || null)}
                        className="mt-1 w-full border border-line bg-surface px-2 py-1.5 text-sm text-stark"
                      >
                        <option value="">Default</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block font-sans text-xs text-muted">
                      Long context
                      <select
                        value={longContextProviderId ?? ""}
                        onChange={(e) => setLongContextProviderId(e.target.value || null)}
                        className="mt-1 w-full border border-line bg-surface px-2 py-1.5 text-sm text-stark"
                      >
                        <option value="">Default</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </section>

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
                <h2 className="font-sans text-lg font-semibold text-stark">Experience level</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  Applies to all Claw apps — controls panels, tips, and advanced tools.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["beginner", "standard", "expert"] as ExperienceLevel[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLevel(value)}
                      className={`border px-3 py-2 text-left font-sans text-xs ${
                        level === value
                          ? "border-cursor-glow text-cursor-glow"
                          : "border-line text-muted hover:text-stark"
                      }`}
                    >
                      <span className="block font-medium">{EXPERIENCE_LEVEL_LABELS[value]}</span>
                      <span className="mt-0.5 block text-[10px] opacity-80">
                        {EXPERIENCE_LEVEL_DESCRIPTIONS[value]}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 font-sans text-xs text-muted">
                  Current: {levelLabel} — {levelDescription}
                  {isExpert ? " · Mesh telemetry visible." : ""}
                </p>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Gamification</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  Work streaks, Cafe ascension, and cross-Claw XP across the OS. Turn off to pause tracking and live room updates.
                </p>
                <label className="mt-4 flex cursor-pointer items-start gap-3 font-sans text-xs text-stark">
                  <input
                    type="checkbox"
                    checked={!workGamificationOptOut}
                    onChange={(e) => setWorkGamificationOptOut(!e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Track XP and ascension across Claws
                    <span className="mt-0.5 block text-[10px] text-muted">
                      When off, Work XP and Claw Cafe ascension stay frozen until re-enabled.
                    </span>
                  </span>
                </label>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Claw Cafe title style</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  How ascension tiers appear in Claw Cafe and cross-Claw XP surfaces.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      ["mythic", "Mythic"],
                      ["neutral", "Neutral"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCafeTitleStyle(value)}
                      className={`border px-3 py-2 font-sans text-xs ${
                        cafeTitleStyle === value
                          ? "border-cursor-glow text-cursor-glow"
                          : "border-line text-muted hover:text-stark"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 font-sans text-xs text-muted">
                  Current: {cafeTitleStyle === "mythic" ? "Mythic" : "Neutral"} —{" "}
                  {CAFE_TITLE_HINTS[cafeTitleStyle]}
                </p>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Outreach Claw growth level</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  Optional override for Outreach desk persona (Explorer → Executive). Leave default to use FRE persona.
                </p>
                <select
                  value={workGrowthLevel}
                  onChange={(e) => setWorkGrowthLevel(e.target.value as GrowthLevel | "")}
                  className="mt-3 w-full max-w-md border border-line bg-panel px-3 py-2 font-mono text-xs text-stark"
                >
                  <option value="">From FRE / experience mapping</option>
                  {(["L1", "L2", "L3", "L4", "L5"] as GrowthLevel[]).map((g) => (
                    <option key={g} value={g}>
                      {g} — {GROWTH_LABELS["my-work"][g]}
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Creator Claw growth level</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  Optional override for Creator desk persona (Explorer → Studio). Leave default to use FRE persona.
                </p>
                <select
                  value={creatorGrowthLevel}
                  onChange={(e) => setCreatorGrowthLevel(e.target.value as GrowthLevel | "")}
                  className="mt-3 w-full max-w-md border border-line bg-panel px-3 py-2 font-mono text-xs text-stark"
                >
                  <option value="">From FRE / experience mapping</option>
                  {(["L1", "L2", "L3", "L4", "L5"] as GrowthLevel[]).map((g) => (
                    <option key={g} value={g}>
                      {g} — {GROWTH_LABELS["my-content-creator"][g]}
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Capital Claw growth level</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  Optional override for Capital desk persona (Learner → Principal). Leave default to use FRE persona.
                </p>
                <select
                  value={capitalGrowthLevel}
                  onChange={(e) => setCapitalGrowthLevel(e.target.value as GrowthLevel | "")}
                  className="mt-3 w-full max-w-md border border-line bg-panel px-3 py-2 font-mono text-xs text-stark"
                >
                  <option value="">From FRE / experience mapping</option>
                  {(["L1", "L2", "L3", "L4", "L5"] as GrowthLevel[]).map((g) => (
                    <option key={g} value={g}>
                      {g} — {GROWTH_LABELS["my-capital"][g]}
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Vital Claw growth level</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  Optional override for Vital desk persona (Starter → Longevity). Leave default to use FRE persona.
                </p>
                <select
                  value={vitalGrowthLevel}
                  onChange={(e) => setVitalGrowthLevel(e.target.value as GrowthLevel | "")}
                  className="mt-3 w-full max-w-md border border-line bg-panel px-3 py-2 font-mono text-xs text-stark"
                >
                  <option value="">From FRE / experience mapping</option>
                  {(["L1", "L2", "L3", "L4", "L5"] as GrowthLevel[]).map((g) => (
                    <option key={g} value={g}>
                      {g} — {GROWTH_LABELS["my-vital"][g]}
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">The Forge growth level</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  Optional override for Forge persona (Sketcher → Foundry). Leave default to use FRE intent.
                </p>
                <select
                  value={forgeGrowthLevel}
                  onChange={(e) => setForgeGrowthLevel(e.target.value as GrowthLevel | "")}
                  className="mt-3 w-full max-w-md border border-line bg-panel px-3 py-2 font-mono text-xs text-stark"
                >
                  <option value="">From FRE / experience mapping</option>
                  {(["L1", "L2", "L3", "L4", "L5"] as GrowthLevel[]).map((g) => (
                    <option key={g} value={g}>
                      {g} — {FORGE_GROWTH_LABELS[g]}
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Kin Claw growth level</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  Optional override for Kin desk persona (Member → Elder). Leave default to use FRE intent.
                </p>
                <select
                  value={kinGrowthLevel}
                  onChange={(e) => setKinGrowthLevel(e.target.value as GrowthLevel | "")}
                  className="mt-3 w-full max-w-md border border-line bg-panel px-3 py-2 font-mono text-xs text-stark"
                >
                  <option value="">From FRE / experience mapping</option>
                  {(["L1", "L2", "L3", "L4", "L5"] as GrowthLevel[]).map((g) => (
                    <option key={g} value={g}>
                      {g} — {GROWTH_LABELS["my-family"][g]}
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <h2 className="font-sans text-lg font-semibold text-stark">Arbitrage Claw growth level</h2>
                <p className="mt-1 font-sans text-xs text-muted">
                  Optional override for Arbitrage desk persona (Scout → Desk Lead). Leave default to use FRE intent.
                </p>
                <select
                  value={shopGrowthLevel}
                  onChange={(e) => setShopGrowthLevel(e.target.value as GrowthLevel | "")}
                  className="mt-3 w-full max-w-md border border-line bg-panel px-3 py-2 font-mono text-xs text-stark"
                >
                  <option value="">From FRE / experience mapping</option>
                  {(["L1", "L2", "L3", "L4", "L5"] as GrowthLevel[]).map((g) => (
                    <option key={g} value={g}>
                      {g} — {GROWTH_LABELS["my-shop"][g]}
                    </option>
                  ))}
                </select>
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

          {tab === "agent" ? (
            <div className="p-6">
              <AgentRuntimeSettingsPanels />
            </div>
          ) : null}

          {tab === "general" ? (
            <div className="space-y-6 p-6">
              <BuildPlanePanel
                enabled={settings?.buildPlane?.enabled ?? false}
                linkStatus={settings?.buildPlane?.linkStatus ?? "disconnected"}
                allowDelegation={settings?.buildPlane?.allowDelegation ?? false}
                allowWriteTools={settings?.buildPlane?.allowWriteTools ?? false}
                onSaved={() => void load()}
              />

              <div className="space-y-4">
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
