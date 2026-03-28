'use strict';
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { resolveApiKey } = require('./resolve_api_key');

const RENDERER_ROOT = path.join(__dirname, '../../shared/html-slide-renderer');

// Read the API reference once at load time
const API_REFERENCE = fs.readFileSync(
  path.join(__dirname, '../../create-html-deck/references/api_reference.md'),
  'utf8'
);

/**
 * Send the PDF to Claude and receive a complete, executable build script.
 */
async function generateBuildScript(pdfPath, outputDir, opts = {}) {
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
  const videoFilename = opts.videoFilename || (path.basename(pdfPath, '.pdf') + '.mp4');

  const outputDirAbs = path.resolve(outputDir);
  const pdfAbs       = path.resolve(pdfPath);

  console.log('  Sending PDF to Claude for semantic analysis...');

  const SAI_TEMPLATE_PATH = path.join(RENDERER_ROOT, 'scripts', 'sai_html_template.js');

  const prompt = `You are converting a PDF presentation into a Shockproof AI HTML deck.

Analyze the attached PDF carefully. Recreate every slide using the component API below.

## Renderer require path (USE THIS EXACT PATH)
const tpl = require("${SAI_TEMPLATE_PATH}")({...});

## API Reference
${API_REFERENCE}

## Your task
Write a COMPLETE, executable Node.js build script that:
1. Requires sai_html_template.js using the EXACT path shown above (not a directory path)
2. Uses totalModules: ${totalModules}${seriesTitle ? `, seriesTitle: "${seriesTitle}"` : ' and infers seriesTitle from the PDF (the overall series/course name, e.g. "CRE Borrower Interview" — NOT the individual module title)'}
3. Sets MODULE_NUM = ${moduleNum}
4. Infers MODULE_TITLE (the individual module title) and TOTAL_PAGES from the PDF content
5. Recreates EVERY slide in the correct order using the most appropriate component(s)
6. Calls .narrate() on EVERY slide — 2–4 sentences of natural spoken narration
   based on the COMPONENT CONTENT you are placing on the slide (not raw PDF text)
7. Ends with:
   pres.toPNGsAndPDF("${outputDirAbs}/", "${outputDirAbs}/../${path.basename(pdfPath, '.pdf')}.pdf")
     .then(() => console.log('\\n✅ Build complete'))
     .catch(err => { console.error('❌', err.message); process.exit(1); });

## CRITICAL: Variable declaration order
ALWAYS declare the slide variable with const/let BEFORE you use it in any function call.
JavaScript const has a temporal dead zone — you cannot reference a const before its declaration line.

WRONG (causes ReferenceError):
  addBullets(slide3, items);     // ❌ slide3 used before declaration
  const slide3 = pres.addSlide();

CORRECT:
  const slide3 = pres.addSlide(); // ✅ declare first
  addBullets(slide3, items);      // then use

## CRITICAL: addKeyTakeaways — do NOT call addChrome on the same slide
addKeyTakeaways calls addChrome internally. You must:
  1. Create the slide: const slide = pres.addSlide();
  2. Call addKeyTakeaways directly — it adds chrome automatically
  3. Do NOT call addChrome before addKeyTakeaways

CORRECT pattern:
  const slideN = pres.addSlide();
  addKeyTakeaways(slideN, pres, MODULE_NUM, MODULE_TITLE, pageNum, TOTAL_PAGES, [
    { title: "Takeaway 1", desc: "Description." },
    { title: "Takeaway 2", desc: "Description." },
  ]);
  slideN.narrate("Narration text.");

WRONG (double chrome, error):
  const slideN = pres.addSlide();
  addChrome(slideN, pres, "Key Takeaways", ...);  // ❌ don't call this
  addKeyTakeaways(slideN, pres, ...);

## CRITICAL: Correct function call patterns

EVERY content component takes (slide, pres, ...) or (slide, ...) as shown:
  const slide = pres.addSlide();
  addChrome(slide, pres, "Title", MODULE_NUM, MODULE_TITLE, pageNum, TOTAL_PAGES);
  addBullets(slide, ["Item 1", "Item 2"]);
  addCalloutBox(slide, pres, "Tip Title", "Body text.");
  addStepRow(slide, pres, 1, "Step Name", "Description text.");
  addComparison(slide, pres, "Left Title", "L1\nL2\nL3", "Right Title", "R1\nR2\nR3");
  addStyledTable(slide, pres, [["Col1","Col2"],["A","B"],["C","D"]]);
  const row = startRow(); row.add(cardHtml(C.blue, "Title", "Body")); slide.add(row.html());

## Component selection rules
- Title/cover page → addTitleSlide
- Section divider (dark background, large text) → addSectionSlide
- Closing/thank you page → addClosingSlide
- Numbered step sequence → addStepRow (one call per step)
- Side-by-side comparison → addComparison
- Bullet list → addBullets (see sizing and table-conversion rules below)
- Checklist items → addChecklist
- 2–4 cards side by side → startRow() + cardHtml()
- 2 tables side by side → startRow() + tableHtml()
- Single table → addStyledTable
- Tip/warning/callout → addCalloutBox
- Key takeaways (numbered, max 4) → addKeyTakeaways
- Warning pairs → addRedFlagPairs
- Stat/metric highlights → startRow() + cardHtml() with big number as title

## Bullet list rules

### Convert to table when items follow "{short}: {long}" pattern and count > 5
If a slide's bullet list has MORE THAN 5 items AND every item follows the pattern
"{shortLabel}: {longDescription}", use addStyledTable instead of addBullets.
- Row 0 is the header row — choose column names that match the data (e.g. ["Research Area", "What to Do"], ["Document Type", "Description"], ["Step", "Action"])
- Each subsequent row is [shortLabel, longDescription] — do NOT include the colon
- ALWAYS set colWidths to reflect actual content: for a short-label + long-description 2-column table use { colWidths: [1, 3] } (25% / 75%); for a 3-column table where columns are roughly equal use the default (omit colWidths)
- Size rows to fill the slide: use { rowH: 0.38 } for 6 rows, { rowH: 0.32 } for 7–8 rows, { rowH: 0.28 } for 9+ rows
- Do NOT add a calloutBox after a converted table unless one was explicitly present in the original slide

### Keep as addBullets when count ≤ 5
When 5 or fewer items, use addBullets. To minimise whitespace, set fontSize
proportional to item count and text length:
- 3 items or fewer: { fontSize: 18 }
- 4 items: { fontSize: 16 }
- 5 items: { fontSize: 14 }
If individual items are long (>80 chars), reduce by 1–2pt from the above values.

## Narration rules
- Write for a human narrator speaking to an audience
- Synthesize, don't read bullet points verbatim
- Do NOT start with "In this slide" or "As you can see"
- Target at least 30 seconds of narration per content slide (~75+ words); 60–90 seconds for complex slides
- For slides with bullet lists, step sequences, or card sets: open with a sentence explaining WHY the content matters before mentioning any items. Do not announce how many items there are. After framing, you may address individual items — paraphrase and explain each one, do not read them verbatim.

Output ONLY the JavaScript code. No markdown fences, no explanation.`;

  const response = await client.messages.create({
    model: opts.model || 'claude-sonnet-4-6',
    max_tokens: 8192,
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

  let script = response.content[0].text.trim();

  // Strip any accidental markdown code fences (handle multi-line fences)
  script = script.replace(/^```(?:javascript|js)?\s*\n/im, '').replace(/\n```\s*$/im, '').trim();
  // If starts with ``` (bare), strip it
  script = script.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

  // Detect truncation: if toPNGsAndPDF is missing, run a continuation pass
  if (!script.includes('toPNGsAndPDF')) {
    console.log('  ⚠ Script truncated (hit token limit). Running continuation pass...');

    // Find the last complete slide block (ends with .narrate("..."); )
    // A complete slide has a .narrate() call closed with );
    const completedMatches = [...script.matchAll(/\/\/ Slide (\d+):/g)];
    let partialScript = script;
    let lastCompleteSlide = 0;

    if (completedMatches.length > 1) {
      // Find last slide block that contains a complete .narrate() call
      for (let i = completedMatches.length - 1; i >= 0; i--) {
        const startPos = completedMatches[i].index;
        const endPos = i + 1 < completedMatches.length ? completedMatches[i + 1].index : script.length;
        const block = script.slice(startPos, endPos);
        if (/\.narrate\(["'`]/.test(block) && /\);/.test(block.split('.narrate(')[1] || '')) {
          lastCompleteSlide = parseInt(completedMatches[i][1], 10);
          // Truncate script to end of this complete block
          const nextSlideStart = i + 1 < completedMatches.length ? completedMatches[i + 1].index : script.length;
          partialScript = script.slice(0, nextSlideStart).trimEnd();
          break;
        }
      }
    }

    if (lastCompleteSlide > 0) {
      const contPrompt = `You are continuing a partially-generated Node.js build script for a Shockproof AI HTML deck.

The script was cut off after slide ${lastCompleteSlide}. Continue it from slide ${lastCompleteSlide + 1} to the end of the PDF.

## IMPORTANT
- Output ONLY the continuation code — no require() statements, no const tpl/pres declarations, no MODULE_NUM/MODULE_TITLE/TOTAL_PAGES redeclarations
- Use the same variable names already in scope: pres, MODULE_NUM, MODULE_TITLE, TOTAL_PAGES, and all imported functions
- End the continuation with exactly:
  pres.toPNGsAndPDF("${outputDirAbs}/", "${outputDirAbs}/../${path.basename(pdfPath, '.pdf')}.pdf")
    .then(() => console.log('\\n✅ Build complete'))
    .catch(err => { console.error('❌', err.message); process.exit(1); });

## Variable declaration order rule
ALWAYS declare the slide variable BEFORE using it:
  const slideN = pres.addSlide(); // ✅ declare first
  addChrome(slideN, pres, ...);   // then use

## Here is the script so far (for context on style and what was already generated):
${partialScript}

Output ONLY the continuation JavaScript code. No markdown fences, no explanation.`;

      const contResponse = await client.messages.create({
        model: opts.model || 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            { type: 'text', text: contPrompt },
          ],
        }],
      });

      let continuation = contResponse.content[0].text.trim();
      continuation = continuation.replace(/^```(?:javascript|js)?\s*\n/im, '').replace(/\n```\s*$/im, '').trim();
      continuation = continuation.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

      // Remove any re-declarations of variables already in scope
      continuation = continuation
        .replace(/^const tpl\s*=[\s\S]*?;\n/m, '')
        .replace(/^const \{[\s\S]*?\} = tpl;\n/m, '')
        .replace(/^const pres\s*=.*;\n/m, '')
        .replace(/^const MODULE_NUM\s*=.*;\n/m, '')
        .replace(/^const MODULE_TITLE\s*=.*;\n/m, '')
        .replace(/^const TOTAL_PAGES\s*=.*;\n/m, '')
        .trim();

      script = partialScript + '\n\n' + continuation;
      console.log(`✓ Continuation generated (slides ${lastCompleteSlide + 1}+)`);
    }
  }

  const scriptPath = path.join(outputDir, 'build_script_generated.js');
  fs.writeFileSync(scriptPath, script);
  console.log(`✓ Build script generated: ${scriptPath}`);
  return scriptPath;
}

/**
 * Ask Claude to fix a failing build script.
 * Returns the path to the fixed script (written as build_script_fixed.js).
 */
async function fixBuildScript(scriptPath, errorMessage, opts = {}, isLayoutFix = false) {
  let Anthropic;
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch {
    Anthropic = require(path.join(path.dirname(scriptPath), '../../..', 'node_modules', '@anthropic-ai/sdk'));
  }
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (!apiKey) throw new Error('No API key available for fix attempt');

  const client = new Anthropic.default({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  });

  const brokenScript = fs.readFileSync(scriptPath, 'utf8');

  const prompt = isLayoutFix
    ? `Fix layout overflow in this slide build script. The visual issues are listed below.

LAYOUT ISSUES:
${errorMessage}

CURRENT SCRIPT:
\`\`\`js
${brokenScript}
\`\`\`

Rules:
- Fix ONLY the slides listed in the issues. Do not touch other slides.
- Primary strategy: add { compact: true } as the last argument to addStepRow, addCalloutBox, and/or as the 4th argument to cardHtml on the affected slide. IMPORTANT: if any cardHtml on a slide needs compact, apply it to ALL cardHtml calls on that slide.
- Secondary strategy: reduce rowH for addStyledTable (e.g. 0.35 → 0.22).
- Tertiary: reduce bullet fontSize via { fontSize: 10 } opts.
- Do NOT remove content, change narration, or restructure unaffected slides.
- Do NOT change the require path.
- Output ONLY the fixed JavaScript code, no explanation, no markdown fences.`
    : `Fix this Node.js script. It failed with the error below.

ERROR:
${errorMessage}

BROKEN SCRIPT:
\`\`\`js
${brokenScript}
\`\`\`

Rules:
- Fix ONLY the code that caused the error
- Do NOT change the overall structure or content
- Do NOT change the require path
- Output ONLY the fixed JavaScript code, no explanation, no markdown fences`;

  const response = await client.messages.create({
    model: opts.model || 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  let fixed = response.content[0].text.trim();
  fixed = fixed.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim();

  const fixedPath = scriptPath.replace('.js', '_fixed.js');
  fs.writeFileSync(fixedPath, fixed);
  console.log(`✓ Fixed build script: ${fixedPath}`);
  return fixedPath;
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
{"issues":[{"slide":${slideNum},"problem":"Step 1 badge clipped at top — only description text visible","fix":"Add { compact: true } to all addStepRow calls on this slide and addCalloutBox"}]}

Downsize fix strategies (overflow):
- addStepRow: pass { compact: true } as the last argument
- addCalloutBox: pass { compact: true } in opts
- cardHtml: pass { compact: true } as the 4th argument on ALL cardHtml calls on that slide
- addBullets: pass { fontSize: 10 } in opts
- addStyledTable: reduce rowH (e.g. from 0.35 to 0.22)

Column width fix (uneven whitespace / wrapping in tables):
- If a 2-column table has a short first column and long second column (or vice versa), add colWidths to the opts to set proportional widths, e.g. { colWidths: [1, 3] } for 25%/75% or { colWidths: [1, 2] } for 33%/67%

Upsize fix strategies (undersized):
- addBullets with explicit fontSize: increase N or remove fontSize constraint
- addStyledTable with low rowH: increase rowH (e.g. 0.22→0.32)
- addStepRow with compact: true: remove compact if ample space
- addCalloutBox with compact: true: remove compact if ample space

Respond with ONLY the JSON object, no explanation.`;

/**
 * Send rendered slide PNGs to Claude for visual overflow detection — one slide at a time.
 * Returns a fixed script path if issues were found and fixed, or null if all clear.
 */
async function visualCheckAndFix(outputDir, scriptPath, opts, apiKey) {
  let Anthropic;
  try { Anthropic = require('@anthropic-ai/sdk'); }
  catch { Anthropic = require(path.join(__dirname, '..', 'node_modules', '@anthropic-ai/sdk')); }

  const client = new Anthropic.default({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  });

  // Build PNG list without relying on readdir (fails on macOS-restricted dirs like Desktop).
  // Primary: readdir. Fallback: probe slide_001.png, slide_002.png, … with existsSync.
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
    if (pngFiles.length > 0) {
      console.log(`  (Used existsSync probe for slide list — readdir not permitted on this directory)`);
    }
  }

  if (pngFiles.length === 0) return null;

  // Check each slide individually so each gets full model attention.
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
  console.log('  Asking Claude to fix layout...\n');

  const buildScript = fs.readFileSync(scriptPath, 'utf8');
  const errorDesc = allIssues
    .map(i => `Slide ${i.slide}: ${i.problem}. Suggested fix: ${i.fix}`)
    .join('\n');

  return fixBuildScript(scriptPath, errorDesc, opts, /* isLayoutFix */ true);
}

/**
 * Semantic conversion: Claude maps PDF → build script → render → Narakeet video.
 */
async function semanticConvert(pdfPath, outputDir, opts = {}) {
  console.log('\n── Semantic Convert ─────────────────────────────────────────\n');
  console.log(`  PDF:    ${pdfPath}`);
  console.log(`  Output: ${outputDir}\n`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const timing = {};
  const t = () => Date.now();
  let t0;

  // 1. Generate build script via Claude
  t0 = t();
  let scriptPath = await generateBuildScript(pdfPath, outputDir, opts);
  timing.claudeAnalysis = t() - t0;

  // 2. Execute the generated build script (with up to 2 retries on error)
  console.log('\n  Executing generated build script...\n');
  t0 = t();
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      execSync(`node "${scriptPath}"`, { stdio: 'inherit', cwd: outputDir });
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        console.log(`\n  Build script failed (attempt ${attempt}). Asking Claude to fix it...\n`);
        try {
          scriptPath = await fixBuildScript(scriptPath, err.message, opts);
        } catch (fixErr) {
          console.warn('  Could not auto-fix build script:', fixErr.message);
          break;
        }
      }
    }
  }
  if (lastErr) {
    throw new Error(`Generated build script failed after retry. Check ${scriptPath} for errors.\n${lastErr.message}`);
  }
  timing.rendering = t() - t0;

  // 3. Visual check — detect overflow and auto-fix (up to 1 correction pass)
  t0 = t();
  const apiKey = await resolveApiKey('ANTHROPIC_API_KEY');
  const fixedScript = await visualCheckAndFix(outputDir, scriptPath, opts, apiKey);
  if (fixedScript) {
    console.log('\n  Re-rendering with layout fixes...\n');
    try {
      execSync(`node "${fixedScript}"`, { stdio: 'inherit', cwd: outputDir });
      scriptPath = fixedScript;
    } catch (fixRunErr) {
      console.warn('  Layout-fixed script failed to run:', fixRunErr.message);
    }
  }
  timing.visualCheck = t() - t0;

  // 4. Submit to Narakeet (unless --no-video)
  if (!opts.noVideo) {
    console.log('\n── Submitting to Narakeet ──────────────────────────────────\n');
    const tpl = require(path.join(RENDERER_ROOT, 'scripts/sai_html_template.js'))({
      seriesTitle: opts.seriesTitle || path.basename(pdfPath, '.pdf'), totalModules: opts.totalModules || 1,
    });
    const pres = tpl.createPresentation();
    const videoFilename = opts.videoFilename || (path.basename(pdfPath, '.pdf') + '.mp4');
    t0 = t();
    const videoPath = await pres.submitToNarakeet(outputDir, { videoFilename });
    timing.narakeet = t() - t0;
    return { scriptPath, videoPath, timing };
  }

  return { scriptPath, timing };
}

module.exports = { semanticConvert };
