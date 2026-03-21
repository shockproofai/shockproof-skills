# shockproof-skills

Claude Code skills for generating and converting Shockproof AI branded training presentations.

## Skills

### `create-html-deck`

Generate professional training module presentations with Shockproof AI branding.

- Flow-based layout API — no manual coordinates
- HTML/CSS + Puppeteer → PNG slides → PDF
- Slide narration JSON + Narakeet video script auto-generated
- Narakeet video submission built-in

### `convert-pdf-to-html-deck`

Convert any existing PDF presentation into a narrated Shockproof AI training video.

**Lossless mode** — keeps original PDF page visuals, adds AI narration + video
**Semantic mode** — Claude re-renders every slide with Shockproof AI components

## Installation

### Option A — Clone into `.claude/skills/`

```bash
cd /path/to/your/project/.claude/skills
git clone https://github.com/shockproofai/shockproof-skills.git
```

Then register the skills in your project's `CLAUDE.md`:
```
- [create-html-deck](.claude/skills/shockproof-skills/skills/create-html-deck/SKILL.md)
- [convert-pdf-to-html-deck](.claude/skills/shockproof-skills/skills/convert-pdf-to-html-deck/SKILL.md)
```

### Option B — Install via npm

```bash
npm install @shockproofai/shockproof-skills
```

Then in build scripts, resolve paths via the package:

```js
const { rendererRoot } = require('@shockproofai/shockproof-skills');
const tpl = require(`${rendererRoot}/scripts/sai_html_template.js`)({
  seriesTitle: 'My Series',
  totalModules: 6,
});
```

## Setup — Install renderer dependencies

```bash
cd skills/shared/html-slide-renderer
npm install

# For convert-pdf-to-html-deck:
cd ../../convert-pdf-to-html-deck
npm install
```

## API Keys Required

| Key | Used for |
|-----|---------|
| `ANTHROPIC_API_KEY` | Claude API calls (narration + semantic PDF analysis) |
| `NARAKEET_API_KEY` | Video generation via Narakeet |

Both keys can be resolved from Google Cloud Secret Manager automatically if you have `gcloud` configured.

## Quick Start — Create a deck

```bash
cd skills/create-html-deck
node my_build_script.js
```

See `skills/create-html-deck/SKILL.md` and `references/api_reference.md` for the full component API.

## Quick Start — Convert a PDF

```bash
cd skills/convert-pdf-to-html-deck
npm install

# Semantic mode (re-render with Shockproof AI brand)
node scripts/convert.js /path/to/presentation.pdf

# Lossless mode (keep PDF visuals, add narration + video)
node scripts/convert.js /path/to/presentation.pdf --lossless

# Skip video
node scripts/convert.js /path/to/presentation.pdf --no-video
```

## Structure

```
shockproof-skills/
├── claude-plugin.json              # Claude Code plugin manifest
├── package.json                    # npm package (exports rendererRoot etc.)
├── index.js                        # Path helpers
├── skills/
│   ├── create-html-deck/           # Deck creation skill
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   └── api_reference.md   # Full component API reference
│   │   └── mnt/outputs/           # Default output directory
│   ├── convert-pdf-to-html-deck/   # PDF conversion skill
│   │   ├── SKILL.md
│   │   ├── package.json
│   │   ├── scripts/
│   │   │   ├── convert.js         # CLI entry point
│   │   │   ├── lossless_convert.js
│   │   │   ├── semantic_convert.js
│   │   │   ├── extract_pages.js
│   │   │   └── resolve_api_key.js
│   │   └── mnt/outputs/
│   └── shared/
│       └── html-slide-renderer/   # Shared rendering engine
│           ├── package.json       # puppeteer, pdf-lib, archiver, axios
│           ├── assets/
│           │   ├── shockproof_logo.png
│           │   └── shockproof_logo_white.png
│           └── scripts/
│               ├── sai_html_template.js   # Main template factory
│               ├── constants.js
│               ├── utils.js
│               ├── base_styles.js
│               ├── presentation.js
│               └── components/
│                   ├── cards.js
│                   ├── chrome.js
│                   ├── content.js
│                   ├── layout_helpers.js
│                   ├── slide_layouts.js
│                   ├── structured.js
│                   └── takeaways.js
```
