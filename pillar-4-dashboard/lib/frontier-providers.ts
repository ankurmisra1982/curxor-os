export interface FrontierProvider {
  id: string;
  name: string;
  tagline: string;
  models: { id: string; label: string }[];
  connectUrl: string;
  purchaseUrl: string;
  docsUrl: string;
  supportsSubscriptionLogin: boolean;
}

export const FRONTIER_PROVIDERS: FrontierProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    tagline: "GPT-4o and reasoning models via your OpenAI account",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "o3-mini", label: "o3-mini" },
    ],
    connectUrl: "https://platform.openai.com/api-keys",
    purchaseUrl: "https://platform.openai.com/signup",
    docsUrl: "https://platform.openai.com/docs",
    supportsSubscriptionLogin: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    tagline: "Claude models via API key or Claude Pro/Max subscription",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    ],
    connectUrl: "https://console.anthropic.com/settings/keys",
    purchaseUrl: "https://console.anthropic.com/",
    docsUrl: "https://docs.anthropic.com/",
    supportsSubscriptionLogin: true,
  },
  {
    id: "google",
    name: "Google AI",
    tagline: "Gemini models via Google AI Studio or Cloud",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
    connectUrl: "https://aistudio.google.com/apikey",
    purchaseUrl: "https://aistudio.google.com/",
    docsUrl: "https://ai.google.dev/",
    supportsSubscriptionLogin: true,
  },
  {
    id: "cursor",
    name: "Cursor",
    tagline: "Use your existing Cursor subscription where supported",
    models: [{ id: "cursor-default", label: "Cursor agent model" }],
    connectUrl: "https://cursor.com/settings",
    purchaseUrl: "https://cursor.com/pricing",
    docsUrl: "https://cursor.com/docs",
    supportsSubscriptionLogin: true,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "One key for many frontier models — pay per use",
    models: [
      { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet (via OpenRouter)" },
      { id: "openai/gpt-4o", label: "GPT-4o (via OpenRouter)" },
    ],
    connectUrl: "https://openrouter.ai/keys",
    purchaseUrl: "https://openrouter.ai/",
    docsUrl: "https://openrouter.ai/docs",
    supportsSubscriptionLogin: false,
  },
];

export function getFrontierProvider(id: string): FrontierProvider | undefined {
  return FRONTIER_PROVIDERS.find((p) => p.id === id);
}

export function frontierApiBase(providerId: string): string {
  switch (providerId) {
    case "openai":
      return "https://api.openai.com/v1";
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "google":
      return "https://generativelanguage.googleapis.com/v1beta/openai";
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "cursor":
      return "https://api.cursor.com/v1";
    default:
      return "https://api.openai.com/v1";
  }
}
