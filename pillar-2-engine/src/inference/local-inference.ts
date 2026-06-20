/**
 * Unified local inference — Ollama (default) or vLLM OpenAI-compatible API.
 * Localhost only. Matches Pillar 1 compute profiles.
 */

import type { EngineConfig } from "../config/env.js";
import type { PhysicalToolDefinition } from "../../actions/physical/types.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ReasoningResult {
  content: string | null;
  toolCalls: ToolCall[];
}

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export class LocalInferenceClient {
  constructor(private readonly config: EngineConfig) {}

  async reason(messages: ChatMessage[], tools: PhysicalToolDefinition[]): Promise<ReasoningResult> {
    if (this.config.inferenceBackend === "ollama") {
      return this.reasonOllama(messages, tools);
    }
    return this.reasonVllm(messages, tools);
  }

  private async reasonVllm(messages: ChatMessage[], tools: PhysicalToolDefinition[]): Promise<ReasoningResult> {
    const body = {
      model: this.config.inferenceModel,
      messages,
      tools: mapTools(tools),
      tool_choice: "auto" as const,
      temperature: 0.1,
      stream: false,
    };

    const response = await this.fetchLocal(`${this.config.inferenceBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: OpenAiToolCall[] } }>;
    };
    const message = data.choices?.[0]?.message;
    return {
      content: message?.content ?? null,
      toolCalls: parseToolCalls(message?.tool_calls),
    };
  }

  private async reasonOllama(messages: ChatMessage[], tools: PhysicalToolDefinition[]): Promise<ReasoningResult> {
    const body = {
      model: this.config.inferenceModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: mapTools(tools),
      stream: false,
    };

    const response = await this.fetchLocal(`${this.config.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as {
      message?: { content?: string; tool_calls?: OpenAiToolCall[] };
    };
    return {
      content: data.message?.content ?? null,
      toolCalls: parseToolCalls(data.message?.tool_calls),
    };
  }

  private async fetchLocal(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.inferenceTimeoutMs);
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
}

function mapTools(tools: PhysicalToolDefinition[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));
}

function parseToolCalls(calls: OpenAiToolCall[] | undefined): ToolCall[] {
  return (calls ?? []).map((call) => ({
    id: call.id,
    name: call.function.name,
    arguments: safeParseJson(call.function.arguments),
  }));
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
