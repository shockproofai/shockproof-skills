# shockproof-skills

> **A marketplace of Claude Code skills for Shockproof AI presentation and training module generation.**

---

## Skill Catalog

| Skill | Description | User-invocable |
|-------|-------------|---------------|
| [`create-html-deck`](#create-html-deck) | Generate branded training decks as PNG slides or PDF | Yes (`/create-html-deck`) |
| [`convert-pdf-to-html-deck`](#convert-pdf-to-html-deck) | Convert any PDF into a narrated training video | No |

---

## Skills

### `create-html-deck`

Generate professional training module presentations with Shockproof AI branding.

- Flow-based layout API — no manual coordinates
- HTML/CSS + Puppeteer → PNG slides → PDF
- Slide narration JSON + Narakeet video script auto-generated
- Narakeet video submission built-in

**Skill file:** [`skills/create-html-deck/SKILL.md`](skills/create-html-deck/SKILL.md)
**API reference:** [`skills/create-html-deck/references/api_reference.md`](skills/create-html-deck/references/api_reference.md)

---

### `convert-pdf-to-html-deck`

Convert an existing PDF presentation into a narrated Shockproof AI training video.

| Mode | Description |
|------|-------------|
| **Lossless** (`--lossless`) | Keeps original PDF page visuals, adds AI narration + video |
| **Semantic** (default) | Claude re-renders every slide with Shockproof AI components |

**Skill file:** [`skills/convert-pdf-to-html-deck/SKILL.md`](skills/convert-pdf-to-html-deck/SKILL.md)

---

## Installation

### Option A — Install a single skill via npx

```bash
# List available skills
npx @shockproofai/shockproof-skills list

# Install a skill into the nearest .claude/skills/ directory
npx @shockproofai/shockproof-skills install create-html-deck
npx @shockproofai/shockproof-skills install convert-pdf-to-html-deck

# Install to a custom path
npx @shockproofai/shockproof-skills install create-html-deck --target ./my-project/.claude/skills
```

The installer copies the skill directory (and shared dependencies) into `.claude/skills/shockproof-skills/` and prints the `CLAUDE.md` registration snippet.

### Option B — Clone the full repo

```bash
cd /path/to/your/project/.claude/skills
git clone https://github.com/shockproofai/shockproof-skills.git
```

Register skills in your project's `CLAUDE.md`:

```markdown
- [create-html-deck](.claude/skills/shockproof-skills/skills/create-html-deck/SKILL.md) — Generate Shockproof AI training decks
- [convert-pdf-to-html-deck](.claude/skills/shockproof-skills/skills/convert-pdf-to-html-deck/SKILL.md) — Convert PDFs to training videos
```

### Option C — npm package (for build scripts)

```bash
npm install @shockproofai/shockproof-skills
```

Resolve the shared renderer path in build scripts:

```js
const { rendererRoot } = require('@shockproofai/shockproof-skills');
const tpl = require(`${rendererRoot}/scripts/sai_html_template.js`)({
  seriesTitle: 'My Series',
  totalModules: 6,
});
```

---

## Setup after installation

### Install shared renderer dependencies

```bash
cd .claude/skills/shockproof-skills/shared/html-slide-renderer
npm install
```

### For convert-pdf-to-html-deck only

```bash
cd .claude/skills/shockproof-skills/convert-pdf-to-html-deck
npm install
```

---

## API Keys Required

| Key | Used by | How to set |
|-----|---------|-----------|
| `ANTHROPIC_API_KEY` | `convert-pdf-to-html-deck` | Export in shell or set in `.env` |
| `NARAKEET_API_KEY` | Both skills (video generation) | Export in shell or GCP Secret Manager |

Both keys can be resolved from Google Cloud Secret Manager automatically if `gcloud` is configured.

---

## Quick Start — Create a deck

```bash
# Claude will generate a build script and run it
# Just ask Claude Code: "create a 6-slide training module on topic X"
```

See [`skills/create-html-deck/SKILL.md`](skills/create-html-deck/SKILL.md) and the [API reference](skills/create-html-deck/references/api_reference.md) for the full component API.

## Quick Start — Convert a PDF

```bash
cd .claude/skills/shockproof-skills/convert-pdf-to-html-deck

# Semantic mode (re-render with Shockproof AI brand)
node scripts/convert.js /path/to/presentation.pdf

# Lossless mode (keep PDF visuals, add narration + video)
node scripts/convert.js /path/to/presentation.pdf --lossless

# Skip video, custom output dir
node scripts/convert.js /path/to/presentation.pdf --no-video --output ./my-output
```

---

## Marketplace files

| File | Purpose |
|------|---------|
| [`registry.json`](registry.json) | Machine-readable skill catalog (source of truth) |
| [`registry.schema.json`](registry.schema.json) | JSON Schema for validating skill registry entries |
| [`claude-plugin.json`](claude-plugin.json) | Claude Code plugin manifest |
| [`scripts/install.js`](scripts/install.js) | npx install CLI |
| [`index.js`](index.js) | npm path helpers (`rendererRoot`, etc.) |

---

## Repository structure

```
shockproof-skills/
├── registry.json                   # Skill catalog
├── registry.schema.json            # JSON Schema for registry entries
├── claude-plugin.json              # Claude Code plugin manifest
├── package.json                    # npm package + bin entry
├── index.js                        # Path helpers
├── scripts/
│   └── install.js                  # npx install CLI
├── skills/
│   ├── create-html-deck/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   └── api_reference.md
│   │   └── mnt/outputs/
│   ├── convert-pdf-to-html-deck/
│   │   ├── SKILL.md
│   │   ├── package.json
│   │   ├── scripts/
│   │   │   ├── convert.js
│   │   │   ├── lossless_convert.js
│   │   │   ├── semantic_convert.js
│   │   │   ├── extract_pages.js
│   │   │   └── resolve_api_key.js
│   │   └── mnt/outputs/
│   └── shared/
│       └── html-slide-renderer/    # Shared rendering engine
│           ├── package.json
│           ├── assets/
│           └── scripts/
└── CONTRIBUTING.md
```

---

## Contributing

Want to add a skill to the marketplace? See [CONTRIBUTING.md](CONTRIBUTING.md).
