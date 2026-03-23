---
name: create-html-deck
description: >
  Generate Shockproof AI branded training presentation modules as a folder of PNG slide images,
  with optional PDF assembly. Slides are rendered as HTML/CSS with flexbox, grid, and dynamic font
  sizing, then screenshotted to PNG via a cloud function. Use this skill whenever the user asks for a
  Shockproof AI presentation, training module, or course deck as images or a PDF.
  Triggers on: "create a module", "build a presentation", "training deck", "Shockproof deck",
  "SAI slides", "HTML deck", or any request for a branded training presentation.
  The user specifies the number of slides.
  The output is a folder of numbered PNG files; a combined PDF can be assembled on request.
  Prefer this skill over create-svg-deck when the user wants PNG or PDF output.
user-invocable: true
---

# Shockproof AI HTML Deck Builder

This skill generates professional training module PDFs with Shockproof AI branding. Each slide is built as an HTML/CSS page at 1280×720 px and rendered to PNG via a cloud function (`renderHtmlToPng`). PNGs are assembled into a PDF using `pdf-lib`.

## Layout Model

This skill uses a **flow-based layout API** — components auto-stack in a flexbox column between the header and footer. **No manual coordinates are needed.** The browser handles spacing, wrapping, and overflow natively via CSS flexbox and grid.

| Feature | How It Works |
|---------|-------------|
| Layout model | Flow-based flexbox auto-stacking |
| Text wrapping | Native CSS word-wrap and line-clamp |
| Component placement | Auto-stacked in flex column; vertically centered |
| Multi-column layouts | `startRow()` / `cardHtml()` helpers |
| Rendering | HTML/CSS → cloud function (`renderHtmlToPng`) → PNG |
| Dependencies | pdf-lib |

## Required Environment Variables

| Variable | Required for | Notes |
|----------|-------------|-------|
| `RENDER_HTML_API_KEY` | PNG rendering | API key for the `renderHtmlToPng` cloud function |
| `NARAKEET_API_KEY` | Video generation | Only needed if using `submitToNarakeet()` |

In Cowork/sandbox environments, set these as env vars. Locally with gcloud, they are auto-resolved from Secret Manager.

## Renderer Location

The HTML rendering engine is the `html-slide-renderer` package. Resolve its path dynamically in build scripts:

```js
const path = require('path');

// Option A — if installed as npm package:
const RENDERER_ROOT = path.dirname(
  require.resolve('@shockproofai/shockproof-skills/skills/shared/html-slide-renderer/package.json')
);

// Option B — if cloned/symlinked locally (path relative to this skill):
// const RENDERER_ROOT = path.join(__dirname, '../shared/html-slide-renderer');

const SKILL_ROOT = __dirname; // skills/create-html-deck/
// Output dirs (mnt/outputs/) live inside SKILL_ROOT.
const tpl = require(`${RENDERER_ROOT}/scripts/sai_html_template.js`)({ seriesTitle, totalModules });
```

> **Always resolve RENDERER_ROOT dynamically.** Never hardcode an absolute path — it breaks on other machines.

## Before You Start

1. Read `references/api_reference.md` for the complete function reference.
2. The HTML template is at `shared/html-slide-renderer/scripts/sai_html_template.js` — factory function accepting `{ seriesTitle, totalModules }`.

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
- **Next module info** for the closing slide (or null if last module)

## Build Script Structure

