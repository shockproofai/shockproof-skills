---
name: create-html-deck
description: >
  Generate Shockproof AI branded training presentation modules as a folder of PNG slide images,
  with optional PDF assembly. Slides are defined as a DeckSpecification JSON, interpreted into
  HTML/CSS with flexbox, grid, and dynamic font sizing, then rendered to PNG via a cloud function.
  Use this skill whenever the user asks for a Shockproof AI presentation, training module, or
  course deck as images or a PDF.
  Triggers on: "create a module", "build a presentation", "training deck", "Shockproof deck",
  "SAI slides", "HTML deck", or any request for a branded training presentation.
  The user specifies the number of slides.
  The output is a folder of numbered PNG files; a combined PDF can be assembled on request.

user-invocable: true
---

# Shockproof AI HTML Deck Builder

This skill generates professional training module PDFs with Shockproof AI branding. You generate a **DeckSpecification JSON**, which is interpreted by `@shockproof/deck-builder` into HTML slides, rendered to PNGs via a cloud function, and assembled into PDF.

## Layout Model

Components auto-stack in a flexbox column between header and footer. **No manual coordinates needed.**

| Feature | How It Works |
|---------|-------------|
| Layout model | Flow-based flexbox auto-stacking |
| Text wrapping | Native CSS word-wrap and line-clamp |
| Component placement | Auto-stacked in flex column; vertically centered |
| Multi-column layouts | `row` component with `cardHtml`/`tableHtml` children |
| Rendering | HTML/CSS → cloud function (`renderHtmlToPng`) → PNG |
| PDF assembly | `pdf-lib` via `@shockproof/deck-builder` |

## Required Environment Variables

| Variable | Required for | Notes |
|----------|-------------|-------|
| `RENDER_HTML_API_KEY` | PNG rendering | API key for the `renderHtmlToPng` cloud function |
| `NARAKEET_API_KEY` | Video generation | Only needed if generating video |

See [SETUP.md](../SETUP.md) for how to generate these values and for local development notes.

## Before You Start

1. Read `references/api_reference.md` for the complete JSON schema reference.
2. The DeckSpecification is processed by `@shockproof/deck-builder` (monorepo: `packages/deck-builder/`).

> **Text wrapping is fully automatic.** CSS handles all word-wrap, line-clamp, and overflow. You never need to manually break strings or calculate positions.

## What You Need From the User

Confirm before generating:
- **Series title** (e.g., "Asset-Based Lending Mastery")
- **Total modules in series** (e.g., 6)
- **Module number** within the series
- **Module title** (e.g., "Interviewing CRE Borrowers")
- **Topic/subject matter** for the content
- **Case study requirements** (3 per module; varied outcomes: Approved, Approved with Conditions, Declined)
- **Output filename** convention: `{Series}_Module_{N}_{ShortName}.pdf`
- **Next module info** for the closing slide (or omit if last module)

## DeckSpecification JSON Structure

Generate a JSON file matching this structure. The full schema is in `references/api_reference.md`.

