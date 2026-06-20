#!/usr/bin/env bash
# CurXor OS — Pre-stage VLA model weights for offline inference
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILLAR_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${PILLAR_DIR}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a; source "${PILLAR_DIR}/.env"; set +a
fi

HF_CACHE="${CURXOR_HF_CACHE_DIR:-/var/lib/curxor/huggingface}"
MODELS_DIR="${CURXOR_MODELS_DIR:-/var/lib/curxor/models}"
VLLM_MODEL="${VLLM_MODEL:-OpenVLA/openvla-7b}"
OLLAMA_VLA="${OLLAMA_VLA_MODEL:-moondream:1.8b}"

export HF_HOME="${HF_CACHE}"
export HF_HUB_DISABLE_TELEMETRY=1
export DO_NOT_TRACK=1

mkdir -p "${HF_CACHE}" "${MODELS_DIR}"

echo "==> CurXor VLA model staging (offline-capable)"
echo "    HuggingFace cache: ${HF_CACHE}"
echo "    Models dir       : ${MODELS_DIR}"

# ── HuggingFace VLA (for vLLM / custom pipelines) ───────────────────────────
stage_hf() {
  local repo="$1"
  echo "==> Staging HF model: ${repo}"
  docker run --rm \
    -e HF_HOME=/cache \
    -e HF_HUB_DISABLE_TELEMETRY=1 \
    -v "${HF_CACHE}:/cache" \
    -v "${MODELS_DIR}:/models" \
    python:3.12-slim \
    bash -c "pip install -q huggingface_hub && python3 -c \"
from huggingface_hub import snapshot_download
import os
repo = '${repo}'
dest = f'/models/{repo.split(chr(47))[-1]}'
os.makedirs(dest, exist_ok=True)
path = snapshot_download(repo_id=repo, local_dir=dest)
print('Staged at:', path)
\""
}

# ── Ollama VLA (vision-language for clawbot perception) ─────────────────────
stage_ollama() {
  if docker ps --format '{{.Names}}' | grep -q '^curxor-ollama$'; then
    echo "==> Pulling Ollama VLA: ${OLLAMA_VLA}"
    docker exec curxor-ollama ollama pull "${OLLAMA_VLA}"
    docker exec curxor-ollama ollama ps
  else
    echo "WARN: curxor-ollama not running. Start with: ./scripts/deploy.sh --pull-models"
  fi
}

case "${1:-all}" in
  hf|huggingface)
    stage_hf "${VLLM_MODEL}"
    ;;
  ollama)
    stage_ollama
    ;;
  all)
    stage_ollama
    stage_hf "${VLLM_MODEL}" || echo "WARN: HF staging skipped (optional for ollama-only)"
    ;;
  *)
    echo "Usage: $0 [all|ollama|hf]" >&2
    exit 1
    ;;
esac

echo "==> VLA staging complete."
