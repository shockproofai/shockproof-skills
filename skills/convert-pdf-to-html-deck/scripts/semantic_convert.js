'use strict';
const fs   = require('fs');
const path = require('path');
const { resolveApiKey } = require('./resolve_api_key');

// ─── Deck builder (shared package) ─────────────────────────────────────────
// Resolve dynamically: monorepo dist → npm package
let buildDeck, deckSpecificationSchema;
try {
  const pkg = require('@shockproof/deck-builder');
  buildDeck = pkg.buildDeck;
  deckSpecificationSchema = pkg.deckSpecificationSchema;
} catch {
  // Fallback: resolve from monorepo packages/deck-builder/dist
  const distPath = path.join(__dirname, '../../../../packages/deck-builder/dist/index.js');
  const pkg = require(distPath);
  buildDeck = pkg.buildDeck;
  deckSpecificationSchema = pkg.deckSpecificationSchema;
}

// Read the API reference once at load time (DeckSpecification JSON schema docs)
const API_REFERENCE = fs.readFileSync(
  path.join(__dirname, '../../create-html-deck/references/api_reference.md'),
  'utf8'
);

// ─── DeckSpecification tool schema for structured output ────────────────────
// This is a simplified JSON Schema representation of the DeckSpecification
// used as a tool definition for Claude's structured output.
const DECK_SPEC_TOOL = {
  name: 'generate_deck_specification',
  description: 'Generate a complete DeckSpecification JSON from the analyzed PDF content. Every slide must be included.',
  input_schema: {
    type: 'object',
    properties: {
      config: {
        type: 'object',
        properties: {
          seriesTitle: { type: 'string', description: 'Overall series/course name' },
          totalModules: { type: 'number', description: 'Total modules in the series' },
        },
        required: ['seriesTitle', 'totalModules'],
      },
      slides: {
        type: 'array',
        description: 'Array of slide specifications, one per slide in order',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['title', 'section', 'content', 'closing', 'keyTakeaways', 'references'],
            },
            // Title slide fields
            moduleNum: { type: 'number' },
            title: { type: 'string' },
            subtitle: { type: 'string' },
            totalPages: { type: 'number' },
            narration: { type: 'string' },
            // Section slide fields
            moduleTitle: { type: 'string' },
            pageNum: { type: 'number' },
            // Content slide fields
            chrome: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                moduleNum: { type: 'number' },
                moduleTitle: { type: 'string' },
                pageNum: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
            components: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['card', 'statCard', 'calloutBox', 'bullets', 'checklist',
                           'stepRow', 'comparison', 'styledTable', 'redFlagPairs',
                           'rawHtml', 'row'],
                  },
                  // Component-specific fields (all optional, depends on type)
                  accent: { type: 'string' },
                  title: { type: 'string' },
                  body: {}, // string or array of strings
                  value: { type: 'string' },
                  label: { type: 'string' },
                  items: { type: 'array', items: { type: 'string' } },
                  num: { type: 'number' },
                  description: { type: 'string' },
                  leftTitle: { type: 'string' },
                  leftBody: { type: 'string' },
                  rightTitle: { type: 'string' },
                  rightBody: { type: 'string' },
                  rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
                  flags: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
                  html: { type: 'string' },
                  children: { type: 'array', items: { type: 'object' } },
                  opts: { type: 'object' },
                },
                required: ['type'],
              },
            },
            // keyTakeaways fields
            takeaways: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  desc: { type: 'string' },
                },
                required: ['title', 'desc'],
              },
            },
            // references fields
            references: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  items: { type: 'array', items: { type: 'string' } },
                },
                required: ['category', 'items'],
              },
            },
            // Closing slide fields
            nextModuleNum: { type: 'number' },
            nextModuleTitle: { type: 'string' },
            nextModuleDesc: { type: 'string' },
          },
          required: ['type'],
        },
      },
    },
    required: ['config', 'slides'],
  },
};

/**
 * Send the PDF to Claude and receive a DeckSpecification JSON via structured output (tool_use).
 */