```js
const path = require('path');
const RENDERER_ROOT = path.dirname(
  require.resolve('@shockproofai/shockproof-skills/skills/shared/html-slide-renderer/package.json')
);
const SKILL_ROOT = path.join(RENDERER_ROOT, '../../create-html-deck');

const tpl = require(`${RENDERER_ROOT}/scripts/sai_html_template.js`)({
  seriesTitle: "Series Name Here",
  totalModules: N,
});
const {
  C, createPresentation,
  addChrome, addTitleSlide, addSectionSlide, addClosingSlide,
  addCard, addStatCard, addCalloutBox, addStepRow, addComparison, addStyledTable,
  addKeyTakeaways, addRedFlagPairs, addChecklist, addBullets, addReferencesSlide,
  startRow, cardHtml, addRawHtml,
} = tpl;

const pres = createPresentation();

const MODULE_NUM   = 1;
const MODULE_TITLE = "Module Title";
const TOTAL_PAGES  = N;

// Slide 1: Title (creates its own slide)
addTitleSlide(pres, MODULE_NUM, MODULE_TITLE, "Subtitle description", TOTAL_PAGES);

// Slide 2: Learning Objectives — 2×2 card grid using rows
(() => {
  const slide = pres.addSlide();
  addChrome(slide, pres, "Learning Objectives", MODULE_NUM, MODULE_TITLE, 2, TOTAL_PAGES);
  // Row 1: two cards side by side
  const row1 = startRow();
  row1.add(cardHtml(C.blue, "Objective 1", "Description..."));
  row1.add(cardHtml(C.green, "Objective 2", "Description..."));
  slide.add(row1.html());
  // Row 2: two more cards
  const row2 = startRow();
  row2.add(cardHtml(C.gold, "Objective 3", "Description..."));
  row2.add(cardHtml(C.red, "Objective 4", "Description..."));
  slide.add(row2.html());
})();

// Slide 3: Section divider (creates its own slide)
addSectionSlide(pres, "Section Title", "Optional subtitle", MODULE_NUM, MODULE_TITLE, 3, TOTAL_PAGES);

// Slide 4: Steps — just add them, they auto-stack
(() => {
  const slide = pres.addSlide();
  addChrome(slide, pres, "Process Overview", MODULE_NUM, MODULE_TITLE, 4, TOTAL_PAGES);
  addStepRow(slide, pres, 1, "First Step", "Description of step one.");
  addStepRow(slide, pres, 2, "Second Step", "Description of step two.");
  addStepRow(slide, pres, 3, "Third Step", "Description of step three.");
  addStepRow(slide, pres, 4, "Fourth Step", "Description of step four.");
  addStepRow(slide, pres, 5, "Fifth Step", "Description of step five.");
})();

// Slide 5: Bullets + callout box — both auto-stack vertically
(() => {
  const slide = pres.addSlide();
  addChrome(slide, pres, "Key Points", MODULE_NUM, MODULE_TITLE, 5, TOTAL_PAGES);
  addBullets(slide, [
    "Point One: Description of the first key point.",
    "Point Two: Description of the second key point.",
    "Point Three: Description of the third key point.",
  ]);
  addCalloutBox(slide, pres, "Important Note", "This is a callout that auto-stacks below the bullets.");
})();

// Slide 6: Comparison — takes full content area
(() => {
  const slide = pres.addSlide();
  addChrome(slide, pres, "Comparison", MODULE_NUM, MODULE_TITLE, 6, TOTAL_PAGES);
  addComparison(slide, pres,
    "Traditional", "Point 1\nPoint 2\nPoint 3",
    "Modern", "Better point 1\nBetter point 2\nBetter point 3"
  );
  addCalloutBox(slide, pres, "Key Takeaway", "Summary of the comparison.");
})();

// Key Takeaways (creates chrome internally)
(() => {
  const slide = pres.addSlide();
  addKeyTakeaways(slide, pres, MODULE_NUM, MODULE_TITLE, TOTAL_PAGES - 2, TOTAL_PAGES, [
    { title: "Takeaway 1", desc: "Description..." },
    { title: "Takeaway 2", desc: "Description..." },
    { title: "Takeaway 3", desc: "Description..." },
    { title: "Takeaway 4", desc: "Description..." },
  ]);
})();

// References (creates its own slide)
addReferencesSlide(pres, MODULE_NUM, MODULE_TITLE, TOTAL_PAGES - 1, TOTAL_PAGES, [
  { category: "Category 1", items: ["Item 1", "Item 2", "Item 3"] },
]);

// Closing (creates its own slide)
addClosingSlide(pres, MODULE_NUM, MODULE_TITLE, null, null, null, TOTAL_PAGES);

// Output
pres.toPNGsAndPDF(`${SKILL_ROOT}/mnt/outputs/Module_1/`, `${SKILL_ROOT}/mnt/outputs/Module_1.pdf`)
  .then(() => console.log("Done!"))
  .catch(err => { console.error(err); process.exit(1); });
```

## Critical Rules

1. **Read `references/api_reference.md` for function signatures.** Components take `(slide, pres, ...)` — no coordinate parameters.

2. **Content auto-fills the safe zone.** The flex layout fills the space between header and footer. Content is vertically centered; sparse slides have balanced whitespace above and below.

3. **Page numbers must be sequential.** Track the page number for every slide and pass it to `addChrome` / `addSectionSlide`. The title slide is page 1.

4. **IIFE pattern for content slides.** Wrap each content slide in `(() => { ... })();` to scope the `slide` variable.

5. **addSectionSlide and addClosingSlide create their own slides.** Do NOT call `pres.addSlide()` before these.

6. **addChrome does NOT create a slide.** Call `pres.addSlide()` first, then `addChrome`.

