# PDF Export Guide

Generate printable PDFs from the CurXor OS markdown documentation.

## Output location

PDFs are written to **`docs/pdf/`** (gitignored). Source markdown stays in `docs/guides/`.

## Method A — bundled export script (recommended)

On a machine with **pandoc** and a PDF engine installed:

```bash
cd /opt/curxor   # or your repo root
chmod +x docs/scripts/export-guides-pdf.sh
./docs/scripts/export-guides-pdf.sh
```

Produces:

| PDF | Source |
|-----|--------|
| `docs/pdf/curxor-os-complete.pdf` | All guides merged |
| `docs/pdf/00-quick-start.pdf` … `12-digital-action-layer.pdf` | Individual guides |
| `docs/pdf/operator-quick-reference.pdf` | Operator card |

### Install dependencies (Ubuntu 24.04)

```bash
sudo apt-get update
sudo apt-get install -y pandoc texlive-xetex texlive-fonts-recommended
```

Alternative PDF engine (lighter):

```bash
sudo apt-get install -y pandoc wkhtmltopdf
# Script auto-detects wkhtmltopdf if xelatex unavailable
```

## Method B — single guide with pandoc

```bash
pandoc docs/guides/01-installation.md \
  -o docs/pdf/01-installation.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V mainfont="DejaVu Sans" \
  -V monofont="DejaVu Sans Mono" \
  --toc
```

## Method C — operator card (print-optimized)

The quick-reference card uses print CSS. Options:

**Browser print → PDF**

1. Open `docs/quick-reference/operator-card.md` in VS Code / Cursor preview, or render with any markdown viewer
2. Print → Save as PDF, margins **minimum**, background graphics **on**

**Pandoc**

```bash
pandoc docs/quick-reference/operator-card.md \
  -o docs/pdf/operator-quick-reference.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=0.5in \
  -V fontsize=9pt
```

## Method D — CI / release bundle

For release artifacts, merge guides + operator card:

```bash
./docs/scripts/export-guides-pdf.sh --release
# Creates docs/pdf/curxor-os-docs-{version}.tar.gz
```

## Styling notes

Default export uses:

- DejaVu fonts (available on Ubuntu, no cloud fetch)
- Table of contents on merged PDF
- Monospace for commands and paths

Custom CurXor branding (logo, purple accent) can be added with a pandoc template — place `docs/templates/curxor-pdf.tex` and pass `--template=docs/templates/curxor-pdf.tex`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `xelatex not found` | `sudo apt install texlive-xetex` or use `--pdf-engine=wkhtmltopdf` |
| Missing Unicode | Use xelatex, not pdflatex |
| `docs/pdf/` permission denied | `mkdir -p docs/pdf && chmod 755 docs/pdf` |
| Mermaid diagrams blank | Mermaid in `02-architecture.md` is ASCII in PDF; use HTML preview for diagram |

## Related

- [Operator Quick Reference](../quick-reference/operator-card.md)
- [Documentation index](../README.md)