async function generateDeckSpec(pdfPath, outputDir, opts = {}) {
  let Anthropic;
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch {
    Anthropic = require(path.join(__dirname, '..', 'node_modules', '@anthropic-ai/sdk'));
  }

  const apiKey = await resolveApiKey('ANTHROPIC_API_KEY');
  const client = new Anthropic.default({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  });

  const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');

  const seriesTitle  = opts.seriesTitle  || null;
  const totalModules = opts.totalModules || 1;
  const moduleNum    = opts.moduleNum    || 1;

  console.log('  Sending PDF to Claude for semantic analysis (structured output)...');

  const prompt = `You are converting a PDF presentation into a Shockproof AI HTML deck.

Analyze the attached PDF carefully. Generate a complete DeckSpecification JSON that recreates every slide using the component types documented below.

## DeckSpecification JSON Schema Reference
${API_REFERENCE}

## Your task
Use the generate_deck_specification tool to output a complete DeckSpecification that:
1. Sets config.totalModules = ${totalModules}${seriesTitle ? `, config.seriesTitle = "${seriesTitle}"` : ' and infers seriesTitle from the PDF (the overall series/course name, NOT the individual module title)'}
2. Sets moduleNum = ${moduleNum} on all slides
3. Infers the module title from the PDF content
4. Recreates EVERY slide in the correct order using the most appropriate component type(s)
5. Includes a "narration" field on EVERY slide — 2–4 sentences of natural spoken narration
   based on the slide content (not raw PDF text)
6. Uses sequential page numbers starting at 1

## Component selection rules
- Title/cover page → type: "title"
- Section divider (dark background, large text) → type: "section"
- Closing/thank you page → type: "closing"
- Key takeaways (numbered, max 4) → type: "keyTakeaways"
- References/resources → type: "references"
- All other content → type: "content" with appropriate components

## Content component selection
- Numbered step sequence → stepRow components (one per step)
- Side-by-side comparison → comparison component
- Bullet list (≤5 items) → bullets component
- Bullet list (>5 items with "{short}: {long}" pattern) → styledTable component
- Checklist items → checklist component
- 2–4 cards side by side → row with cardHtml children
- 2 tables side by side → row with tableHtml children
- Single table → styledTable component
- Tip/warning/callout → calloutBox component
- Warning pairs → redFlagPairs component
- Stat/metric highlights → row with cardHtml children (big number as title)

## Bullet list conversion rules
When items follow "{shortLabel}: {longDescription}" pattern and count > 5, use styledTable:
- Row 0 is header — choose column names matching the data
- Each row is [shortLabel, longDescription] without the colon
- Set colWidths proportional to content: e.g. [1, 3] for short + long
- Set rowH to fill: 0.38 for 6 rows, 0.32 for 7-8, 0.28 for 9+

When ≤5 items, use bullets with fontSize: 18 (3 items), 16 (4), 14 (5).

## Narration rules
- Write for a human narrator speaking to an audience
- Synthesize, don't read bullet points verbatim
- Do NOT start with "In this slide" or "As you can see"
- Target at least 30 seconds per content slide (~75+ words); 60-90 seconds for complex slides
- For bullet/step/card slides: explain WHY the content matters before addressing items
- Dollar amounts: remove commas ($17719 not $17,719)
- Acronyms: phonetic spellings (Gap for GAAP, Fazz-bee for FASB, Cecil for CECL)
- cashflow (one word), no quotes, last slide: (pause: 1) before thank-you

## Color palette (hex values for accent fields)
blue=#1A4FE8, green=#2E7D32, gold=#C17D10, red=#B91C1C, teal=#0F766E`;

  const response = await client.messages.create({
    model: opts.model || 'claude-sonnet-4-6',
    max_tokens: 16384,
    tools: [DECK_SPEC_TOOL],
    tool_choice: { type: 'tool', name: 'generate_deck_specification' },
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
        },
        { type: 'text', text: prompt },
      ],
    }],
  });

  // Extract the tool_use result (guaranteed valid JSON by the API)
  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Claude did not return a tool_use block. Response: ' + JSON.stringify(response.content));
  }

  const spec = toolUse.input;

  // Validate against Zod schema
  const parsed = deckSpecificationSchema.parse(spec);
  console.log(`✓ DeckSpecification generated: ${parsed.slides.length} slides`);

  // Write the spec to disk for reference
  const specPath = path.join(outputDir, 'deck_specification.json');
  fs.writeFileSync(specPath, JSON.stringify(parsed, null, 2));
  console.log(`✓ Spec saved: ${specPath}`);

  return { spec: parsed, specPath };
}

