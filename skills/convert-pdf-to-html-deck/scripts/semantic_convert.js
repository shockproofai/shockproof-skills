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

  const seriesTitle  = opts.seriesTitle  || 'Converted Presentation';
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
2. Uses seriesTitle: "${seriesTitle}", totalModules: ${totalModules}
3. Sets MODULE_NUM = ${moduleNum}
4. Infers MODULE_TITLE, TOTAL_PAGES from the PDF content
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
- Bullet list → addBullets
- Checklist items → addChecklist
- 2–4 cards side by side → startRow() + cardHtml()
- 2 tables side by side → startRow() + tableHtml()
- Single table → addStyledTable
- Tip/warning/callout → addCalloutBox
- Key takeaways (numbered, max 4) → addKeyTakeaways
- Warning pairs → addRedFlagPairs
- Stat/metric highlights → startRow() + cardHtml() with big number as title

## Narration rules
- Write for a human narrator speaking to an audience
- Synthesize, don't read bullet points verbatim
- Do NOT start with "In this slide" or "As you can see"
- 2–4 sentences per slide, under 60 words
- For slides with bullet lists, step sequences, or card sets: ALWAYS open the narration by explaining WHY the content matters or how the learner will use it — before mentioning any items. Do not enumerate items or announce how many there are. Frame first, detail second.

Output ONLY the JavaScript code. No markdown fences, no explanation.`;

  const response = await client.messages.create({
    model: opts.model || 'claude-haiku-4-5',
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
        model: opts.model || 'claude-haiku-4-5',
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
  const apiKey = process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
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
    model: opts.model || 'claude-haiku-4-5',
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

/**
 * Send rendered slide PNGs to Claude for visual overflow detection.
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

  const buildScript = fs.readFileSync(scriptPath, 'utf8');

  const content = [];
  for (const p of pngFiles) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: fs.readFileSync(p).toString('base64') },
    });
  }
  content.push({
    type: 'text',
    text: `Above are ${pngFiles.length} rendered slide PNGs (1280×720px each). Each slide has a blue header bar at top, content area in the middle, and a light-grey footer bar at the bottom.

Check each slide for TWO types of layout problems:

OVERFLOW (content too big):
1. Content overflowing into or past the footer (content cut off at bottom)
2. Content cut off at the top (pushed above the header)
3. A slide that is nearly empty when it clearly should have content (suggests extreme overflow where all content is off-screen)

UNDERSIZED (content too small / too much whitespace):
4. Content occupies less than ~60% of the available content area with large empty space at the bottom — this means font sizes or row heights were over-constrained and should be increased

The build script that generated these slides:
\`\`\`js
${buildScript}
\`\`\`

If all slides look correct, respond with exactly: {"ok":true}
If there are issues, respond with JSON like:
{"issues":[{"slide":4,"problem":"Table rows cut off at bottom — only 2 of 7 rows visible","fix":"Add { compact: true } as the 6th argument to each addStepRow call on this slide, and add { compact: true } opts to addCalloutBox"},{"slide":3,"problem":"Bullets occupy only top 40% of content area — font size too small","fix":"Remove { fontSize: 9 } from addBullets call to restore default font size"}]}

Downsize fix strategies (overflow):
- For slides using addStepRow: pass { compact: true } as the last argument to shrink badge, fonts, and row height
- For slides using addCalloutBox: pass { compact: true } in the opts object to reduce font size and padding
- For slides using cardHtml (called inside startRow): pass { compact: true } as the 4th argument on ALL cardHtml calls on that slide (not just the clipping card) — e.g. cardHtml(C.blue, "Title", items, { compact: true }) — to shrink title/body fonts and card padding consistently
- For slides using addBullets: pass { fontSize: 10 } in opts to shrink bullet text
- For slides using addStyledTable: reduce rowH (e.g. from 0.35 to 0.22)
- Remove a calloutBox entirely only as a last resort if compact mode is insufficient

Upsize fix strategies (undersized/whitespace):
- For slides using addBullets with an explicit { fontSize: N }: increase N (e.g. 9→12, 10→13) or remove the fontSize constraint entirely to restore default
- For slides using addStyledTable with a low rowH: increase rowH (e.g. 0.22→0.32, 0.26→0.32)
- For slides using addStepRow with { compact: true }: remove compact if there is ample space
- For slides using addCalloutBox with { compact: true }: remove compact if there is ample space

Respond with ONLY the JSON object, no explanation.`,
  });

  console.log(`  Visually checking ${pngFiles.length} slides for overflow...`);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content }],
  });

  const raw = response.content[0].text.trim();
  let result;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : { ok: true };
  } catch {
    console.warn('  Could not parse visual check response — skipping auto-fix');
    return null;
  }

  if (result.ok || !result.issues || result.issues.length === 0) {
    console.log('  ✓ Visual check passed — no overflow detected');
    return null;
  }

  console.log(`  ⚠ Visual check found ${result.issues.length} issue(s):`);
  result.issues.forEach(i => console.log(`    Slide ${i.slide}: ${i.problem}`));
  console.log('  Asking Claude to fix layout...\n');

  const errorDesc = result.issues
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
      seriesTitle: opts.seriesTitle || 'Converted', totalModules: opts.totalModules || 1,
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
