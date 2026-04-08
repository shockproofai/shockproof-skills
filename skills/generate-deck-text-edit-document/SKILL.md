---
name: generate-deck-text-edit-document
description: "Given a PPTX file with speaker notes, generate a Word doc for human text editing and a JSON sidecar for machine round-trip. A companion skill can later diff the edited doc and apply changes back to the PPTX."
---

# Generate Deck Text Edit Document

Given a PPTX presentation with narration in speaker notes, produce:
1. A **Word document** (.docx) — human-friendly editing surface for all slide text
2. A **JSON sidecar** (`_extract.json`) — maps slide/shape indices to PPTX shape IDs for automated write-back

Both files are placed in the same directory as the input PPTX.

---

## Dependencies

Both scripts **auto-install** their dependencies on first run — no manual `pip install` or `npm install` needed.

| Script | Dependency | Auto-installed to |
|--------|-----------|-------------------|
| `extract_pptx_text.py` | `python-pptx` | `vendor/` (via `pip install --target`) |
| `generate_edit_doc.mjs` | `docx` (npm) | `node_modules/` (via `npm install --save`) |

The `vendor/`, `node_modules/`, `package.json`, and `package-lock.json` are gitignored — each teammate's first run installs fresh platform-appropriate binaries.

**Prerequisites**: Python 3 and Node.js must be installed (pip and npm come bundled with them).

---

## Step 1: Extract text from the PPTX

Run the bundled Python script `extract_pptx_text.py` which uses `python-pptx` to:

1. Opens the PPTX file
2. For each slide, classifies shapes by placeholder type:
   - **Title**: `placeholder_format.type` in `{TITLE, CENTER_TITLE}` (idx 0, 15)
   - **Subtitle**: `placeholder_format.type == SUBTITLE` (idx 1)
   - **Body**: all other shapes with `has_text_frame` and non-empty text, ordered by visual reading position (top-to-bottom, left-to-right using `shape.top` then `shape.left`)
3. Extracts speaker notes from `slide.notes_slide.notes_text_frame`
4. Outputs two files:

### Intermediate JSON (for the docx generator)

```json
{
  "source_pptx": "BeginningTaiChi.pptx",
  "deck_name": "BeginningTaiChi",
  "slide_count": 10,
  "slides": [
    {
      "slide_number": 1,
      "title": "BEGINNING TAI CHI",
      "subtitle": "The Art of Mindful Movement\nA Beginner's Introduction",
      "body_shapes": [
        {
          "order": 0,
          "paragraphs": [
            {"text": "paragraph 1 text", "bullet": null, "autonum": null},
            {"text": "• bulleted item", "bullet": "•", "autonum": null},
            {"text": "1. numbered item", "bullet": null, "autonum": "arabicPeriod"}
          ]
        }
      ],
      "table": null,
      "cards": null,
      "speaker_notes": ["paragraph 1 of notes", "paragraph 2 of notes"]
    }
  ]
}
```

- `title` and `subtitle` are strings (newlines for multi-paragraph). `null` if absent.
- `body_shapes` is an array of shape objects, each with an `order` index and `paragraphs` array.
- Each paragraph is an object with `text`, `bullet` (buChar character or null), and `autonum` (buAutoNum type or null).
- `table` is a table layout object (see Layout Detection below) or `null`.
- `cards` is an array of card objects (see Layout Detection below) or `null`.
- `speaker_notes` is an array of paragraph strings. Empty array if no notes.

### Layout Detection (priority order)

The extraction script detects three structured layout types. Only the first match is used:

#### 1. Native PPTX Tables

Real table shapes (`shape.has_table`). Any column count is supported.

```json
"table": {
  "columns": 4,
  "rows": [{"cells": [[{"text": "Header", "bullet": null, "autonum": null}], ...]}],
  "trailing": [],
  "native": true
}
```

#### 2. Spatial Table Layout (≤3 columns)

