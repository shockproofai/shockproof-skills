# Contributing to Shockproof Skills

Thank you for contributing a skill! This guide covers everything needed to add a new skill to the marketplace.

---

## What is a skill?

A skill is a directory containing:

| File | Required | Purpose |
|------|----------|---------|
| `SKILL.md` | Yes | Claude Code skill definition with YAML frontmatter |
| `scripts/` | Conditional | Runtime scripts the skill needs (e.g. a `convert.js` CLI) |
| `references/` | No | Supporting reference documents, API docs, etc. |
| `skill.json` | Recommended | Machine-readable metadata (auto-generated from `registry.json`) |
| `mnt/outputs/.gitkeep` | Recommended | Default output directory placeholder |
| `package.json` | Conditional | Required only if the skill has its own npm dependencies |

---

## Directory structure

```
skills/
├── your-skill-name/
│   ├── SKILL.md               # Required — Claude Code skill definition
│   ├── references/            # Optional — reference docs
│   │   └── api_reference.md
│   ├── scripts/               # Optional — runtime scripts
│   │   └── run.js
│   ├── mnt/outputs/.gitkeep   # Optional — default output dir
│   └── package.json           # Optional — skill-specific npm deps
└── shared/
    └── html-slide-renderer/   # Shared rendering engine (do not modify)
```

---

## SKILL.md frontmatter

Every `SKILL.md` must start with YAML frontmatter:

```yaml
---
name: your-skill-name
description: >
  One or two sentences describing what this skill does and when Claude should
  use it. Include trigger phrases. This is used for skill discovery.
user-invocable: true   # or false — can the user invoke it via /your-skill-name?
---
```

---

## Steps to add a new skill

### 1. Create the skill directory

```bash
mkdir -p skills/your-skill-name/mnt/outputs
touch skills/your-skill-name/mnt/outputs/.gitkeep
```

### 2. Write `SKILL.md`

Follow the frontmatter format above. Structure the body as:

- **Quick start** — minimal working example
- **Parameters / options** — what inputs the skill accepts
- **Patterns** — common usage patterns
- **File references** — key files the skill touches
- **Checklist** — what to verify before finishing

### 3. Add an entry to `registry.json`

```json
{
  "id": "your-skill-name",
  "version": "1.0.0",
  "name": "Your Skill Name",
  "description": "One sentence description for the catalog.",
  "tags": ["tag1", "tag2"],
  "author": "your-github-username",
  "path": "skills/your-skill-name",
  "skillmd": "skills/your-skill-name/SKILL.md",
  "userInvocable": true,
  "shared": [],
  "dependencies": {
    "npm": [],
    "shared": [],
    "env": []
  },
  "updatedAt": "YYYY-MM-DD"
}
```

### 4. Update `claude-plugin.json`

Add a corresponding entry to the `skills` array:

```json
{
  "id": "your-skill-name",
  "name": "Your Skill Name",
  "path": "skills/your-skill-name",
  "skillmd": "skills/your-skill-name/SKILL.md",
  "description": "One sentence description.",
  "userInvocable": true
}
```

### 5. Open a pull request

- Title: `feat(skill): add your-skill-name`
- Description: What the skill does, what problem it solves, and any dependencies it requires
- Include a test showing the skill being invoked

---

## Using the shared html-slide-renderer

If your skill renders HTML slides or produces PDFs, reuse the shared renderer rather than duplicating it:

```js
const path = require('path');
// Resolve renderer root relative to your skill:
const RENDERER_ROOT = path.join(__dirname, '../../shared/html-slide-renderer');
const tpl = require(`${RENDERER_ROOT}/scripts/sai_html_template.js`)({ seriesTitle, totalModules });
```

Add `"html-slide-renderer"` to your skill's `"shared"` array in `registry.json` so the installer copies it alongside your skill.

---

## Versioning

- Follow [semver](https://semver.org/) for skill versions.
- Bump the version in `registry.json` and `claude-plugin.json` whenever the skill's behavior changes.
- Breaking changes must increment the major version.

---

## Code style

- Use CommonJS (`require`/`module.exports`) — the shared renderer and install CLI are CommonJS.
- No TypeScript in skill scripts (keep runtime dependencies minimal).
- No hardcoded absolute paths — always resolve paths relative to `__dirname`.
