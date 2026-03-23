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

### Required Environment Variables

| Variable | Required for | Notes |
|----------|-------------|-------|
| `RENDER_HTML_API_KEY` | PNG rendering (both modes) | API key for the `renderHtmlToPng` cloud function |
| `ANTHROPIC_API_KEY` | Narration + semantic mode | Claude API key (or set `CLAUDE_CODE_OAUTH_TOKEN`) |
| `GCS_SERVICE_ACCOUNT_KEY` | Lossless PDF upload | Base64-encoded GCP service account JSON key with Storage write access |
| `NARAKEET_API_KEY` | Video generation | Only needed if using `submitToNarakeet()` |

In Cowork/sandbox environments, set these as env vars. Locally with gcloud, `RENDER_HTML_API_KEY`, `ANTHROPIC_API_KEY`, and `NARAKEET_API_KEY` are auto-resolved from Secret Manager, and `GCS_SERVICE_ACCOUNT_KEY` is not needed (gcloud auth is used instead).

To generate `GCS_SERVICE_ACCOUNT_KEY`:
```bash
# Create service account and grant Storage access
gcloud iam service-accounts create skills-storage-upload --display-name="Skills Storage Upload" --project=shockproof-dev
gcloud projects add-iam-policy-binding shockproof-dev --member="serviceAccount:skills-storage-upload@shockproof-dev.iam.gserviceaccount.com" --role="roles/storage.objectCreator"

# Generate key and base64-encode it
gcloud iam service-accounts keys create /tmp/sa-key.json --iam-account=skills-storage-upload@shockproof-dev.iam.gserviceaccount.com
cat /tmp/sa-key.json | base64 | tr -d '\n'
# Copy the output as your GCS_SERVICE_ACCOUNT_KEY value, then delete the key file
rm /tmp/sa-key.json
```

### Lossless rasterisation approach
Lossless mode uploads the PDF to Firebase Storage and calls the `renderHtmlToPng` cloud function in PDF mode. The cloud function uses PDF.js + Puppeteer to render each page to a `<canvas>` at 1280×720 and returns base64 PNGs. No local Puppeteer or ImageMagick dependency is required.

### Semantic model limitation
Only `claude-haiku-4-5` reliably accepts PDF document blocks (base64 `application/pdf`) via the Anthropic API in this environment. `claude-sonnet-4-5` returns 400 errors for PDF document inputs. Use the default model or override with `--model claude-haiku-4-5` explicitly.

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

Note: `ANTHROPIC_API_KEY` is only required when a model other than the built-in Claude Code token is needed. In Claude Code sessions, `CLAUDE_CODE_OAUTH_TOKEN` is used automatically and only `claude-haiku-4-5` is guaranteed to be available. Set `ANTHROPIC_API_KEY` directly for access to Opus or Sonnet models.

## Output files

| File | Description |
|------|-------------|
| `slide_001.png` … | Slide images (lossless: from PDF; semantic: re-rendered HTML) |
| `slide-narration.json` | Per-slide narration text |
| `narakeet-script.md` | Narakeet video script |
| `narakeet.zip` | Compressed archive for Narakeet upload |
| `build_script_generated.js` | *(Semantic only)* Generated build script from Claude |
| `output.mp4` | Final narrated video |