7. **addKeyTakeaways requires you to create the slide first.** It calls `addChrome` internally. Signature: `addKeyTakeaways(slide, pres, moduleNum, moduleTitle, pageNum, totalPages, takeaways)`.

8. **addRedFlagPairs does NOT add chrome.** Call `addChrome` first.

9. **Bold-prefix format.** Use `"Key Term: rest of description"` for auto bold formatting.

10. **Resolve RENDERER_ROOT dynamically.** Use `require.resolve()` or a relative `path.join(__dirname, ...)`. Never hardcode absolute paths.

11. **Primary output is `toPNGsAndPDF()`.** Always call `pres.toPNGsAndPDF(dir, pdfPath)`.

12. **Multi-column layouts.** Use `startRow()` + `cardHtml()` for side-by-side cards:
    ```js
    const row = startRow();
    row.add(cardHtml(C.blue, "Title", "Body"));
    row.add(cardHtml(C.green, "Title", "Body"));
    slide.add(row.html());
    ```

13. **`cardHtml` body accepts an array for bullet lists.** Pass an array of strings to render as a bulleted list instead of prose:
    ```js
    // Prose (string):
    cardHtml(C.blue, "Title", "This is a paragraph of text.")
    // Bulleted list (array):
    cardHtml(C.blue, "Title", ["Item one", "Item two", "Item three"])
    ```

14. **`rowH` in `addStyledTable` is in INCHES, not pixels.** It is multiplied by `SCALE=128` internally.
    - Default (no option): `0.35` in ≈ 45px — good for ≤5 data rows
    - Compact (6–7 rows): `0.28` in ≈ 36px
    - Extra-compact (8+ rows): `0.22` in ≈ 28px
    - **Never pass pixel values** like `rowH: 36` — that would be 36 × 128 = 4,608px per row.

15. **`addStepRow` height budget.** Each step row is ~55px. Budget for the content area (~560px after chrome):
    - 5 step rows alone: ~275px ✓
    - 5 step rows + `addCalloutBox` (~80px): ~373px ✓
    - 6 step rows + callout: ~450px — tight, may overflow. Use a table instead.
    - **If you need >5 steps with a callout, replace `addStepRow` with `addStyledTable`.**

## Slide Narration JSON

Every deck must be accompanied by a `slide-narration.json` file. Narration is set **inline** via the `.narrate()` method on each slide and written automatically when `toPNGsAndPDF()` runs.

### How to Add Narration

Call `.narrate(text)` on each slide. It returns the slide, so it chains on `addTitleSlide`, `addSectionSlide`, `addClosingSlide`, and content slides:

```js
// Chained on slide-creating functions
addTitleSlide(pres, MODULE_NUM, MODULE_TITLE, "Subtitle", TOTAL_PAGES)
  .narrate("Welcome to Module 1 of the series...");

addSectionSlide(pres, "Section Title", "Subtitle", MODULE_NUM, MODULE_TITLE, 3, TOTAL_PAGES)
  .narrate("Now lets dive into the core concepts.");

// On content slides inside IIFEs
(() => {
  const slide = pres.addSlide();
  addChrome(slide, pres, "Key Points", MODULE_NUM, MODULE_TITLE, 4, TOTAL_PAGES);
  addBullets(slide, ["Point one.", "Point two."]);
  slide.narrate("This slide covers two key points...");
})();
```

### Output

`toPNGsAndPDF()` automatically writes `slide-narration.json` to the PNG output directory. The console shows a summary:
```
✓ Narration saved: .../slide-narration.json  (40/40 slides)
```

If any slides are missing narration, a warning is shown: `(38/40 slides, 2 missing)`.

### Format

```json
{
  "1": "Welcome to Module 1 of the series...",
  "2": "In this module we'll cover four key objectives...",
  "3": "..."
}
```

Keys are **string slide numbers** starting at `"1"`. Every slide should have narration — the console warns about gaps.

## Narakeet Video Script

