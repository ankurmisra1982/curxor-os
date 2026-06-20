export type InferenceBackend = "ollama" | "vllm";

export interface EngineConfig {
  inferenceBackend: InferenceBackend;
  inferenceBaseUrl: string;
  ollamaUrl: string;
  inferenceModel: string;
  inferenceTimeoutMs: number;
  minReasonIntervalMs: number;
  meshBrokerIp: string;
  visionXpubPort: number;
  motorXsubPort: number;
  topicVision: string;
  topicMotor: string;
  topicDigitalOut: string;
  clawId: number;
  loopIntervalMs: number;
  systemPrompt: string;
}

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function int(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new Error(`Invalid integer for ${key}: ${raw}`);
  return parsed;
}

function parseBackend(raw: string | undefined): InferenceBackend {
  if (raw === "vllm") return "vllm";
  return "ollama";
}

export function loadConfig(): EngineConfig {
  const inferenceBackend = parseBackend(process.env.CURXOR_INFERENCE_BACKEND);
  const inferenceBaseUrl = required(
    "CURXOR_INFERENCE_BASE_URL",
    inferenceBackend === "vllm" ? "http://127.0.0.1:8000/v1" : "http://127.0.0.1:11434",
  );
  const ollamaUrl = required("CURXOR_OLLAMA_URL", "http://127.0.0.1:11434").replace(/\/$/, "");

  for (const url of [inferenceBaseUrl, ollamaUrl]) {
    if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
      throw new Error(`Cloud inference blocked: URL must be localhost (got ${url})`);
    }
  }

  const defaultModel =
    inferenceBackend === "vllm" ? "OpenVLA/openvla-7b" : "qwen2.5:7b-instruct-q4_K_M";

  return {
    inferenceBackend,
    inferenceBaseUrl: inferenceBaseUrl.replace(/\/$/, ""),
    ollamaUrl,
    inferenceModel: required("CURXOR_INFERENCE_MODEL", defaultModel),
    inferenceTimeoutMs: int("CURXOR_INFERENCE_TIMEOUT_MS", 30_000),
    minReasonIntervalMs: int("CURXOR_MIN_REASON_INTERVAL_MS", 500),
    meshBrokerIp: required("CURXOR_MESH_BROKER_IP", "10.77.0.1"),
    visionXpubPort: int("CURXOR_VISION_XPUB_PORT", 9101),
    motorXsubPort: int("CURXOR_MOTOR_XSUB_PORT", 9200),
    topicVision: required("CURXOR_TOPIC_VISION", "telemetry/vision_in"),
    topicMotor: required("CURXOR_TOPIC_MOTOR", "telemetry/motor_out"),
    topicDigitalOut: required("CURXOR_TOPIC_DIGITAL_OUT", "telemetry/digital_out"),
    clawId: int("CURXOR_CLAW_ID", 1),
    loopIntervalMs: int("CURXOR_LOOP_INTERVAL_MS", 50),
    systemPrompt: required(
      "CURXOR_AGENT_SYSTEM_PROMPT",
      "You are CurXor, a sovereign edge agent controlling a physical claw bot. Output only physical motor actions.",
    ),
  };
}