```json
{
  "config": {
    "seriesTitle": "Asset-Based Lending Mastery",
    "totalModules": 6
  },
  "slides": [
    {
      "type": "title",
      "moduleNum": 1,
      "title": "Inventory Financing Fundamentals",
      "subtitle": "Understanding Collateral Valuation",
      "totalPages": 40,
      "narration": "Welcome to Module 1 of the Asset-Based Lending Mastery series."
    },
    {
      "type": "content",
      "chrome": {
        "title": "Learning Objectives",
        "moduleNum": 1,
        "moduleTitle": "Inventory Financing Fundamentals",
        "pageNum": 2,
        "totalPages": 40
      },
      "components": [
        {
          "type": "row",
          "children": [
            { "type": "cardHtml", "accent": "#1A4FE8", "title": "Objective 1", "body": "Identify eligible inventory types" },
            { "type": "cardHtml", "accent": "#2E7D32", "title": "Objective 2", "body": "Calculate advance rates" }
          ]
        },
        {
          "type": "row",
          "children": [
            { "type": "cardHtml", "accent": "#C17D10", "title": "Objective 3", "body": "Evaluate borrowing base" },
            { "type": "cardHtml", "accent": "#B91C1C", "title": "Objective 4", "body": "Spot red flags in aging reports" }
          ]
        }
      ],
      "narration": "In this module you will learn four key objectives."
    },
    {
      "type": "section",
      "title": "Core Concepts",
      "subtitle": "Building a strong foundation",
      "moduleNum": 1,
      "moduleTitle": "Inventory Financing Fundamentals",
      "pageNum": 3,
      "totalPages": 40,
      "narration": "Now lets dive into core concepts."
    },
    {
      "type": "content",
      "chrome": { "title": "Process Overview", "moduleNum": 1, "moduleTitle": "Inventory Financing Fundamentals", "pageNum": 4, "totalPages": 40 },
      "components": [
        { "type": "stepRow", "num": 1, "title": "First Step", "description": "Description of step one." },
        { "type": "stepRow", "num": 2, "title": "Second Step", "description": "Description of step two." },
        { "type": "stepRow", "num": 3, "title": "Third Step", "description": "Description of step three." },
        { "type": "calloutBox", "title": "Key Insight", "body": "Summary of the process." }
      ],
      "narration": "This slide outlines the three-step process."
    },
    {
      "type": "keyTakeaways",
      "moduleNum": 1,
      "moduleTitle": "Inventory Financing Fundamentals",
      "pageNum": 38,
      "totalPages": 40,
      "takeaways": [
        { "title": "Takeaway 1", "desc": "Description..." },
        { "title": "Takeaway 2", "desc": "Description..." },
        { "title": "Takeaway 3", "desc": "Description..." },
        { "title": "Takeaway 4", "desc": "Description..." }
      ],
      "narration": "Lets review the four key takeaways from this module."
    },
    {
      "type": "references",
      "moduleNum": 1,
      "moduleTitle": "Inventory Financing Fundamentals",
      "pageNum": 39,
      "totalPages": 40,
      "references": [
        { "category": "Regulatory Guidance", "items": ["OCC Handbook", "FDIC Manual"] }
      ],
      "narration": "Here are the key references for further reading."
    },
    {
      "type": "closing",
      "moduleNum": 1,
      "moduleTitle": "Inventory Financing Fundamentals",
      "nextModuleNum": 2,
      "nextModuleTitle": "Accounts Receivable Analysis",
      "totalPages": 40,
      "narration": "Thank you for completing Module 1. (pause: 1) Thank you."
    }
  ]
}
```

## Critical Rules

1. **Read `references/api_reference.md` for the full JSON schema.** All slide types, component types, and options are documented there.

2. **Content auto-fills the safe zone.** The flex layout fills the space between header and footer. Content is vertically centered; sparse slides have balanced whitespace above and below.

3. **Page numbers must be sequential.** Track `pageNum` for every slide. The title slide is page 1.

4. **`section` and `closing` slides do not use `chrome`.** They have their own special layouts. Only `content` slides have a `chrome` object.

5. **`keyTakeaways` creates chrome internally.** Do not wrap it in a `content` slide. It is its own slide type.

6. **`references` creates its own slide.** Do not wrap it in a `content` slide.

7. **`redFlagPairs` goes inside a `content` slide.** It does NOT create chrome — the parent `content` slide provides chrome.

8. **Bold-prefix format.** Use `"Key Term: rest of description"` — the colon triggers auto bold formatting.

9. **`rowH` in `styledTable` opts is in INCHES, not pixels.** It is multiplied by SCALE=128 internally.
    - Default (no option): `0.35` in ≈ 45px — good for ≤5 data rows
    - Compact (6–7 rows): `0.28` in ≈ 36px
    - Extra-compact (8+ rows): `0.22` in ≈ 28px
    - **Never pass pixel values** like `"rowH": 36` — that would be 36 × 128 = 4,608px per row.

10. **`stepRow` height budget.** Each step row is ~55px. Budget for the content area (~560px after chrome):
    - 5 step rows alone: ~275px OK
    - 5 step rows + `calloutBox` (~80px): ~373px OK
    - 6 step rows + callout: ~450px — tight, may overflow. Use `styledTable` instead.

