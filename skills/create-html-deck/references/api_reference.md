# DeckSpecification JSON — API Reference

Declarative JSON format for Shockproof AI slide decks. Each spec is interpreted by `@shockproof/deck-builder` into HTML, rendered to PNGs, and assembled into PDF with optional narration.

## Quick Start

```json
{
  "config": {
    "seriesTitle": "Your Series Name",
    "totalModules": 3
  },
  "slides": [
    { "type": "title", "moduleNum": 1, "title": "Module Title", "subtitle": "Optional subtitle", "totalPages": 40, "narration": "Welcome to Module 1..." },
    { "type": "content", "chrome": { "title": "Key Points", "moduleNum": 1, "moduleTitle": "Module Title", "pageNum": 2, "totalPages": 40 }, "components": [...], "narration": "This slide covers..." },
    { "type": "closing", "moduleNum": 1, "moduleTitle": "Module Title", "totalPages": 40, "narration": "Thank you..." }
  ]
}
```

## Slide Canvas

- **Size**: 1280 × 720 px (16:9)
- **Layout**: Flex column — header (shrink) → content (grow, centered) → footer (shrink)
- **Content gap**: 18px between auto-stacked components
- **Content alignment**: Vertically centered — sparse slides have balanced whitespace above and below
- **Font**: Carlito (system-installed, used by Puppeteer/Chromium)

## Color Palette

Use these hex strings for `accent` fields in components.

| Name     | Hex       | Usage                            |
|----------|-----------|----------------------------------|
| blue     | `#1A4FE8` | Primary accent, buttons, headers |
| navy     | `#1A3068` | Title text, body text            |
| green    | `#2E7D32` | Positive / approved accent       |
| gold     | `#C17D10` | Callout titles, warning accent   |
| red      | `#B91C1C` | Negative / declined accent       |
| teal     | `#0F766E` | Fifth accent color               |

Accent rotation: `["#1A4FE8", "#2E7D32", "#C17D10", "#B91C1C", "#0F766E"]`

---

## Slide Types

### title

Creates a special layout title slide (not flow-based). Page 1 of the module.

```json
{
  "type": "title",
  "moduleNum": 1,
  "title": "Inventory Financing Fundamentals",
  "subtitle": "Understanding Collateral Valuation",
  "totalPages": 40,
  "narration": "Welcome to Module 1..."
}
```

Title auto-downsizes: >60 chars → 38pt, >80 chars → 34pt, >100 chars → 30pt.

### section

Navy section divider (special layout). Uses white logo variant.

```json
{
  "type": "section",
  "title": "Core Concepts",
  "subtitle": "Building a strong foundation",
  "moduleNum": 1,
  "moduleTitle": "Inventory Financing Fundamentals",
  "pageNum": 3,
  "totalPages": 40,
  "narration": "Now let's dive into core concepts."
}
```

### content

Flow-based slide with chrome (header + footer) and auto-stacking components.

```json
{
  "type": "content",
  "chrome": {
    "title": "Process Overview",
    "moduleNum": 1,
    "moduleTitle": "Inventory Financing Fundamentals",
    "pageNum": 4,
    "totalPages": 40
  },
  "components": [
    { "type": "stepRow", "num": 1, "title": "First Step", "description": "Description." },
    { "type": "stepRow", "num": 2, "title": "Second Step", "description": "Description." },
    { "type": "calloutBox", "title": "Key Insight", "body": "Summary of the process." }
  ],
  "narration": "This slide outlines the five-step process..."
}
```

Chrome title auto-downsizes: >45 chars → 24pt, >60 chars → 20pt.

### keyTakeaways

Creates chrome internally (title = "Key Takeaways"). Max 4 items.

```json
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
  "narration": "Let's review the four key takeaways..."
}
```

### references

Creates its own slide with chrome (title = "References & Resources").

```json
{
  "type": "references",
  "moduleNum": 1,
  "moduleTitle": "Inventory Financing Fundamentals",
  "pageNum": 39,
  "totalPages": 40,
  "references": [
    { "category": "Regulatory Guidance", "items": ["OCC Handbook", "FDIC Manual", "Fed SR Letters"] },
    { "category": "Industry Standards", "items": ["RMA Guidelines", "AICPA Guides"] }
  ],
  "narration": "Here are the key references..."
}
```

### closing

Creates closing slide (special layout). Pass `nextModuleNum`/`nextModuleTitle` for "Next:" text, or omit for "Series Complete" variant.

```json
{
  "type": "closing",
  "moduleNum": 1,
  "moduleTitle": "Inventory Financing Fundamentals",
  "nextModuleNum": 2,
  "nextModuleTitle": "Accounts Receivable Analysis",
  "totalPages": 40,
  "narration": "Thank you for completing Module 1. (pause: 1) Thank you."
}
```

---

## Component Types (for `content` slides)

All components auto-stack in a flexbox column within the content area.

### card

Accent-bordered info box filling available width.

```json
{ "type": "card", "accent": "#1A4FE8", "title": "Card Title", "body": "Prose text or array." }
```

`body` accepts:
- **String** → rendered as wrapped prose
- **Array of strings** → rendered as bulleted list (auto-shrinks for >4 items)

Optional `opts`: `{ "bodyFontSize": 12, "titleFontSize": 16, "titleColor": "#1A3068", "height": "auto" }`

