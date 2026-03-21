# Shockproof AI HTML Template — API Reference

Flow-based layout API. Components auto-stack in a flexbox column between header and footer.
The browser handles all spacing, wrapping, and overflow natively — no manual coordinates needed.

## Quick Start

```js
const tpl = require("/path/to/sai_html_template.js")({
  seriesTitle: "Your Series Name",
  totalModules: 3,
});
const {
  C, createPresentation,
  addChrome, addTitleSlide, addSectionSlide, addClosingSlide,
  addCard, addStatCard, addCalloutBox, addStepRow, addComparison, addStyledTable,
  addKeyTakeaways, addRedFlagPairs, addChecklist, addBullets, addReferencesSlide,
  startRow, cardHtml, addRawHtml,
} = tpl;

const pres = createPresentation();
const MODULE_NUM = 1, MODULE_TITLE = "Module Title", TOTAL_PAGES = 40;
```

## Slide Canvas

- **Size**: 1280 × 720 px (16:9)
- **Layout**: Flex column — header (shrink) → content (grow, centered) → footer (shrink)
- **Content gap**: 18px between auto-stacked components
- **Content alignment**: Vertically centered — sparse slides have balanced whitespace above and below
- **Font**: Carlito (system-installed, used by Puppeteer/Chromium)

## Color Palette (C object)

| Key        | Hex     | Usage                            |
|------------|---------|----------------------------------|
| C.blue     | 1A4FE8  | Primary accent, buttons, headers |
| C.navy     | 1A3068  | Title text, body text            |
| C.green    | 2E7D32  | Positive / approved accent       |
| C.gold     | C17D10  | Callout titles, warning accent   |
| C.red      | B91C1C  | Negative / declined accent       |
| C.teal     | 0F766E  | Fifth accent color               |
| C.bg       | F8F9FC  | Slide background                 |
| C.card     | EEF2FF  | Card fill                        |
| C.gray     | 666666  | Body text, footer text           |
| C.ltGray   | 999999  | Subtle text                      |
| C.footerBg | E8EDF8  | Footer bar fill                  |

ACCENTS array: `[C.blue, C.green, C.gold, C.red, C.teal]`

---

## Presentation & Output

### createPresentation()
Returns a presentation object.
- `pres.addSlide(bgColor?)` — creates and returns a new Slide; optional background color
- `pres.toPNGsAndPDF(outputDir, pdfPath)` — async; renders PNGs via Puppeteer + assembles PDF + writes narration JSON + writes Narakeet script
- `pres.toPNGs(outputDir)` — async; PNGs only + writes narration JSON + writes Narakeet script
- `pres.toPDF(outputPath, pngPaths?)` — async; PDF only (from existing PNGs)
- `pres.writeNarration(outputDir)` — writes `slide-narration.json` from per-slide `.narrate()` calls
- `pres.writeNarakeetScript(outputDir, opts?)` — writes `narakeet-script.md` from PNGs + narration. opts: `{ voice, size, transition }`
- `pres.writeNarakeetZip(outputDir)` — async; creates `narakeet.zip` containing `narakeet-script.md` + all slide PNGs (level 9 compression)
- `pres.submitToNarakeet(outputDir, opts?)` — async; uploads ZIP to Narakeet API, polls for video build, downloads `.mp4` locally. opts: `{ videoFilename }`. Returns path to downloaded video. API key resolved: env `NARAKEET_API_KEY` → `gcloud` CLI → Secret Manager Node client

```js
pres.toPNGsAndPDF("mnt/outputs/MyModule/", "mnt/outputs/MyModule.pdf")
  .then(() => console.log("Done"))
  .catch(err => { console.error(err); process.exit(1); });
```

### slide.narrate(text)
Set the TTS narration for a slide. Returns the slide for chaining. Called inline during slide creation:

```js
addTitleSlide(pres, 1, "Title", "Subtitle", 40)
  .narrate("Welcome to Module 1...");

// Or on content slides:
slide.narrate("This slide covers the key points...");
```

Narration is automatically written to `slide-narration.json` by `toPNGs()` / `toPNGsAndPDF()`.

---

## Slide Structure Functions

### addChrome(slide, pres, title, moduleNum, moduleTitle, pageNum, totalPages)
Sets up header (blue bar, logo, title) + footer on a flow slide. Components added after this auto-stack below the header. Long titles auto-downsize (>45 chars → 24pt, >60 chars → 20pt) and wrap to 2 lines max.

### addTitleSlide(pres, moduleNum, title, subtitle, totalPages)
Creates a new title slide (special layout, not flow). Title auto-downsizes for long text. Returns slide.

### addSectionSlide(pres, title, subtitle, moduleNum, moduleTitle, pageNum, totalPages)
Creates a navy section divider (special layout). Uses white logo variant. Returns slide.

### addClosingSlide(pres, moduleNum, moduleTitle, nextModuleNum, nextModuleTitle, nextModuleDesc, totalPages)
Creates closing slide. Uses white logo variant. Pass `null` for next* if last module. Returns slide.

---

## Content Components (Flow-Based)

All components below are added via `slide.add()` internally and auto-stack in the flex column.

### addCard(slide, pres, accentColor, titleText, bodyText, opts?)
Single card that fills available width. opts: `{ bodyFontSize, titleFontSize, titleColor, height }`

