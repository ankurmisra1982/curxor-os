import "server-only";

import { frontierApiBase, getFrontierProvider } from "./frontier-providers";
import { loadDashboardEnv } from "./env";

export interface ValidateKeyResult {
  ok: boolean;
  error?: string;
}

export async function validateFrontierApiKey(
  providerId: string,
  apiKey: string,
): Promise<ValidateKeyResult> {
  const provider = getFrontierProvider(providerId);
  if (!provider) return { ok: false, error: "Unknown provider" };

  const key = apiKey.trim();
  if (!key) return { ok: false, error: "API key is empty" };

  const env = loadDashboardEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(env.inferenceTimeoutMs, 15_000));

  try {
    switch (providerId) {
      case "openai": {
        const res = await fetch(`${frontierApiBase(providerId)}/models`, {
          headers: { Authorization: `Bearer ${key}` },
          signal: controller.signal,
        });
        if (!res.ok) return { ok: false, error: "OpenAI rejected this API key" };
        return { ok: true };
      }
      case "anthropic": {
        const res = await fetch(`${frontierApiBase(providerId)}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: provider.models[0]?.id ?? "claude-3-5-haiku-20241022",
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
          signal: controller.signal,
        });
        if (res.status === 401 || res.status === 403) {
          return { ok: false, error: "Anthropic rejected this API key" };
        }
        return { ok: true };
      }
      case "google": {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return { ok: false, error: "Google AI rejected this API key" };
        return { ok: true };
      }
      case "openrouter": {
        const res = await fetch(`${frontierApiBase(providerId)}/models`, {
          headers: { Authorization: `Bearer ${key}` },
          signal: controller.signal,
        });
        if (!res.ok) return { ok: false, error: "OpenRouter rejected this API key" };
        return { ok: true };
      }
      case "cursor": {
        const res = await fetch(`${frontierApiBase(providerId)}/models`, {
          headers: { Authorization: `Bearer ${key}` },
          signal: controller.signal,
        });
        if (res.status === 401 || res.status === 403) {
          return { ok: false, error: "Cursor rejected this API key" };
        }
        return { ok: true };
      }
      default:
        return { ok: false, error: "Validation not implemented for this provider" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation request failed";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
