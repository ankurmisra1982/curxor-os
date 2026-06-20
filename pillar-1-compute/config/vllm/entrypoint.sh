#!/usr/bin/env bash
# CurXor OS — vLLM container entrypoint (gfx1151 / UMA-tuned)
set -euo pipefail

MODEL="${VLLM_MODEL:-OpenVLA/openvla-7b}"
MAX_LEN="${VLLM_MAX_MODEL_LEN:-4096}"
GPU_UTIL="${VLLM_GPU_MEMORY_UTILIZATION:-0.88}"
MAX_SEQS="${VLLM_MAX_NUM_SEQS:-4}"
DTYPE="${VLLM_DTYPE:-auto}"
TRUST="${VLLM_TRUST_REMOTE_CODE:-true}"

# Install amdsmi if missing (required for ROCm platform detection in vLLM)
if ! python3 -c "import amdsmi" 2>/dev/null; then
  echo "[curxor-vllm] Installing amdsmi for gfx1151 detection..."
  pip install --quiet amdsmi 2>/dev/null || pip install --quiet amd-smi 2>/dev/null || true
fi

ARGS=(
  serve "${MODEL}"
  --host 0.0.0.0
  --port 8000
  --max-model-len "${MAX_LEN}"
  --gpu-memory-utilization "${GPU_UTIL}"
  --max-num-seqs "${MAX_SEQS}"
  --dtype "${DTYPE}"
  --enforce-eager
  --disable-log-requests
)

if [[ "${TRUST}" == "true" ]]; then
  ARGS+=(--trust-remote-code)
fi

# Serve local path if model was pre-staged under /models
if [[ -d "/models/${MODEL}" ]]; then
  ARGS[1]="/models/${MODEL}"
elif [[ -d "/models/$(basename "${MODEL}")" ]]; then
  ARGS[1]="/models/$(basename "${MODEL}")"
fi

echo "[curxor-vllm] Starting vLLM on gfx1151 (UMA) with: ${ARGS[*]}"
exec vllm "${ARGS[@]}"
