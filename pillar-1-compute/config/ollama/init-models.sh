#!/usr/bin/env bash
# CurXor — pull Ollama models into UMA-backed storage (ollama-init sidecar)
set -euo pipefail

echo "[curxor] Pulling VLA model: ${OLLAMA_VLA_MODEL}"
ollama pull "${OLLAMA_VLA_MODEL}"

if [[ -n "${OLLAMA_REASONING_MODEL:-}" ]]; then
  echo "[curxor] Pulling reasoning model: ${OLLAMA_REASONING_MODEL}"
  ollama pull "${OLLAMA_REASONING_MODEL}"
fi

if [[ -n "${OLLAMA_EXTRA_MODELS:-}" ]]; then
  IFS=',' read -ra EXTRA <<< "${OLLAMA_EXTRA_MODELS}"
  for m in "${EXTRA[@]}"; do
    m="${m#"${m%%[![:space:]]*}"}"
    m="${m%"${m##*[![:space:]]}"}"
    [[ -z "${m}" ]] && continue
    echo "[curxor] Pulling extra model: ${m}"
    ollama pull "${m}"
  done
fi

echo "[curxor] Warming VLA weights into UMA heap..."
ollama run "${OLLAMA_VLA_MODEL}" "ready" --verbose || true
ollama ps