const VISUAL_CHECK_PROMPT = (slideNum, total) => `\
This is slide ${slideNum} of ${total} (1280×720px). It has a blue header bar at top, \
a content area in the middle, and a light-grey footer bar at the bottom.

Examine this slide carefully for layout problems:

OVERFLOW (content too big):
1. Content cut off at the bottom — overflowing into or past the footer bar. Also includes \
callout boxes where only the title label is visible but the body text is clipped.
2. Content cut off at the top — includes (a) content pushed above the blue header bar, \
AND (b) the first content item where only the body/description text is visible but the \
title, label, or numbered badge is clipped or missing at the very top of the content area.
3. Slide nearly empty when it clearly should have content (extreme overflow, all off-screen).

UNDERSIZED (too much whitespace):
4. Content occupies less than ~60% of the available content area with large empty space \
at the bottom — fonts or row heights were over-constrained and should be increased.

If this slide looks correct, respond with exactly: {"ok":true}
If there are issues, respond with JSON like:
{"issues":[{"slide":${slideNum},"problem":"Step 1 badge clipped at top","fix":"Add compact:true to stepRow opts"}]}

Downsize fix strategies (overflow):
- stepRow: add "compact": true in opts
- calloutBox: add "compact": true in opts
- cardHtml (in row children): add "compact": true in opts for ALL children on that slide
- bullets: add "fontSize": 10 in opts
- styledTable: reduce rowH (e.g. 0.35 → 0.22) in opts

Column width fix (uneven whitespace / wrapping in tables):
- Add colWidths to opts using fr values proportional to content: [1, 3], [1, 2, 2], etc.

Upsize fix strategies (undersized):
- bullets: increase fontSize or remove constraint
- styledTable: increase rowH (e.g. 0.22 → 0.32)
- stepRow: remove compact if ample space
- calloutBox: remove compact if ample space

Respond with ONLY the JSON object, no explanation.`;

/**
 * Send rendered slide PNGs to Claude for visual overflow detection.
 * If issues found, apply fixes directly to the DeckSpecification JSON.
 * Returns the fixed spec if changes were made, or null if all clear.
 */
async function visualCheckAndFix(outputDir, spec, opts, apiKey) {
  let Anthropic;
  try { Anthropic = require('@anthropic-ai/sdk'); }
  catch { Anthropic = require(path.join(__dirname, '..', 'node_modules', '@anthropic-ai/sdk')); }

  const client = new Anthropic.default({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  });

  // Build PNG list
  let pngFiles;
  try {
    pngFiles = fs.readdirSync(outputDir)
      .filter(f => /^slide_\d+\.png$/.test(f))
      .sort()
      .map(f => path.join(outputDir, f));
  } catch {
    pngFiles = [];
    for (let i = 1; i <= 200; i++) {
      const p = path.join(outputDir, `slide_${String(i).padStart(3, '0')}.png`);
      if (!fs.existsSync(p)) break;
      pngFiles.push(p);
    }
  }

  if (pngFiles.length === 0) return null;

  console.log(`  Visually checking ${pngFiles.length} slides for overflow (per-slide)...`);
  const allIssues = [];
  for (let i = 0; i < pngFiles.length; i++) {
    const slideNum = i + 1;
    process.stdout.write(`\r  Checking slide ${slideNum}/${pngFiles.length}...   `);
    const content = [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: fs.readFileSync(pngFiles[i]).toString('base64') },
      },
      { type: 'text', text: VISUAL_CHECK_PROMPT(slideNum, pngFiles.length) },
    ];
    try {
      const response = await client.messages.create({
        model: opts.model || 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content }],
      });
      const raw = response.content[0].text.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.issues && result.issues.length > 0) allIssues.push(...result.issues);
      }
    } catch (err) {
      console.warn(`\n  Could not check slide ${slideNum}: ${err.message}`);
    }
  }
  console.log('');

  if (allIssues.length === 0) {
    console.log('  ✓ Visual check passed — no overflow detected');
    return null;
  }

  console.log(`  ⚠ Visual check found ${allIssues.length} issue(s):`);
  allIssues.forEach(i => console.log(`    Slide ${i.slide}: ${i.problem}`));
  console.log('  Applying layout fixes to DeckSpecification...\n');

  // Apply fixes directly to the spec JSON (simple property mutation)
  const fixedSpec = JSON.parse(JSON.stringify(spec)); // deep clone
  for (const issue of allIssues) {
    const slideIdx = issue.slide - 1;
    if (slideIdx < 0 || slideIdx >= fixedSpec.slides.length) continue;
    const slide = fixedSpec.slides[slideIdx];
    if (slide.type !== 'content' || !slide.components) continue;

    // Apply compact/fontSize/rowH fixes to matching components
    for (const comp of slide.components) {
      if (comp.type === 'stepRow') {
        comp.opts = { ...(comp.opts || {}), compact: true };
      } else if (comp.type === 'calloutBox') {
        comp.opts = { ...(comp.opts || {}), compact: true };
      } else if (comp.type === 'bullets') {
        const currentSize = comp.opts?.fontSize || 12;
        comp.opts = { ...(comp.opts || {}), fontSize: Math.max(9, currentSize - 2) };
      } else if (comp.type === 'styledTable') {
        const currentRowH = comp.opts?.rowH || 0.35;
        comp.opts = { ...(comp.opts || {}), rowH: Math.max(0.22, currentRowH - 0.06) };
      } else if (comp.type === 'row' && comp.children) {
        for (const child of comp.children) {
          if (child.type === 'cardHtml') {
            child.opts = { ...(child.opts || {}), compact: true };
          }
        }
      }
    }
  }

  // Write fixed spec
  const fixedPath = path.join(outputDir, 'deck_specification_fixed.json');
  fs.writeFileSync(fixedPath, JSON.stringify(fixedSpec, null, 2));
  console.log(`✓ Fixed spec saved: ${fixedPath}`);

  return fixedSpec;
}

