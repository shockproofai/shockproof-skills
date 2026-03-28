'use strict';
const fs   = require('fs');
const path = require('path');
const { extractPNGs, extractPageText } = require('./extract_pages');
const { resolveApiKey } = require('./resolve_api_key');

// Narration principles live in the skill root (copy of agents/courseassistant/shared/narration-principles.md)
const NARRATION_PRINCIPLES = fs.readFileSync(
  path.join(__dirname, '..', 'narration-principles.md'), 'utf8'
);

const RENDERER_ROOT = path.join(__dirname, '../../shared/html-slide-renderer');

/**
 * Generate spoken narration for all pages in one batched Claude API call.
 * Uses extracted text (and optionally page images) as input.
 */
async function generateNarration(pages, apiKey) {
  let Anthropic;
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch {
    Anthropic = require(path.join(__dirname, '..', 'node_modules', '@anthropic-ai/sdk'));
  }
  const client = new Anthropic.default({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  });

  const BATCH_SIZE = 10;
  const narrations = [];

  for (let start = 0; start < pages.length; start += BATCH_SIZE) {
    const batch = pages.slice(start, start + BATCH_SIZE);
    const batchEnd = Math.min(start + BATCH_SIZE, pages.length);
    console.log(`  Sending pages ${start + 1}–${batchEnd} of ${pages.length} to Claude for narration...`);

    const pageList = batch
      .map((text, i) => `--- Page ${start + i + 1} ---\n${text || '(no extractable text)'}`)
      .join('\n\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: `You are writing spoken narration for a training presentation video.

Below is the text content extracted from ${batch.length} page(s) of a PDF presentation.
For EACH page, write 2–4 sentences of natural spoken narration suitable for a narrator presenting the slide.

Rules:
- Write conversationally, as if speaking to an audience
- Do NOT read bullet points verbatim — synthesize and explain
- Do NOT start with "In this slide" or "As you can see"
- Do NOT include stage directions or parenthetical notes
- Target at least 30 seconds of narration per content slide (~75+ words); 60–90 seconds for complex slides
- For slides with bullet lists, step sequences, or card sets: open with a sentence explaining WHY the content matters before mentioning any items. Do not announce how many items there are. After framing, you may address individual items — paraphrase and explain each one, do not read them verbatim.

You MUST also follow all of the narration principles below:

${NARRATION_PRINCIPLES}

Respond with a JSON array of exactly ${batch.length} strings, one narration per page, in the same order as the pages.
Example: ["Narration for page 1.", "Narration for page 2.", ...]

Page content:
${pageList}`,
      }],
    });

    const raw = response.content[0].text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error(`Claude did not return a valid JSON array for pages ${start + 1}–${batchEnd}`);

    const batchNarrations = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(batchNarrations) || batchNarrations.length !== batch.length) {
      throw new Error(`Expected ${batch.length} narrations for pages ${start + 1}–${batchEnd}, got ${batchNarrations.length}`);
    }

    narrations.push(...batchNarrations);
  }

  console.log(`  Generated narration for ${narrations.length} slides`);
  return narrations;
}

/**
 * Write narakeet-script.md pairing each PNG with its narration.
 */
function writeNarakeetScript(outputDir, pngPaths, narrations, opts = {}) {
  const voice      = opts.voice      || 'hannah';
  const size       = opts.size       || '1080p';
  const transition = opts.transition || 'crossfade 0.25';

  const lines = [
    '---',
    `size: ${size}`,
    `voice: ${voice}`,
    `transition: ${transition}`,
    'subtitles:',
    '  mode: embed',
    'canvas: white',
    '---',
  ];

  pngPaths.forEach((p, i) => {
    const fname = path.basename(p);
    lines.push('', `(image: ${fname})`, '', narrations[i] || 'No narration provided.', '', '---');
  });

  const scriptPath = path.join(outputDir, 'narakeet-script.md');
  fs.writeFileSync(scriptPath, lines.join('\n'));
  console.log(`✓ Narakeet script: ${scriptPath}  (${pngPaths.length} scenes)`);
  return scriptPath;
}

/**
 * Build narakeet.zip with archiver (same approach as shared renderer).
 */
async function buildZip(outputDir, pngPaths) {
  let archiver;
  try { archiver = require('archiver'); }
  catch { archiver = require(path.join(RENDERER_ROOT, 'node_modules', 'archiver')); }

  const scriptPath = path.join(outputDir, 'narakeet-script.md');
  const zipPath    = path.join(outputDir, 'narakeet.zip');
  const output     = fs.createWriteStream(zipPath);
  const archive    = archiver('zip', { zlib: { level: 9 } });

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });

  archive.pipe(output);
  archive.file(scriptPath, { name: 'narakeet-script.md' });
  pngPaths.forEach(p => archive.file(p, { name: path.basename(p) }));
  await archive.finalize();
  await done;

  const sizeMB = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
  console.log(`✓ Narakeet ZIP: ${zipPath}  (${pngPaths.length} PNGs + script, ${sizeMB} MB)`);
  return zipPath;
}

/**
 * Lossless conversion: original PDF pages → narration → Narakeet video.
 */
async function losslessConvert(pdfPath, outputDir, opts = {}) {
  console.log('\n── Lossless Convert ────────────────────────────────────────\n');
  console.log(`  PDF:    ${pdfPath}`);
  console.log(`  Output: ${outputDir}\n`);

  const timing = {};
  const t = () => Date.now();
  let t0;

  // 1. Extract PNGs + text
  t0 = t();
  const pngPaths = await extractPNGs(pdfPath, outputDir);
  const pageTexts = await extractPageText(pdfPath);
  timing.rasterisation = t() - t0;

  // Align text array length to png count
  while (pageTexts.length < pngPaths.length) pageTexts.push('');

  // 2. Generate narration
  const apiKey = await resolveApiKey('ANTHROPIC_API_KEY');
  t0 = t();
  const narrations = await generateNarration(pageTexts.slice(0, pngPaths.length), apiKey);
  timing.narration = t() - t0;

  // 3. Write narration JSON
  t0 = t();
  const narrationObj = {};
  narrations.forEach((n, i) => { narrationObj[String(i + 1)] = n; });
  fs.writeFileSync(path.join(outputDir, 'slide-narration.json'), JSON.stringify(narrationObj, null, 2));
  console.log(`✓ Narration JSON: ${path.join(outputDir, 'slide-narration.json')}`);

  // 4. Write Narakeet script
  writeNarakeetScript(outputDir, pngPaths, narrations, opts);

  // 5. Build ZIP
  await buildZip(outputDir, pngPaths);
  timing.zip = t() - t0;

  // 6. Submit to Narakeet (unless --no-video)
  let videoPath;
  if (!opts.noVideo) {
    console.log('\n── Submitting to Narakeet ──────────────────────────────────\n');
    // Use shared renderer's submitToNarakeet via an empty presentation object
    const tpl = require(path.join(RENDERER_ROOT, 'scripts/sai_html_template.js'))({
      seriesTitle: 'Lossless Convert', totalModules: 1,
    });
    const pres = tpl.createPresentation();
    const videoFilename = opts.videoFilename || path.basename(pdfPath, '.pdf') + '.mp4';
    t0 = t();
    videoPath = await pres.submitToNarakeet(outputDir, { videoFilename });
    timing.narakeet = t() - t0;
    return { pngPaths, videoPath, timing };
  }

  return { pngPaths, timing };
}

module.exports = { losslessConvert };
