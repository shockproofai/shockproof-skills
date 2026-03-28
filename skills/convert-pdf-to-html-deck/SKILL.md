# convert-pdf-to-html-deck

Convert an existing PDF presentation into a narrated Shockproof AI training video.

## Two modes

### Lossless mode (`--lossless`)
Keeps the original PDF page visuals as PNGs. Adds AI-generated narration and submits to Narakeet for video.
Best when: you want fast conversion without changing the visual appearance.

### Semantic mode (default)
Claude analyzes the PDF content and generates a new build script using sai_html_template.js components.
Re-renders every slide with the Shockproof AI brand. Narration is written from the re-rendered component content.
Best when: you want Shockproof AI styling, editable slides, and full component-model output.

## Quick start

```bash
# Semantic mode (re-render with HTML components)
node scripts/convert.js input.pdf

# Lossless mode (keep PDF visuals, add narration + video)
node scripts/convert.js input.pdf --lossless

# Skip video, output to custom dir
node scripts/convert.js input.pdf --no-video --output ./my-output
```

## CLI reference

```
node scripts/convert.js <pdf-path> [options]

  --lossless              Keep original PDF page PNGs
  --no-video              Skip Narakeet submission
  --output <dir>          Output directory (default: mnt/outputs/<pdf-name>/)
  --series-title "X"      Series title
  --module-num N          Module number (default: 1)
  --total-modules N       Total modules in series (default: 1)
  --video-filename X      Output MP4 filename
```

## Dependencies

| Dependency | Used for |
|-----------|---------|
| `@anthropic-ai/sdk` | Narration generation + semantic component mapping |
| `pdf-parse` | Per-page text extraction from PDF |
| `pdfjs-dist` | Per-page text extraction (semantic mode) |
| `shared/html-slide-renderer` | HTML rendering, cloud function PNG screenshots, Narakeet submission |
| `archiver` (from shared renderer) | ZIP creation for Narakeet upload |
| `pdftoppm` (system, poppler-utils) | **Lossless mode only** — local PDF rasterisation, no cloud call needed |

### System dependency (lossless mode)

`pdftoppm` must be installed locally:
```bash
# macOS
brew install poppler

# Ubuntu / Debian
apt-get install poppler-utils
```

### Required Environment Variables

| Variable | Required for | Notes |
|----------|-------------|-------|
| `RENDER_HTML_API_KEY` | PNG rendering (semantic mode only) | API key for the `renderHtmlToPng` cloud function |
| `ANTHROPIC_API_KEY` | Narration + semantic mode | Claude API key (or set `CLAUDE_CODE_OAUTH_TOKEN`) |
| `NARAKEET_API_KEY` | Video generation | Only needed if using `submitToNarakeet()` |

`GCS_SERVICE_ACCOUNT_KEY` is **no longer required** for lossless mode. Lossless rasterisation runs fully locally via `pdftoppm`.

See [SETUP.md](../SETUP.md) for how to generate these values and for local development notes.

### Lossless rasterisation approach
Lossless mode runs `pdftoppm` locally to rasterise each PDF page to a 1280px-wide PNG (height follows the slide's native aspect ratio — a 16:9 deck produces 1280×720 PNGs). This is a single local process with no network round-trips, no Firebase Storage upload, and no cloud function invocation, making it significantly faster than the previous PDF.js + cloud-function approach.

### Model usage by mode

| Mode | Model | Reason |
|------|-------|--------|
| Lossless narration | `claude-sonnet-4-6` | Plain text input |
| Semantic | `claude-sonnet-4-6` | All steps: build script generation, auto-fix, layout fix, visual overflow check |

## Shared renderer

This skill uses the renderer from:
```
skills/shared/html-slide-renderer/scripts/sai_html_template.js
```

Do NOT duplicate renderer code here. All slide rendering and Narakeet submission goes through the shared renderer.

## API key requirements

| Key | Used for |
|-----|---------|
| `ANTHROPIC_API_KEY` | All Claude API calls (narration + semantic mapping) |
| `NARAKEET_API_KEY` | Video generation |

Resolved via (in order): env var → `CLAUDE_CODE_OAUTH_TOKEN` (Claude Code sessions) → gcloud CLI → Google Secret Manager.

Note: `ANTHROPIC_API_KEY` must be set — all steps use `claude-sonnet-4-6`. The `CLAUDE_CODE_OAUTH_TOKEN` fallback only guarantees access to Haiku and will cause 400 errors for Sonnet calls.

## Output files

| File | Description |
|------|-------------|
| `slide_001.png` … | Slide images (lossless: from PDF; semantic: re-rendered HTML) |
| `slide-narration.json` | Per-slide narration text |
| `narakeet-script.md` | Narakeet video script |
| `narakeet.zip` | Compressed archive for Narakeet upload |
| `build_script_generated.js` | *(Semantic only)* Generated build script from Claude |
| `output.mp4` | Final narrated video |
