---
name: generate-deck-edit-doc
description: "Given a PDF slide handout (one slide per page with speaker notes), generate a Word doc for human text editing. Combines automated speaker-notes extraction with AI vision analysis of slide images. Node.js only — no Python dependency."
---

# Generate Deck Edit Document (from PDF)

Given a PDF slide handout with narration in speaker notes, produce a **Word document** (.docx) — a human-friendly editing surface for all slide text.

The output file is placed in the same directory as the input PDF.

> **Difference from `generate-deck-text-edit-document`**: that skill takes a PPTX as input and can programmatically read shape text. This skill takes a PDF handout where slide content is rendered as images — so it uses AI vision to extract slide text, plus automated extraction for speaker notes.

---

## Dependencies

Both scripts **auto-install** their dependencies on first run — no manual `npm install` needed.

| Script | Dependency | Auto-installed to |
|--------|-----------|-------------------|
| `extract_pdf_text.mjs` | `pdfjs-dist` (npm) | `node_modules/` |
| `generate_edit_doc.mjs` | `docx` (npm) | `node_modules/` |

**Prerequisites**: Node.js must be installed (npm comes bundled with it).

---

## Overview

The skill runs in three phases:

1. **Automated extraction** — `extract_pdf_text.mjs` extracts speaker notes and slide metadata from the PDF's selectable text layer, producing a skeleton `_intermediate.json`.
2. **Vision analysis** — Read the PDF pages visually (5 pages at a time) and fill in each slide's `title`, `subtitle`, `body_shapes`, `table`, and `cards` by analyzing the slide images.
3. **Docx generation** — `generate_edit_doc.mjs` reads the completed intermediate JSON and produces the Word document.

---

## Step 1: Extract speaker notes (automated)

```bash
node extract_pdf_text.mjs <input.pdf> [output_dir]
```

This produces `{deckname}_intermediate.json` with speaker notes populated and slide content fields set to `null` / empty. The JSON format:

```json
{
  "source_pdf": "Handout.pdf",
  "deck_name": "Handout",
  "slide_count": 20,
  "slides": [
    {
      "slide_number": 1,
      "title": null,
      "subtitle": null,
      "body_shapes": [],
      "table": null,
      "cards": null,
      "speaker_notes": ["First paragraph of notes...", "Second paragraph..."]
    }
  ]
}
```

---

## Step 2: Visual extraction of slide content

Read the PDF pages using the Read tool (5 pages at a time via the `pages` parameter). For each slide image, extract the text content and identify the layout.

### What to extract per slide

For each slide, determine and fill in:

1. **`title`** — The large heading text at the top of the slide. Multi-line titles joined with `\n`. Set to `null` if the slide has no title.

2. **`subtitle`** — Smaller text immediately below the title (if present). Set to `null` if absent.

3. **Body content** — Everything below the title/subtitle. Choose ONE of these representations based on the visual layout:

#### Layout A: Table (`table` field)

Use when the slide shows a grid of data with rows and columns (including tables with header rows, metrics with labels and values, process steps with numbers and descriptions).

```json
"table": {
  "columns": 3,
  "rows": [
    {"cells": [[{"text": "Rating", "bullet": null, "autonum": null}], [{"text": "Description", "bullet": null, "autonum": null}], [{"text": "Action", "bullet": null, "autonum": null}]]},
    {"cells": [[{"text": "1-3", "bullet": null, "autonum": null}], [{"text": "Pass: Minimal risk", "bullet": null, "autonum": null}], [{"text": "Annual review", "bullet": null, "autonum": null}]]}
  ],
  "trailing": []
}
```

Each cell is an array of paragraph objects. The `trailing` array holds any text below the table (like footnotes or callout boxes).

#### Layout B: Cards (`cards` field)

Use when the slide shows 3+ distinct content blocks arranged in a grid (e.g., 2×2 or 3-across cards, each with a bold title and description text).

```json
"cards": [
  {
    "paragraphs": [
      {"text": "Commercial Real Estate", "bullet": null, "autonum": null},
      {"text": "Office, retail, multifamily — typically 25-35% of portfolio.", "bullet": null, "autonum": null}
    ]
  },
  {
    "paragraphs": [
      {"text": "C&I Lending", "bullet": null, "autonum": null},
      {"text": "Working capital, equipment, lines of credit.", "bullet": null, "autonum": null}
    ]
  }
]
```

First paragraph in each card is the bold header; remaining are description text.

#### Layout C: Flat text with bullets (`body_shapes` field)

Use for bullet lists, numbered lists, plain paragraphs, or any body text that isn't a table or card layout.

```json
"body_shapes": [
  {
    "order": 0,
    "paragraphs": [
      {"text": "CRE concentration >300% of capital triggers enhanced scrutiny", "bullet": "•", "autonum": null},
      {"text": "Single-borrower limits typically set at 15-25% of capital", "bullet": "•", "autonum": null},
      {"text": "Geographic concentration exposes the portfolio to regional downturns", "bullet": "•", "autonum": null}
    ]
  }
]
```

- Set `"bullet": "•"` for bulleted items, `null` for non-bulleted.
- Set `"autonum": "arabicPeriod"` for numbered items (1., 2., etc.), `null` otherwise.
- Strip the bullet character or number prefix from the `text` field.

### Layout detection guidelines

