# shockproof-skills

> **A private Claude Code plugin marketplace for Shockproof AI presentation and training module generation.**

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

> **This is a private GitHub repository.** Teammates must be added as collaborators before they can install.

### Step 1 — Authenticate with GitHub

Auto-updates require a GitHub token so Claude Code can pull from the private repo in the background:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

Add this to your shell profile (`~/.zshrc` or `~/.bashrc`) to persist it.

### Step 2 — Add the marketplace in Claude Code

```
/plugin marketplace add shockproofai/shockproof-skills
```

Claude Code will fetch `.claude-plugin/marketplace.json` from the repo and register both plugins.

### Step 3 — Enable the plugins you want

After adding the marketplace, enable individual plugins via the Claude Code plugin UI, or run:

```
/plugin enable create-html-deck@shockproof-skills
/plugin enable convert-pdf-to-html-deck@shockproof-skills
```

### Auto-configure for your project (optional)

To pre-configure the marketplace for everyone working in a project, add this to `.claude/settings.json` in your repo:

```json
{
  "extraKnownMarketplaces": {
    "shockproof-skills": {
      "source": {
        "source": "github",
        "repo": "shockproofai/shockproof-skills"
      }
    }
  },
  "enabledPlugins": {
    "create-html-deck@shockproof-skills": true,
    "convert-pdf-to-html-deck@shockproof-skills": true
  }
}
```

With this in place, teammates only need to set `GITHUB_TOKEN` — the plugins are enabled automatically when they open the project.

---

## Keeping skills up to date

When updates are pushed to this repo, Claude Code will sync them automatically on startup (if `GITHUB_TOKEN` is set). To manually sync:

```
/plugin update shockproof-skills
```

---

## API Keys Required

| Key | Used by | How to set |
|-----|---------|-----------|
| `ANTHROPIC_API_KEY` | `convert-pdf-to-html-deck` | Export in shell or GCP Secret Manager |
| `NARAKEET_API_KEY` | Both skills (video generation) | Export in shell or GCP Secret Manager |

---

## Quick Start — Create a deck

Ask Claude Code: `"create a 6-slide training module on [topic]"`

See [`skills/create-html-deck/SKILL.md`](skills/create-html-deck/SKILL.md) and the [API reference](skills/create-html-deck/references/api_reference.md) for the full component API.

## Quick Start — Convert a PDF

```bash
cd skills/convert-pdf-to-html-deck

# Semantic mode (re-render with Shockproof AI brand)
node scripts/convert.js /path/to/presentation.pdf

# Lossless mode (keep PDF visuals, add narration + video)
node scripts/convert.js /path/to/presentation.pdf --lossless

# Skip video, custom output dir
node scripts/convert.js /path/to/presentation.pdf --no-video --output ./my-output
```

---

## Repository structure

```
shockproof-skills/
├── .claude-plugin/
│   └── marketplace.json            # Claude Code marketplace manifest
├── registry.json                   # Machine-readable skill catalog
├── registry.schema.json            # JSON Schema for registry entries
├── package.json                    # npm package + bin entry
├── index.js                        # Path helpers (rendererRoot etc.)
├── scripts/
│   └── install.js                  # Fallback install CLI (for non-plugin use)
├── skills/
│   ├── create-html-deck/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json         # Plugin manifest
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   └── api_reference.md
│   │   └── mnt/outputs/
│   ├── convert-pdf-to-html-deck/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json         # Plugin manifest
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
