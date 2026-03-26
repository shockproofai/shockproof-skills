# pdf-lossless-deck

Convert a PDF presentation into a narrated training video, preserving the original slide visuals exactly.

## What it does

1. Rasterises each PDF page to a 1280px-wide PNG using `pdftoppm` (runs locally, no cloud calls)
2. Generates spoken narration for each slide using Claude (claude-sonnet-4-6)
3. Assembles a Narakeet script and ZIP archive
4. Submits to Narakeet to produce an MP4 video

## Prerequisites

**System dependency** — install poppler:
```bash
# macOS
brew install poppler

# Ubuntu / Debian
apt-get install poppler-utils
```

**Node.js** — v18 or later

**npm dependencies** — install once after placing the plugin:
```bash
npm install
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for narration |
| `NARAKEET_API_KEY` | For video | Narakeet API key (omit if using `--no-video`) |

In Claude Code sessions, `CLAUDE_CODE_OAUTH_TOKEN` is used automatically for `ANTHROPIC_API_KEY`.

## Usage

```bash
# Full conversion (PNGs → narration → video)
node scripts/convert.js input.pdf

# Skip video, stop at ZIP
node scripts/convert.js input.pdf --no-video

# Custom output directory
node scripts/convert.js input.pdf --output ./my-output

# With series metadata
node scripts/convert.js input.pdf \
  --series-title "Risk Training" \
  --module-num 2 \
  --total-modules 5 \
  --video-filename "risk-module-2.mp4"
```

## Output files

| File | Description |
|------|-------------|
| `slide_001.png` … | PDF pages rasterised at 1280×auto px |
| `slide-narration.json` | Per-slide narration text (JSON) |
| `narakeet-script.md` | Narakeet video script |
| `narakeet.zip` | Archive ready for Narakeet upload |
| `<pdf-name>.mp4` | Final narrated video |

Outputs default to `mnt/outputs/<pdf-basename>/`.

## Skill

Say **"convert this PDF to a video"** or **"run lossless conversion on [file]"** in Cowork to invoke the skill.