11. **`cardHtml` body accepts arrays for bullet lists.** Pass an array of strings to render as bulleted list:
    ```json
    { "type": "cardHtml", "accent": "#1A4FE8", "title": "Topic", "body": ["Item one", "Item two", "Item three"] }
    ```

12. **Use hex color strings.** Always use full hex like `"#1A4FE8"`, not color names or shorthand.

## Narration

Every slide should have a `narration` string field. Narrations are read directly from the DeckSpecification JSON by the build pipeline — no separate narration file is needed.

### Key TTS Rules (mandatory)
- Dollar amounts: Remove commas (`$17719` not `$17,719`)
- Negative amounts: `negative 204000 dollars`
- Acronyms: Phonetic spellings (Gap for GAAP, Fazz-bee for FASB, Cecil for CECL)
- `cashflow` (one word, always)
- No quotes in narration
- Last slide: `(pause: 1)` before thank-you

### Pre-Finalisation Checklist

Before writing the JSON, scan every narration string for:
- [ ] Dollar amounts with commas → remove all commas
- [ ] Company/partnership names with commas or `&` → reformat
- [ ] Acronyms from the phonetic table → replace with phonetic spellings
- [ ] `cash flow` (two words) → replace with `cashflow`
- [ ] Single or double quotes → remove or rephrase
- [ ] Last slide ends with `(pause: 1)` before thank-you

## Narakeet Video

When narration is present, the build pipeline auto-generates:
- `narakeet-script.md` — Narakeet video script pairing PNGs with narration
- `narakeet.zip` — self-contained archive for Narakeet API upload

Video generation uses the Narakeet API and requires `NARAKEET_API_KEY`.

## Building the Deck

After generating the DeckSpecification JSON, run it through `@shockproof/deck-builder`:

```js
import { buildDeck } from '@shockproof/deck-builder';
import fs from 'fs';

const spec = JSON.parse(fs.readFileSync('deck-spec.json', 'utf8'));
const result = await buildDeck(spec, {
  type: 'filesystem',
  outDir: './mnt/outputs/Module_1',
}, {
  pdfName: 'ABL_Mastery_Module_1.pdf',
});

console.log(`Built ${result.slideCount} slides`);
console.log(`PDF: ${result.pdfPath}`);
```

The same JSON can also be submitted as a cloud agent job (`htmlDeckBuilder`) for server-side execution.

## Slide Component Selection Guide

| Content Type                        | Best Component                                |
|-------------------------------------|-----------------------------------------------|
| Introduction / overview (4 topics)  | 2 `row`s with 2 `cardHtml` children each      |
| Numbered process / sequential steps | `stepRow` (max 5 alone, or 4 with callout; use `styledTable` if more) |
| Bulleted knowledge points           | `bullets` (max 6–7 items)                    |
| Checklist / requirements            | `checklist` (max 8 items)                    |
| Data / metrics comparison           | `styledTable`                                |
| Key statistics                      | `row` with 3 `cardHtml` (statCard style)     |
| Contrasting approaches (do/don't)   | `comparison`                                 |
| Important tip or principle          | `calloutBox`                                 |
| Warning signs / red flags           | `redFlagPairs` (exactly 6 pairs)             |
| Two-topic deep dive                 | `row` with 2 `cardHtml` + `calloutBox`       |

## Variety Matters

Avoid repeating the same component layout on consecutive slides. Use at least 8 different component types across a module.

## QA After Build

1. Build completes without errors
2. Console output confirms correct slide count
3. **Visual overflow check — mandatory.** After rendering, read every generated PNG using the Read tool and inspect each slide image:
   - Content must not touch or overlap the footer bar
   - No content should be cut off at the top or bottom
   - No slide should appear mostly empty when it should have content
   - If overflow is detected: fix the DeckSpecification JSON (reduce `rowH`, remove a component, add `"compact": true`, or replace `stepRow` with `styledTable`), rebuild, and re-check
4. Spot-check PDF: title, section divider, content, case study, closing
5. Every slide in the DeckSpecification has a `narration` field
6. Scan narration for TTS violations
