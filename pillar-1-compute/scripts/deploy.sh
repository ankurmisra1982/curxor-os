#!/usr/bin/env bash
# CurXor OS — Deploy local inference stack (Ollama or vLLM on ROCm/UMA)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILLAR_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PILLAR_DIR}"

BACKEND=""
PULL_MODELS=false
INIT_ONLY=false

usage() {
  cat <<'EOF'
Usage: deploy.sh [OPTIONS]

  --backend ollama|vllm   Inference runtime (default: from .env or ollama)
  --pull-models           Pull VLA weights after service start (ollama only)
  --init-only             Run model init sidecar without restarting services
  -h, --help              Show this help

Examples:
  ./scripts/deploy.sh
  ./scripts/deploy.sh --backend vllm
  ./scripts/deploy.sh --pull-models
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend) BACKEND="$2"; shift 2 ;;
    --pull-models) PULL_MODELS=true; shift ;;
    --init-only) INIT_ONLY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

# ── Load environment ────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi
# shellcheck disable=SC1091
set -a; source .env; set +a

BACKEND="${BACKEND:-${CURXOR_INFERENCE_BACKEND:-ollama}}"

echo "==> CurXor Pillar 1 deploy"
echo "    Backend : ${BACKEND}"
echo "    GFX     : ${CURXOR_GFX_VERSION:-11.5.1} (${CURXOR_ROCM_ARCH:-gfx1151})"
echo "    UMA     : ${CURXOR_TOTAL_RAM_GB:-64} GB total / ${CURXOR_GPU_HEAP_GB:-48} GB GPU heap"

# ── Preflight ───────────────────────────────────────────────────────────────
if [[ ! -e /dev/kfd ]]; then
  echo "ERROR: /dev/kfd not found. Run: sudo ./scripts/setup-rocm-host.sh" >&2
  exit 1
fi

mkdir -p "${CURXOR_MODELS_DIR:-/var/lib/curxor/models}" \
         "${CURXOR_OLLAMA_DIR:-/var/lib/curxor/ollama}" \
         "${CURXOR_HF_CACHE_DIR:-/var/lib/curxor/huggingface}"

# ── Pull images ─────────────────────────────────────────────────────────────
case "${BACKEND}" in
  ollama)
    PROFILE="ollama"
    echo "==> Pulling Ollama ROCm image..."
    docker compose pull ollama
    ;;
  vllm)
    PROFILE="vllm"
    echo "==> Pulling vLLM ROCm image (large — may take several minutes)..."
    docker compose pull vllm
    ;;
  *)
    echo "ERROR: Unknown backend '${BACKEND}'. Use ollama or vllm." >&2
    exit 1
    ;;
esac

# ── Stop opposing backend to free UMA heap ──────────────────────────────────
if [[ "${BACKEND}" == "ollama" ]]; then
  docker compose --profile vllm down 2>/dev/null || true
else
  docker compose --profile ollama down 2>/dev/null || true
fi

# ── Start services ──────────────────────────────────────────────────────────
if [[ "${INIT_ONLY}" == false ]]; then
  echo "==> Starting ${BACKEND}..."
  "${SCRIPT_DIR}/patch-compose-group-gids.sh"
  docker compose --profile "${PROFILE}" up -d
fi

# ── Model initialization ────────────────────────────────────────────────────
if [[ "${BACKEND}" == "ollama" && ( "${PULL_MODELS}" == true || "${INIT_ONLY}" == true ) ]]; then
  echo "==> Pulling VLA models into UMA-backed storage..."
  docker compose --profile ollama --profile init run --rm ollama-init
fi

if [[ "${BACKEND}" == "vllm" && "${PULL_MODELS}" == true ]]; then
  echo "==> Pre-staging HuggingFace VLA weights..."
  "${SCRIPT_DIR}/pull-vla-models.sh"
fi

# ── Status ──────────────────────────────────────────────────────────────────
echo ""
docker compose --profile "${PROFILE}" ps

cat <<EOF

==> CurXor inference online (${BACKEND})

  Ollama API : http://${CURXOR_BIND_ADDRESS:-127.0.0.1}:${OLLAMA_HOST_PORT:-11434}
  vLLM API   : http://${CURXOR_BIND_ADDRESS:-127.0.0.1}:${VLLM_HOST_PORT:-8000}/v1

  Verify GPU offload (ollama):
    docker exec curxor-ollama ollama ps

  Test generation (ollama):
    curl http://127.0.0.1:11434/api/generate -d '{"model":"${OLLAMA_VLA_MODEL:-moondream:1.8b}","prompt":"claw status","stream":false}'

  Test generation (vllm):
    curl http://127.0.0.1:8000/v1/models

EOF
