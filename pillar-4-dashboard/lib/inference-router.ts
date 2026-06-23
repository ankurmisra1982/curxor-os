import "server-only";

import { frontierApiBase, getFrontierProvider } from "./frontier-providers";
import { hasProviderOAuth, getProviderApiKey } from "./llm-credentials";
import { resolveFrontierAuth } from "./oauth/resolve-auth";
import type { ChatCompletionOptions, ChatCompletionResult } from "./local-inference";
import { loadDashboardEnv } from "./env";
import { readUserSettings } from "./user-settings";
import type { IntelligenceSource } from "./user-settings-types";

export interface InferenceStatus {
  localAvailable: boolean;
  frontierAvailable: boolean;
  activeSource: IntelligenceSource;
  localModel: string;
  frontierProvider: string | null;
  frontierModel: string | null;
}

export async function resolveInferenceStatus(localAvailable: boolean): Promise<InferenceStatus> {
  const settings = await readUserSettings();
  const providerId = settings.intelligence.frontierProviderId;
  const hasKey = providerId ? Boolean(await getProviderApiKey(providerId)) : false;
  const hasOAuth = providerId ? await hasProviderOAuth(providerId) : false;
  const linked = providerId
    ? Boolean(settings.intelligence.connectedProviders[providerId]?.subscriptionLinked)
    : false;
  const frontierAvailable = Boolean(providerId && (hasKey || hasOAuth || linked));

  return {
    localAvailable,
    frontierAvailable,
    activeSource: settings.intelligence.primarySource,
    localModel: settings.intelligence.localModel,
    frontierProvider: providerId,
    frontierModel: settings.intelligence.frontierModel,
  };
}

export async function shouldUseFrontier(forPlanning = false): Promise<boolean> {
  const settings = await readUserSettings();
  const { primarySource, allowFrontierForChat, allowFrontierForPlanning } = settings.intelligence;

  if (forPlanning && !allowFrontierForPlanning) return false;
  if (!forPlanning && !allowFrontierForChat) return false;

  if (primarySource === "local") return false;
  if (primarySource === "frontier") return true;
  return true;
}

export async function isFrontierConfigured(): Promise<boolean> {
  const settings = await readUserSettings();
  const providerId = settings.intelligence.frontierProviderId;
  if (!providerId) return false;
  if (await getProviderApiKey(providerId)) return true;
  if (await hasProviderOAuth(providerId)) return true;
  return Boolean(settings.intelligence.connectedProviders[providerId]?.subscriptionLinked);
}

export async function chatCompletionRouted(
  options: ChatCompletionOptions,
  localFn: () => Promise<ChatCompletionResult>,
): Promise<ChatCompletionResult> {
  const settings = await readUserSettings();
  const source = settings.intelligence.primarySource;
  const tryFrontier = source === "frontier" || source === "auto";

  if (tryFrontier && settings.intelligence.allowFrontierForChat) {
    const routedSettings = resolveMultiModelSettings(settings, options);
    const frontier = await tryFrontierCompletion(options, routedSettings);
    if (frontier) return frontier;
    if (source === "frontier") throw new Error("Frontier LLM unavailable — check Settings → Intelligence");
  }

  return localFn();
}

/** Pick specialized frontier provider when multi-model routing is enabled. */
function resolveMultiModelSettings(
  settings: Awaited<ReturnType<typeof readUserSettings>>,
  options: ChatCompletionOptions,
): Awaited<ReturnType<typeof readUserSettings>> {
  if (!settings.multiModel.enabled) return settings;

  const text = options.messages.map((m) => m.content).join("\n").toLowerCase();
  let providerId = settings.intelligence.frontierProviderId;

  if (/code|debug|typescript|python|refactor|implement/.test(text) && settings.multiModel.codingProviderId) {
    providerId = settings.multiModel.codingProviderId;
  } else if (/plan|summarize|brief|strategy|protocol/.test(text) && settings.multiModel.planningProviderId) {
    providerId = settings.multiModel.planningProviderId;
  } else if (text.length > 4000 && settings.multiModel.longContextProviderId) {
    providerId = settings.multiModel.longContextProviderId;
  }

  if (!providerId || providerId === settings.intelligence.frontierProviderId) return settings;

  return {
    ...settings,
    intelligence: {
      ...settings.intelligence,
      frontierProviderId: providerId,
    },
  };
}

async function tryFrontierCompletion(
  options: ChatCompletionOptions,
  settings: Awaited<ReturnType<typeof readUserSettings>>,
): Promise<ChatCompletionResult | null> {
  const providerId = settings.intelligence.frontierProviderId;
  if (!providerId) return null;

  const provider = getFrontierProvider(providerId);
  if (!provider) return null;

  const auth = await resolveFrontierAuth(providerId);
  const linked = settings.intelligence.connectedProviders[providerId]?.subscriptionLinked;
  if (!auth && !linked) return null;

  const model = options.model ?? settings.intelligence.frontierModel ?? provider.models[0]?.id;
  if (!model) return null;

  const env = loadDashboardEnv();
  const base = frontierApiBase(providerId);

  const body = {
    model,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.2,
    stream: false,
    ...(options.format === "json" ? { response_format: { type: "json_object" } } : {}),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    if (auth.kind === "api_key" && providerId === "anthropic") {
      headers["x-api-key"] = auth.credential;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers.Authorization = `Bearer ${auth.credential}`;
    }
  } else if (linked) {
    headers["X-CurXor-Subscription"] = providerId;
  }

  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = "https://curxor.ai";
    headers["X-Title"] = "CurXor OS";
  }

  const timeoutMs =
    providerId === "sakana" && /^fugu-ultra/.test(model)
      ? Math.max(env.inferenceTimeoutMs, 120_000)
      : env.inferenceTimeoutMs;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint =
      providerId === "anthropic" && auth?.kind === "api_key"
        ? `${base}/messages`
        : `${base}/chat/completions`;

    const requestBody =
      providerId === "anthropic" && auth?.kind === "api_key"
        ? {
            model,
            max_tokens: 4096,
            messages: body.messages,
          }
        : body;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      content?: Array<{ text?: string }>;
    };

    const anthropicText =
      providerId === "anthropic" ? data.content?.[0]?.text?.trim() : undefined;

    return {
      content:
        anthropicText ??
        data.choices?.[0]?.message?.content?.trim() ??
        "",
      model: `${providerId}/${model}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