Detected from text box shapes arranged in a grid pattern:
- Shapes clustered into rows by vertical proximity (ROW_GAP = 0.7")
- Each row has consistent column count at aligned horizontal positions (COL_SNAP = 1.0")
- At least 2 rows and 2-3 columns
- Shapes that don't fit the pattern go into `trailing`

```json
"table": {
  "columns": 2,
  "rows": [{"cells": [[{"text": "Label", ...}], [{"text": "Description", ...}]]}],
  "trailing": [{"text": "Footer note", "bullet": null, "autonum": null}]
}
```

#### 3. Card Layout

Detected from text box shapes clustered by horizontal position:
- Shapes with similar left-edge positions (within CARD_PROXIMITY = 1.5") belong to the same column
- At least 2 columns detected
- Cards formed by intersecting column groups with row groups
- Validated: at least 3 cards with 2+ shapes each

```json
"cards": [
  {"paragraphs": [{"text": "Card Title", "bullet": null, "autonum": null}, {"text": "Description", ...}]},
  ...
]
```

If none of these are detected, body shapes render as flat text.

### Sidecar JSON (`{deckname}_extract.json`)

```json
{
  "source_pptx": "BeginningTaiChi.pptx",
  "extracted_at": "2026-04-08T12:00:00Z",
  "slides": [
    {
      "slide_index": 0,
      "slide_number": 1,
      "title_shape_id": 2,
      "subtitle_shape_id": null,
      "body_shapes": [
        { "shape_id": 5, "name": "Content Placeholder 1", "order": 0 }
      ],
      "has_notes": true
    }
  ]
}
```

This file is NOT embedded in the Word doc — it lives alongside it as a companion file for the round-trip importer.

---

## Step 2: Generate the Word document

Write and run a Node.js script using `docx` (npm package) that reads the intermediate JSON and produces the `.docx`.

### Document structure

```
[Header]  deck name (left) | "Text Edit Document" (right)
[Footer]  Page {N} (center)

Heading 1:  "Slide 1 — The Art of Mindful Movement"

  Heading 2:  "Title"
    Normal:   BEGINNING TAI CHI

  Heading 2:  "Subtitle"
    Normal:   The Art of Mindful Movement
    Normal:   A Beginner's Introduction

  Heading 2:  "Body"
    [one of: flat text | table | cards — see Body Rendering below]

  [Speaker Notes in shaded box]
    Label:    "Speaker Notes"
    Normal:   Welcome to Beginning Tai Chi...

                  --- Page Break ---

Heading 1:  "Slide 2 — What is Tai Chi?"
  ...
```

### Body rendering (layout-dependent)

The Body section renders differently based on which layout was detected:

#### Flat text (default)
Paragraphs from each body shape, with bullets/numbering preserved as Word list items.

#### Table layout
Rendered as a multi-column Word table:
- **Auto-sized columns**: Widths proportional to max content length per column (minimum weight = 5 to prevent squished short labels)
- **First column**: Shaded `#E8EDF3` with bold text (typically labels)
- **Borders**: Light gray `#CCCCCC`
- **Cell margins**: 60 DXA top/bottom, 100 DXA left/right
- Trailing paragraphs (content after the table rows) rendered below the table

#### Card layout
Each card rendered as a bordered single-cell table:
- **Background**: `#FAFAFA`
- **Borders**: Light gray `#CCCCCC`
- **First paragraph bold** (typically the card label/icon)
- Bullets and numbering preserved within cards

### Speaker Notes rendering

Speaker notes appear in a **borderless shaded box** (single-cell table):
- **Background**: `#F0F4F8`
- **Label**: "Speaker Notes" bold `#555555`
- **No visible borders** (set to NONE)
- **Generous padding**: 100 DXA top/bottom, 160 DXA left/right

### Bullet and numbering preservation

The extraction script reads PPTX paragraph XML (`a:buChar` for bullets, `a:buAutoNum` for numbered lists) and the docx generator renders them as Word numbering:
- `bullet` → `LevelFormat.BULLET` (• character)
- `autonum` → `LevelFormat.DECIMAL` (1. 2. 3. format)

### Heading conventions (round-trip markers)

The headings ARE the machine-parseable markers. No bookmarks or hidden text (Google Docs strips those).

| Word Style | Purpose | Format |
|------------|---------|--------|
| Heading 1 | Slide boundary | `Slide {N} — {title text}` |
| Heading 2 | Text role label | Exactly one of: `Title`, `Subtitle`, `Body`, `Speaker Notes` |
| Normal | Editable content | The actual text humans edit |

**Round-trip parser regexes:**
- Heading 1: `/^Slide (\d+)\s*[—–-]+\s*(.+)$/` — captures slide number `N`
- Heading 2: `/^(Title|Subtitle|Body|Speaker Notes)$/` — matches role labels

### Section rules

- **Title** (H2): Text from the title placeholder (or heuristic top shape). Omit entirely if no title; use `(Untitled)` in the H1 text.
- **Subtitle** (H2): Text from the subtitle placeholder (or heuristic second shape). Omit entirely if absent.
- **Body** (H2): Rendered as table, cards, or flat text depending on detected layout. Omit entirely if no body text.
- **Speaker Notes**: In a shaded box (`#F0F4F8`) — NOT a Heading 2 in the doc navigation, but visually labeled.
- **Image-only slide**: Emit H1 + single Normal paragraph: `[No editable text on this slide]`

### Page breaks

Insert a page break after every slide section (before the next H1). No trailing page break after the last slide.

### Visual formatting

| Element | Font | Size (half-pts) | Color |
|---------|------|-----------------|-------|
| Heading 1 (slide boundary) | Calibri Bold | 28 (14pt) | `#1A4FE8` |
| Heading 2 (Title/Subtitle/Body) | Calibri Bold | 22 (11pt) | `#B85042` |
| Heading 2 (Speaker Notes label) | Calibri Bold | 22 (11pt) | `#555555` |
| Normal text | Calibri | 20 (10pt) | `#000000` |
| Header/Footer | Calibri | 16 (8pt) | `#888888` |

Page margins: 0.75" (1080 DXA) all sides. Compact spacing to fit each slide on one page.

### Document metadata

```javascript
const doc = new Document({
  title: `${deckName} — Text Edit Document`,
  creator: "Shockproof AI",
  // ... styles, sections
});
```

- Header: deck name left-aligned, "Text Edit Document" right-aligned (use tab stop)
- Footer: `Page {N}` centered

### Edge cases

| Edge Case | Handling |
|-----------|----------|
| Slide with only a title | Emit H1 + H2 "Title" + content. No Body or Speaker Notes. |
| Slide with no title | H1 reads `Slide N — (Untitled)`. No "Title" H2 emitted. |
| Empty speaker notes | Omit "Speaker Notes" section entirely. |
| Image-only slide (no text) | H1 + `[No editable text on this slide]` in Normal. |
| Title > 80 chars | Truncate in H1 with `...`; full text in "Title" section. |
| No placeholders (pptxgenjs) | Heuristic: sort text shapes by top position, treat top two (within 40% slide height) as title/subtitle. |
| Card layout (3+ cards, 2+ shapes each) | Render each card as a bordered box with first paragraph bold. |
| Table layout (2-3 cols, 2+ rows) | Render as auto-sized multi-column Word table. |
| Native PPTX table (any col count) | Pass through as Word table, any number of columns. |
| Table trailing content | Paragraphs that don't fit the table pattern render below the table. |
| Bulleted/numbered paragraphs | Preserved as Word list items (bullet or decimal numbering). |

---

## Step 3: Validate output

After generating:

```bash
# Validate the docx
python scripts/office/validate.py output.docx

# Convert to images for visual QA
python scripts/office/soffice.py --headless --convert-to pdf output.docx
rm -f page-*.jpg
pdftoppm -jpeg -r 150 output.pdf page
ls -1 "$PWD"/page-*.jpg
```

Visually inspect the page images to confirm:
- Each slide is on its own page
- Headings are properly styled (blue H1, gray H2)
- Body text is readable at 11pt
- Shape boundaries (`---`) are visible but subtle
- Header/footer appear on each page

---

## Output files

Given input `BeginningTaiChi.pptx`, produce:
- `BeginningTaiChi_edit.docx` — the text edit document
- `BeginningTaiChi_extract.json` — the shape-mapping sidecar

---

## Dependencies

- `python-pptx` (Python) — PPTX text extraction
- `docx` (npm, global) — Word document generation
- LibreOffice + Poppler — PDF/image conversion for QA