**For side-by-side cards, use `row` with `cardHtml` children** (see below).

### statCard

Big number + label card.

```json
{ "type": "statCard", "accent": "#2E7D32", "value": "85%", "label": "Approval Rate" }
```

Optional `opts`: `{ "height": "auto" }`

### calloutBox

Blue accent bar + gold title.

```json
{ "type": "calloutBox", "title": "Important Note", "body": "This is the callout text." }
```

Optional `opts`: `{ "compact": false, "height": "auto" }`

### bullets

Bulleted list with bold-prefix auto-formatting. Auto-shrinks for >6 items.

```json
{ "type": "bullets", "items": ["Point One: Description.", "Point Two: Description."] }
```

Optional `opts`: `{ "fontSize": 12, "color": "#1A3068" }`

### checklist

Bulleted checklist with bold-prefix. Auto-shrinks for >8 items.

```json
{ "type": "checklist", "items": ["Requirement One: Details.", "Requirement Two: Details."] }
```

Optional `opts`: `{ "fontSize": 12 }`

### stepRow

Numbered step card. Auto-stacks — add multiple for a step sequence.

```json
{ "type": "stepRow", "num": 1, "title": "First Step", "description": "Description of step." }
```

Optional `opts`: `{ "compact": false }`

### comparison

Two-column comparison (red left, green right). Each body splits on `\n` into bullet items.

```json
{
  "type": "comparison",
  "leftTitle": "Traditional",
  "leftBody": "Point 1\nPoint 2\nPoint 3",
  "rightTitle": "Modern",
  "rightBody": "Better 1\nBetter 2\nBetter 3"
}
```

Optional `opts`: `{ "height": "auto" }`

### styledTable

Blue-header table with alternating rows. Row 0 = headers.

```json
{
  "type": "styledTable",
  "rows": [
    ["Category", "Rate", "Risk"],
    ["Raw Materials", "50-65%", "Low"],
    ["Finished Goods", "60-75%", "Medium"]
  ]
}
```

Optional `opts`: `{ "fontSize": 11, "rowH": 0.35, "colWidths": [2, 1, 1] }`

**`rowH` is in INCHES (multiplied by SCALE=128 internally).** Never pass pixel values.
- Default: `0.35` inches (≈45px) — good for 4–5 rows
- Compact (6–7 rows): `0.28` inches (≈36px)
- Extra-compact (8+ rows): `0.22` inches (≈28px)

### redFlagPairs

Two-column warning grid. Max 6 pairs. Does NOT add chrome — must be inside a `content` slide.

```json
{ "type": "redFlagPairs", "flags": [["Left flag 1", "Right flag 1"], ["Left flag 2", "Right flag 2"]] }
```

### row

Flex row for side-by-side elements. Children must be `cardHtml` or `tableHtml`.

```json
{
  "type": "row",
  "children": [
    { "type": "cardHtml", "accent": "#1A4FE8", "title": "Topic A", "body": "Description A" },
    { "type": "cardHtml", "accent": "#2E7D32", "title": "Topic B", "body": ["Item 1", "Item 2"] }
  ]
}
```

#### cardHtml (row child)

Card rendered as raw HTML for use inside `row`. Same props as `card`.

Optional `opts`: `{ "bodyFontSize": 12, "titleFontSize": 16, "titleColor": "#1A3068", "compact": false }`

#### tableHtml (row child)

Styled table rendered as raw HTML for use inside `row`. Same props as `styledTable`.

### rawHtml

Escape hatch for arbitrary HTML in the content flow.

```json
{ "type": "rawHtml", "html": "<div style='text-align:center;'>Custom content</div>" }
```

---

## Dynamic Font Sizing

| Component       | Trigger    | Behavior                               |
|----------------|------------|----------------------------------------|
| card (array body) | >4 items   | ~0.4pt shrink per extra item (min 8.5) |
| bullets         | >6 items   | ~0.75pt shrink per extra item          |
| checklist       | >8 items   | ~0.5pt per 2 extra items               |
| chrome title    | >45 chars  | 28pt → 24pt → 20pt                    |
| title slide     | >60 chars  | 44pt → 38pt → 34pt → 30pt             |

## Standard 40-Slide Structure

| Slides | Purpose                   | Slide Type                                 |
|--------|---------------------------|--------------------------------------------|
| 1      | Title                     | `title`                                    |
| 2      | Learning Objectives       | `content` with 2 `row`s of `cardHtml`      |
| 3      | Section A divider         | `section`                                  |
| 4-8    | Core content (5 slides)   | `content` with mix of components           |
| 9      | Section B divider         | `section`                                  |
| 10-18  | Deep-dive content         | `content` with mix                         |
| 19     | Red Flags                 | `content` with `redFlagPairs`              |
| 20-34  | Case Studies (3×5 slides) | `section` + `content`                      |
| 35     | Section F divider         | `section`                                  |
| 36-37  | Best practices            | `content` with mix                         |
| 38     | Key Takeaways             | `keyTakeaways`                             |
| 39     | References                | `references`                               |
| 40     | Closing                   | `closing`                                  |

## Content Guidelines

- Bold-prefix format: `"Key Term: rest of the description"`
- Max 6-7 bullet items per slide
- Max 6 red flag pairs per slide
- Max 4 key takeaways
- 3 case studies per module: Approved, Approved with Conditions, Declined
- 3 reference categories with 3 items each