/**
 * Semantic conversion: Claude maps PDF → DeckSpecification JSON → buildDeck() → Narakeet video.
 */
async function semanticConvert(pdfPath, outputDir, opts = {}) {
  console.log('\n── Semantic Convert ─────────────────────────────────────────\n');
  console.log(`  PDF:    ${pdfPath}`);
  console.log(`  Output: ${outputDir}\n`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const timing = {};
  const t = () => Date.now();
  let t0;

  // 1. Generate DeckSpecification via Claude structured output
  t0 = t();
  let { spec, specPath } = await generateDeckSpec(pdfPath, outputDir, opts);
  timing.claudeAnalysis = t() - t0;

  // 2. Build the deck using @shockproof/deck-builder (in-process, no child process)
  console.log('\n  Building deck from DeckSpecification...\n');
  t0 = t();
  const pdfName = path.basename(pdfPath, '.pdf') + '.pdf';
  let result = await buildDeck(spec, {
    type: 'filesystem',
    outDir: outputDir,
  }, {
    pdfName,
    onProgress: (step, detail) => {
      if (detail) console.log(`  [${step}] ${detail}`);
    },
  });
  timing.rendering = t() - t0;

  // 3. Visual check — detect overflow and apply fixes to the spec
  t0 = t();
  const apiKey = await resolveApiKey('ANTHROPIC_API_KEY');
  const fixedSpec = await visualCheckAndFix(outputDir, spec, opts, apiKey);
  if (fixedSpec) {
    console.log('\n  Re-building deck with layout fixes...\n');
    spec = fixedSpec;
    result = await buildDeck(fixedSpec, {
      type: 'filesystem',
      outDir: outputDir,
    }, {
      pdfName,
      onProgress: (step, detail) => {
        if (detail) console.log(`  [${step}] ${detail}`);
      },
    });
  }
  timing.visualCheck = t() - t0;

  // 4. Submit to Narakeet (unless --no-video)
  if (!opts.noVideo && result.narakeetZipPath) {
    console.log('\n── Submitting to Narakeet ──────────────────────────────────\n');
    // Use the shared renderer's submitToNarakeet for the ZIP upload
    const RENDERER_ROOT = path.join(__dirname, '../../shared/html-slide-renderer');
    const tpl = require(path.join(RENDERER_ROOT, 'scripts/sai_html_template.js'))({
      seriesTitle: spec.config.seriesTitle, totalModules: spec.config.totalModules,
    });
    const pres = tpl.createPresentation();
    const videoFilename = opts.videoFilename || (path.basename(pdfPath, '.pdf') + '.mp4');
    t0 = t();
    const videoPath = await pres.submitToNarakeet(outputDir, { videoFilename });
    timing.narakeet = t() - t0;
    return { specPath, videoPath, timing };
  }

  return { specPath, timing };
}

module.exports = { semanticConvert };