| Visual pattern | Layout to use |
|----------------|---------------|
| Grid with header row + data rows | Table |
| Label-value pairs (metric + description) in rows | Table |
| Process steps (numbered boxes → descriptions) | Table |
| 3+ distinct boxes/cards arranged in grid | Cards |
| 2 side-by-side panels with headers + bullet lists | Cards |
| Simple bullet list | Flat text (body_shapes) with `bullet: "•"` |
| Numbered list | Flat text with `autonum: "arabicPeriod"` |
| Mix of text and a chart (chart on one side, bullets on other) | Flat text for the bullet content; ignore chart visuals |
| Agenda/TOC with numbered items | Table (number column + topic column) |

### Handling non-text elements

- **Charts, graphs, pie charts**: Skip the visual. Only extract any text labels/annotations that appear alongside the chart as flat body text.
- **Decorative elements** (lines, icons, colored bars): Skip entirely.
- **Callout/quote boxes** at bottom of slide: Include as `trailing` in a table, or as a final paragraph in body_shapes.
- **Footer bar** (deck name + page number at bottom of slide): Skip — this is template chrome, not content.

### Processing strategy

Read the PDF in batches of 5 pages at a time:
```
Read pages 1-5, extract slides 1-5
Read pages 6-10, extract slides 6-10
Read pages 11-15, extract slides 11-15
Read pages 16-20, extract slides 16-20
```

After each batch, update the intermediate JSON with the extracted content. When all slides are processed, write the final JSON.

### Important rules

- **Transcribe text exactly** as it appears on the slide. Do not paraphrase, summarize, or reword.
- **Preserve line breaks** in titles/subtitles that span multiple visual lines (join with `\n`).
- **Only ONE layout** per slide: set `table` OR `cards` OR `body_shapes` content. When table or cards is set, `body_shapes` should still contain the flat text as a fallback representation.
- **Empty slides** (image-only, no text): Leave `title`, `subtitle`, `body_shapes` all empty/null.

---

## Step 3: Generate the Word document

```bash
node generate_edit_doc.mjs <intermediate.json> [output.docx]
```

### Document structure

```
[Header]  deck name (left) | "Text Edit Document" (right)
[Footer]  Page {N} (center)

Heading 1:  "Slide 1 — Bank Loan Portfolio Management"

  Heading 2:  "Title"
    Normal:   Bank Loan
    Normal:   Portfolio Management

  Heading 2:  "Subtitle"
    Normal:   Strategies for Building a Resilient, High-Performing Loan Book

  Heading 2:  "Body"
    [one of: flat text | table | cards]

  [Speaker Notes in shaded box]
    Label:    "Speaker Notes"
    Normal:   Good morning, everyone...

                  --- Page Break ---
```

### Body rendering (layout-dependent)

#### Flat text (default)
Paragraphs with bullets/numbering preserved as Word list items.

#### Table layout
Multi-column Word table:
- **Auto-sized columns**: Widths proportional to max content length
- **First column**: Shaded `#E8EDF3` with bold text
- **Borders**: Light gray `#CCCCCC`
- **Trailing paragraphs** rendered below the table

#### Card layout
Each card as a bordered single-cell table:
- **Background**: `#FAFAFA`
- **Borders**: Light gray `#CCCCCC`
- **First paragraph bold**

### Speaker Notes rendering

Borderless shaded box (`#F0F4F8`) with "Speaker Notes" label in bold `#555555`.

### Heading conventions (round-trip markers)

| Word Style | Purpose | Format |
|------------|---------|--------|
| Heading 1 | Slide boundary | `Slide {N} — {title text}` |
| Heading 2 | Text role label | Exactly one of: `Title`, `Subtitle`, `Body`, `Speaker Notes` |
| Normal | Editable content | The actual text humans edit |

### Visual formatting

| Element | Font | Size (half-pts) | Color |
|---------|------|-----------------|-------|
| Heading 1 (slide boundary) | Calibri Bold | 28 (14pt) | `#1A4FE8` |
| Heading 2 (Title/Subtitle/Body) | Calibri Bold | 22 (11pt) | `#B85042` |
| Heading 2 (Speaker Notes label) | Calibri Bold | 22 (11pt) | `#555555` |
| Normal text | Calibri | 20 (10pt) | `#000000` |
| Header/Footer | Calibri | 16 (8pt) | `#888888` |

Page margins: 0.75" (1080 DXA) all sides.

### Edge cases

| Edge Case | Handling |
|-----------|----------|
| Slide with only a title | H1 + H2 "Title" + content. No Body or Speaker Notes. |
| No title | H1 reads `Slide N — (Untitled)`. No "Title" H2. |
| Empty speaker notes | Omit "Speaker Notes" section. |
| Image-only slide | H1 + `[No editable text on this slide]`. |
| Title > 80 chars | Truncate in H1 with `...`; full text in "Title" section. |

---

## Step 4: Validate output

After generating:

```bash
# Convert to images for visual QA
python scripts/office/soffice.py --headless --convert-to pdf output.docx
rm -f page-*.jpg
pdftoppm -jpeg -r 150 output.pdf page
ls -1 "$PWD"/page-*.jpg
```

Visually inspect the page images to confirm:
- Each slide is on its own page
- Headings are properly styled (blue H1, rust H2)
- Body text is readable
- Tables/cards render correctly
- Header/footer appear on each page

---

## Output files

Given input `Bank_Loan_Portfolio_Management_Handout.pdf`, produce:
- `Bank_Loan_Portfolio_Management_Handout_edit.docx` — the text edit document
