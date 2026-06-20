import "server-only";

import { frontierApiBase, getFrontierProvider } from "./frontier-providers";
import { getProviderApiKey } from "./llm-credentials";
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
  const linked = providerId
    ? Boolean(settings.intelligence.connectedProviders[providerId]?.subscriptionLinked)
    : false;
  const frontierAvailable = Boolean(providerId && (hasKey || linked));

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
  return true; // auto — try frontier first when configured
}

export async function isFrontierConfigured(): Promise<boolean> {
  const settings = await readUserSettings();
  const providerId = settings.intelligence.frontierProviderId;
  if (!providerId) return false;
  if (await getProviderApiKey(providerId)) return true;
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
    const frontier = await tryFrontierCompletion(options, settings);
    if (frontier) return frontier;
    if (source === "frontier") throw new Error("Frontier LLM unavailable — check Settings → Intelligence");
  }

  return localFn();
}

async function tryFrontierCompletion(
  options: ChatCompletionOptions,
  settings: Awaited<ReturnType<typeof readUserSettings>>,
): Promise<ChatCompletionResult | null> {
  const providerId = settings.intelligence.frontierProviderId;
  if (!providerId) return null;

  const provider = getFrontierProvider(providerId);
  if (!provider) return null;

  const apiKey = await getProviderApiKey(providerId);
  const linked = settings.intelligence.connectedProviders[providerId]?.subscriptionLinked;
  if (!apiKey && !linked) return null;

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

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (linked) {
    headers["X-CurXor-Subscription"] = providerId;
  }

  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = "https://curxor.ai";
    headers["X-Title"] = "CurXor OS";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.inferenceTimeoutMs);

  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    return {
      content: data.choices?.[0]?.message?.content?.trim() ?? "",
      model: `${providerId}/${model}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