`bodyText` accepts:
- **String** — rendered as wrapped prose
- **Array of strings** — rendered as bulleted list (auto-shrinks for >4 items)

**For side-by-side cards, use `startRow()` + `cardHtml()` instead** (see Layout Helpers below).

### addStatCard(slide, pres, accentColor, statVal, statLabel, opts?)
Big number card. opts: `{ height }`

### addCalloutBox(slide, pres, titleText, bodyText, opts?)
Blue accent bar + gold title. opts: `{ height }`

### addStepRow(slide, pres, num, title, description)
Numbered step card. Auto-stacks — just call multiple times for a step sequence.

```js
addStepRow(slide, pres, 1, "First Step", "Description.");
addStepRow(slide, pres, 2, "Second Step", "Description.");
addStepRow(slide, pres, 3, "Third Step", "Description.");
```

### addComparison(slide, pres, leftTitle, leftBody, rightTitle, rightBody, opts?)
Two-column comparison (red left, green right). Each body splits on `\n` into bullet items. opts: `{ height }`

```js
addComparison(slide, pres,
  "Traditional", "Point 1\nPoint 2\nPoint 3",
  "Modern", "Better 1\nBetter 2\nBetter 3"
);
```

### addStyledTable(slide, pres, rows, opts?)
Blue-header table with alternating rows. rows = 2D array, row[0] = headers. opts: `{ fontSize, rowH }`

**IMPORTANT — `rowH` is in INCHES (multiplied by SCALE=128 internally).** Do NOT pass pixel values.
- Default: `0.35` inches (≈45px) — good for 4–5 rows
- Compact (6–7 rows): `0.28` inches (≈36px)
- Extra-compact (8+ rows): `0.22` inches (≈28px)
- `cardHtml` body supports arrays for bullet lists: `cardHtml(C.blue, "Title", ["item 1", "item 2"])`

### addKeyTakeaways(slide, pres, moduleNum, moduleTitle, pageNum, totalPages, takeaways)
Numbered takeaway list. Calls addChrome internally. You must create the slide first.
takeaways = `[{ title, desc }, ...]` — max 4 items.

### addRedFlagPairs(slide, flags)
Two-column warning grid. flags = `[[leftText, rightText], ...]` — max 6 pairs.
Does NOT add chrome — call addChrome first.

### addChecklist(slide, items, opts?)
Bulleted checklist with bold-prefix. opts: `{ fontSize }`
Auto-shrinks for >8 items.

### addBullets(slide, items, opts?)
Bulleted list with bold-prefix. opts: `{ fontSize, color }`
Auto-shrinks for >6 items.

### addReferencesSlide(pres, moduleNum, moduleTitle, pageNum, totalPages, references)
Creates a new slide with chrome. references = `[{ category, items: [string] }, ...]`.

---

## Layout Helpers

### startRow()
Creates a flex row collector for side-by-side elements.

```js
const row = startRow();
row.add(cardHtml(C.blue, "Title A", "Body A"));
row.add(cardHtml(C.green, "Title B", "Body B"));
slide.add(row.html());
```

### cardHtml(accentColor, titleText, bodyText, opts?)
Returns raw card HTML string (not added to slide). Use with `startRow()` for side-by-side cards.
opts: `{ bodyFontSize, titleFontSize, titleColor }`

### addRawHtml(slide, html)
Insert arbitrary HTML into the content flow. Use sparingly.

---

## Dynamic Font Sizing

| Component       | Trigger              | Behavior                               |
|----------------|----------------------|----------------------------------------|
| addCard (arr)   | >4 items             | ~0.4pt shrink per extra item (min 8.5) |
| addBullets      | >6 items             | ~0.75pt shrink per extra item          |
| addChecklist    | >8 items             | ~0.5pt per 2 extra items               |
| addChrome title | >45 chars            | 28pt → 24pt → 20pt                    |
| addTitleSlide   | >60 chars            | 44pt → 38pt → 34pt → 30pt             |

## Standard 40-Slide Structure

| Slides | Purpose                   | Components                                 |
|--------|---------------------------|--------------------------------------------|
| 1      | Title                     | addTitleSlide                              |
| 2      | Learning Objectives       | addChrome + 2 rows of cardHtml             |
| 3      | Section A divider         | addSectionSlide                            |
| 4-8    | Core content (5 slides)   | addChrome + mix of components              |
| 9      | Section B divider         | addSectionSlide                            |
| 10-18  | Deep-dive content         | addChrome + mix                            |
| 19     | Red Flags                 | addChrome + addRedFlagPairs                |
| 20-34  | Case Studies (3×5 slides) | addSectionSlide + content                  |
| 35     | Section F divider         | addSectionSlide                            |
| 36-37  | Best practices            | addChrome + mix                            |
| 38     | Key Takeaways             | addKeyTakeaways                            |
| 39     | References                | addReferencesSlide                         |
| 40     | Closing                   | addClosingSlide                            |

## Content Guidelines

- Bold-prefix format: `"Key Term: rest of the description"`
- Max 6-7 bullet items per slide
- Max 6 red flag pairs per slide
- Max 4 key takeaways
- 3 case studies per module: Approved, Approved with Conditions, Declined
- 3 reference categories with 3 items each
