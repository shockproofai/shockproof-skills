---
name: convert-pdf-lossless
description: >
  Converts a PDF presentation to a narrated training video using lossless mode.
  Triggered by phrases like "convert this PDF to a video", "make a narrated video from PDF",
  "run lossless conversion on", "convert PDF lossless", "generate narration for PDF",
  "convert PDF to Narakeet video". Keeps original PDF page visuals as PNGs, generates
  AI narration using Claude, and submits to Narakeet for video production.
tools: [Bash, Read, Write]
---

Convert a PDF presentation to a narrated video. Original PDF visuals are preserved exactly — no re-rendering. Claude generates spoken narration for each slide, then the result is submitted to Narakeet to produce an MP4.

## How to run

1. Confirm the PDF path with the user if not already specified.
2. Check system dependencies:
   ```bash
   which pdftoppm || echo "MISSING: install poppler (brew install poppler)"
   node --version
   ```
3. Check environment variables are set:
   - `ANTHROPIC_API_KEY` — for narration generation
   - `NARAKEET_API_KEY` — for video production (not required if using `--no-video`)
4. Install npm dependencies if `node_modules` is missing:
   ```bash
   cd <plugin-root> && npm install
   ```
5. Run the conversion:
   ```bash
   node <plugin-root>/scripts/convert.js "<pdf-path>"
   ```
   Common options:
   ```bash
   # Skip video, just produce PNGs + narration + ZIP
   node scripts/convert.js input.pdf --no-video

   # Custom output directory
   node scripts/convert.js input.pdf --output ./my-output

   # With series metadata
   node scripts/convert.js input.pdf --series-title "Risk Training" --module-num 2 --total-modules 5
   ```
6. Report the output location and timing table to the user when complete.

## Output files

| File | Description |
|------|-------------|
| `slide_001.png` … | Original PDF pages rasterised at 1280px wide |
| `slide-narration.json` | Per-slide narration text |
| `narakeet-script.md` | Narakeet video script |
| `narakeet.zip` | Archive for Narakeet upload |
| `<pdf-name>.mp4` | Final narrated video (if video not skipped) |

## System dependency

`pdftoppm` (from poppler-utils) must be installed:
```bash
# macOS
brew install poppler

# Ubuntu / Debian
apt-get install poppler-utils
```

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for narration generation |
| `NARAKEET_API_KEY` | Only for video | Narakeet API key; skip with `--no-video` |

In Claude Code sessions, `CLAUDE_CODE_OAUTH_TOKEN` is used automatically for `ANTHROPIC_API_KEY` if the env var is not set.