When narration is present, `toPNGsAndPDF()` also auto-generates `narakeet-script.md` — a ready-to-use [Narakeet](https://www.narakeet.com/) video script that pairs each PNG with its narration.

### Generated Format

```markdown
---
size: 1080p
voice: hannah
transition: crossfade 0.25
subtitles:
  mode: embed
canvas: white
---

(image: slide_001.png)

Welcome to Module 1 of the series...

---

(image: slide_002.png)

In this module we will cover four key objectives...

---
```

### Customizing Voice / Size / Transition

Pass options to `pres.writeNarakeetScript(outputDir, opts)` if calling manually:

```js
pres.writeNarakeetScript(outputDir, {
  voice: 'matt',          // default: 'hannah'
  size: '4k',             // default: '1080p'
  transition: 'fade 0.5', // default: 'crossfade 0.25'
});
```

When auto-generated via `toPNGsAndPDF()`, defaults are used. Override by calling `writeNarakeetScript()` manually after `toPNGsAndPDF()` completes.

### Narakeet ZIP

`toPNGsAndPDF()` also generates `narakeet.zip` — a self-contained archive containing `narakeet-script.md` + all slide PNGs, ready for direct upload to the Narakeet API. Uses level 9 compression (matching `courseassistant-agents` convention).

### Submitting to Narakeet

After building the deck, submit the ZIP to Narakeet for video generation:

```js
await pres.toPNGsAndPDF(outDir, pdfPath);
const videoPath = await pres.submitToNarakeet(outDir, { videoFilename: 'Module_1.mp4' });
```

**API key resolution** (in order):
1. `NARAKEET_API_KEY` environment variable
2. `gcloud` CLI: `gcloud secrets versions access latest --secret=NARAKEET_API_KEY` (auto-detects project from `gcloud config`)
3. Secret Manager Node.js client (`@google-cloud/secret-manager`) as final fallback

**What it does:**
1. Requests an upload token from `GET /video/upload-request/zip`
2. Uploads `narakeet.zip` via `PUT` to the signed URL
3. Starts a build via `POST /video/build`
4. Polls `statusUrl` until finished (5s intervals, 15s for >15 slides, 10 min timeout)
5. Downloads the `.mp4` video to `outputDir`

**Console output:**
```
  Requesting Narakeet upload token...
  Uploading narakeet.zip (0.8 MB)...
  Upload complete.
  Requesting Narakeet build...
  Build started. Polling: https://...
  Building video... poll 12/120 (45%)
  Build complete!
  Downloading video to Module_1.mp4...
✓ Narakeet video saved: .../Module_1.mp4  (24.3 MB)
```

### Key TTS Rules (mandatory)
- Dollar amounts: Remove commas (`$17719` not `$17,719`)
- Negative amounts: `negative 204000 dollars`
- Acronyms: Phonetic spellings (Gap for GAAP, Fazz-bee for FASB, Cecil for CECL)
- `cashflow` (one word, always)
- No quotes in narration
- Last slide: `(pause: 1)` before thank-you

### Pre-Finalisation Checklist

Before writing the JSON file, scan every narration string for:
- [ ] Dollar amounts with commas → remove all commas
- [ ] Company/partnership names with commas or `&` → reformat
- [ ] Acronyms from the phonetic table → replace with phonetic spellings
- [ ] `cash flow` (two words) → replace with `cashflow`
- [ ] Single or double quotes → remove or rephrase
- [ ] Last slide ends with `(pause: 1)` before thank-you

## Slide Component Selection Guide

| Content Type                        | Best Component                                |
|-------------------------------------|-----------------------------------------------|
| Introduction / overview (4 topics)  | 2 rows of 2 cards via startRow + cardHtml     |
| Numbered process / sequential steps | addStepRow (max 5 alone, or 4 with a callout; use addStyledTable if more) |
| Bulleted knowledge points           | addBullets (max 6–7 items)                   |
| Checklist / requirements            | addChecklist (max 8 items)                   |
| Data / metrics comparison           | addStyledTable                               |
| Key statistics                      | startRow with 3 addStatCard                  |
| Contrasting approaches (do/don't)   | addComparison                                |
| Important tip or principle          | addCalloutBox                                |
| Warning signs / red flags           | addRedFlagPairs (exactly 6 pairs)            |
| Two-topic deep dive                 | startRow with 2 cardHtml + addCalloutBox     |

## Variety Matters

Avoid repeating the same component layout on consecutive slides. Use at least 8 different component types across a module.

## QA After Build

1. Script runs without errors
2. Console output confirms correct slide count
3. **Visual overflow check — mandatory.** After rendering, read every generated PNG using the Read tool and inspect each slide image:
   - Content must not touch or overlap the footer bar
   - No content should be cut off at the top or bottom
   - No slide should appear mostly empty when it should have content (extreme overflow pushes all content off-screen)
   - If overflow is detected: fix the build script (reduce `rowH`, remove a component, or replace `addStepRow` with `addStyledTable`), re-run, and re-check
4. Spot-check PDF: title, section divider, content, case study, closing
5. `slide-narration.json` exists with entry for every slide
6. Scan narration for TTS violations
