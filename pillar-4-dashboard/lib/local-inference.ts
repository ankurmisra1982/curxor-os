import "server-only";

import { loadDashboardEnv } from "./env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

export interface ChatCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  format?: "text" | "json";
  temperature?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
}

let inferenceChain: Promise<unknown> = Promise.resolve();

let availabilityCache: { at: number; ok: boolean } | null = null;
const AVAILABILITY_TTL_MS = 5_000;
const PROBE_TIMEOUT_MS = 3_000;

function assertLocalhost(url: string): void {
  if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
    throw new Error(`Cloud inference blocked: URL must be localhost (got ${url})`);
  }
}

export function normalizeBase64Image(raw: string): string {
  const idx = raw.indexOf("base64,");
  return idx >= 0 ? raw.slice(idx + 7) : raw;
}

export function isDashboardInferenceEnabled(): boolean {
  return loadDashboardEnv().dashboardInferenceEnabled;
}

export async function isLocalInferenceAvailable(): Promise<boolean> {
  if (!isDashboardInferenceEnabled()) return false;

  const now = Date.now();
  if (availabilityCache && now - availabilityCache.at < AVAILABILITY_TTL_MS) {
    return availabilityCache.ok;
  }

  const env = loadDashboardEnv();
  let ok = false;

  try {
    if (env.inferenceBackend === "ollama") {
      assertLocalhost(env.ollamaUrl);
      const res = await fetch(`${env.ollamaUrl}/api/tags`, {
        cache: "no-store",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      ok = res.ok;
    } else {
      assertLocalhost(env.inferenceBaseUrl);
      const res = await fetch(`${env.inferenceBaseUrl}/models`, {
        cache: "no-store",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      ok = res.ok;
    }
  } catch {
    ok = false;
  }

  availabilityCache = { at: now, ok };
  return ok;
}

export async function withInferenceLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = inferenceChain.then(fn, fn);
  inferenceChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const { chatCompletionRouted } = await import("./inference-router");
  return chatCompletionRouted(options, () =>
    withInferenceLock(async () => {
      const env = loadDashboardEnv();
      const settings = await (await import("./user-settings")).readUserSettings();
      const model = options.model ?? settings.intelligence.localModel ?? env.inferenceModel;
      const temperature = options.temperature ?? 0.2;

      if (env.inferenceBackend === "ollama") {
        return chatOllama(env.ollamaUrl, model, options.messages, temperature, options.format);
      }

      return chatVllm(env.inferenceBaseUrl, model, options.messages, temperature, options.format);
    }),
  );
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
): Promise<string | null> {
  if (!(await isLocalInferenceAvailable())) return null;

  try {
    const result = await chatCompletion({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      format: "text",
      temperature: 0.3,
    });
    return result.content.trim() || null;
  } catch {
    return null;
  }
}

/** Local image generation via Ollama (flux, sd, etc.) — localhost only. */
export async function generateImageLocal(prompt: string, model?: string): Promise<Buffer | null> {
  if (!(await isLocalInferenceAvailable())) return null;

  const env = loadDashboardEnv();
  if (env.inferenceBackend !== "ollama") return null;

  const imageModel = model ?? process.env.CURXOR_IMAGE_MODEL?.trim() ?? "flux";
  const timeout = Math.max(env.inferenceTimeoutMs, 120_000);

  try {
    const response = await fetchWithTimeout(
      `${env.ollamaUrl}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: imageModel,
          prompt,
          stream: false,
        }),
      },
      timeout,
    );

    const data = (await response.json()) as {
      image?: string;
      images?: string[];
      response?: string;
    };

    const raw = data.images?.[0] ?? data.image ?? data.response;
    if (typeof raw !== "string" || raw.length < 64) return null;

    const payload = raw.includes(",") ? raw.split(",", 2)[1]! : raw;
    const buf = Buffer.from(payload, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

export async function isImageGenerationAvailable(): Promise<boolean> {
  if (!(await isLocalInferenceAvailable())) return false;
  const env = loadDashboardEnv();
  return env.inferenceBackend === "ollama";
}

export function parseJsonLoose<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

async function chatOllama(
  ollamaUrl: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  format?: "text" | "json",
): Promise<ChatCompletionResult> {
  assertLocalhost(ollamaUrl);
  const env = loadDashboardEnv();

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.images?.length ? { images: m.images.map(normalizeBase64Image) } : {}),
    })),
    stream: false,
    options: { temperature },
  };

  if (format === "json") {
    body.format = "json";
  }

  const response = await fetchWithTimeout(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, env.inferenceTimeoutMs);

  const data = (await response.json()) as { message?: { content?: string } };
  return {
    content: data.message?.content?.trim() ?? "",
    model,
  };
}

async function chatVllm(
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  format?: "text" | "json",
): Promise<ChatCompletionResult> {
  assertLocalhost(baseUrl);
  const env = loadDashboardEnv();

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.images?.length
        ? [
            { type: "text", text: m.content },
            ...m.images.map((img) => ({
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${normalizeBase64Image(img)}` },
            })),
          ]
        : m.content,
    })),
    temperature,
    stream: false,
  };

  if (format === "json") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, env.inferenceTimeoutMs);

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  return {
    content: data.choices?.[0]?.message?.content?.trim() ?? "",
    model,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Local inference error ${response.status}: ${detail.slice(0, 200)}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}
