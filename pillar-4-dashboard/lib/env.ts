export interface DashboardEnv {
  meshBrokerIp: string;
  visionXpubPort: number;
  motorXpubPort: number;
  topicVision: string;
  topicMotor: string;
  topicDigitalIn: string;
  inferenceBackend: "ollama" | "vllm";
  inferenceBaseUrl: string;
  inferenceMetricsUrl: string;
  ollamaUrl: string;
  totalRamGb: number;
  gpuHeapGb: number;
}

function parseBackend(raw: string | undefined): "ollama" | "vllm" {
  return raw === "vllm" ? "vllm" : "ollama";
}

export function loadDashboardEnv(): DashboardEnv {
  const inferenceBackend = parseBackend(process.env.CURXOR_INFERENCE_BACKEND);
  const defaultInferenceBase =
    inferenceBackend === "vllm" ? "http://127.0.0.1:8000/v1" : "http://127.0.0.1:11434";

  return {
    meshBrokerIp: process.env.CURXOR_MESH_BROKER_IP ?? "10.77.0.1",
    visionXpubPort: int(process.env.CURXOR_VISION_XPUB_PORT, 9101),
    motorXpubPort: int(process.env.CURXOR_MOTOR_XPUB_PORT, 9201),
    topicVision: process.env.CURXOR_TOPIC_VISION ?? "telemetry/vision_in",
    topicMotor: process.env.CURXOR_TOPIC_MOTOR ?? "telemetry/motor_out",
    topicDigitalIn: process.env.CURXOR_TOPIC_DIGITAL_IN ?? "telemetry/digital_in",
    inferenceBackend,
    inferenceBaseUrl: (process.env.CURXOR_INFERENCE_BASE_URL ?? defaultInferenceBase).replace(/\/$/, ""),
    inferenceMetricsUrl: process.env.CURXOR_INFERENCE_METRICS_URL ?? "http://127.0.0.1:8000/metrics",
    ollamaUrl: (process.env.CURXOR_OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/$/, ""),
    totalRamGb: int(process.env.CURXOR_TOTAL_RAM_GB, 64),
    gpuHeapGb: int(process.env.CURXOR_GPU_HEAP_GB, 48),
  };
}

function int(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
