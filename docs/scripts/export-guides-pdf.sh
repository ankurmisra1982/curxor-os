#!/usr/bin/env bash
# CurXor OS — export markdown guides to PDF (requires pandoc + PDF engine)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GUIDES="${ROOT}/docs/guides"
QUICKREF="${ROOT}/docs/quick-reference"
OUT="${ROOT}/docs/pdf"
MERGED="${OUT}/curxor-os-complete.md"
RELEASE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release) RELEASE=1 ;;
    -h|--help)
      echo "Usage: $0 [--release]"
      echo "  Exports docs/guides/*.md and operator card to docs/pdf/"
      exit 0
      ;;
  esac
  shift
done

if ! command -v pandoc &>/dev/null; then
  echo "ERROR: pandoc not found. Install: sudo apt install pandoc texlive-xetex" >&2
  exit 1
fi

PDF_ENGINE="xelatex"
if ! command -v xelatex &>/dev/null; then
  if command -v wkhtmltopdf &>/dev/null; then
    PDF_ENGINE="wkhtmltopdf"
    echo "NOTE: xelatex not found — using wkhtmltopdf"
  else
    echo "ERROR: need xelatex or wkhtmltopdf" >&2
    exit 1
  fi
fi

mkdir -p "${OUT}"

PANDOC_PDF=(
  --pdf-engine="${PDF_ENGINE}"
  -V geometry:margin=1in
  -V mainfont="DejaVu Sans"
  -V monofont="DejaVu Sans Mono"
)

export_one() {
  local src="$1"
  local base
  base="$(basename "${src}" .md)"
  local dest="${OUT}/${base}.pdf"
  echo "==> ${base}.pdf"
  pandoc "${src}" -o "${dest}" "${PANDOC_PDF[@]}"
}

# Individual guides
for guide in "${GUIDES}"/*.md; do
  [[ -f "${guide}" ]] || continue
  export_one "${guide}"
done

# Operator card (tighter margins)
if [[ -f "${QUICKREF}/operator-card.md" ]]; then
  echo "==> operator-quick-reference.pdf"
  pandoc "${QUICKREF}/operator-card.md" \
    -o "${OUT}/operator-quick-reference.pdf" \
    --pdf-engine="${PDF_ENGINE}" \
    -V geometry:margin=0.5in \
    -V fontsize=9pt \
    -V mainfont="DejaVu Sans" \
    -V monofont="DejaVu Sans Mono"
fi

# Merged complete document
echo "==> Merging guides → curxor-os-complete.pdf"
{
  echo "# CurXor OS — Complete Documentation"
  echo ""
  echo "Generated: $(date -Iseconds)"
  echo ""
  for guide in "${GUIDES}"/*.md; do
    [[ -f "${guide}" ]] || continue
    echo ""
    cat "${guide}"
    echo ""
    echo "\\newpage"
    echo ""
  done
  if [[ -f "${QUICKREF}/operator-card.md" ]]; then
    cat "${QUICKREF}/operator-card.md"
  fi
} > "${MERGED}"

pandoc "${MERGED}" -o "${OUT}/curxor-os-complete.pdf" "${PANDOC_PDF[@]}" --toc
rm -f "${MERGED}"

echo ""
echo "==> PDF export complete: ${OUT}/"

if [[ "${RELEASE}" -eq 1 ]]; then
  VERSION="$(jq -r .version "${ROOT}/version.json" 2>/dev/null || echo "dev")"
  ARCHIVE="${OUT}/curxor-os-docs-${VERSION}.tar.gz"
  tar -czf "${ARCHIVE}" -C "${OUT}" .
  echo "==> Release bundle: ${ARCHIVE}"
fi
