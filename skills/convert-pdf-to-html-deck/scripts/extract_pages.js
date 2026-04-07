'use strict';
const fs   = require('fs');
const path = require('path');

const SKILL_ROOT = path.join(__dirname, '..');

/**
 * Detect whether each PDF page has exactly one embedded image (i.e. a
 * PowerPoint-style handout where the slide visual is a JPEG/PNG embedded in
 * the page and speaker notes are separate text). Returns the page count if
 * true, or null if the structure doesn't match.
 */
function detectEmbeddedSlideImages(pdfPath, pageCount) {
  const { spawnSync } = require('child_process');
  const result = spawnSync('pdfimages', ['-list', pdfPath], { encoding: 'utf8' });
  if (result.status !== 0) return null;

  const lines = result.stdout.trim().split('\n')
    .filter(l => /^\s*\d+/.test(l)); // data rows only

  if (lines.length !== pageCount) return null;

  // Verify every row is a raster image (not a mask / smask)
  const allImages = lines.every(l => {
    const cols = l.trim().split(/\s+/);
    return cols[2] === 'image'; // type column
  });

  return allImages ? lines.length : null;
}

/**
 * Extract embedded JPEG/PNG images from a PDF using pdfimages.
 * One image per page is expected (handout-style PDFs).
 * Files are renamed to slide_001.png, slide_002.png, ...
 */
function extractEmbeddedImages(pdfPath, outputDir) {
  const { spawnSync } = require('child_process');
  const prefix = path.join(outputDir, 'emb');

  // -j  → save JPEGs as .jpg rather than converting to PPM
  // -png → save PNGs as .png (for any PNG-encoded images)
  const result = spawnSync('pdfimages', ['-j', pdfPath, prefix], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`pdfimages failed: ${result.stderr || result.error?.message}`);
  }

  const rawFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('emb-') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.ppm')))
    .sort((a, b) => {
      const n = s => parseInt(s.replace(/^emb-0*/, '').replace(/\.\w+$/, ''), 10);
      return n(a) - n(b);
    });

  const pngPaths = rawFiles.map((f, i) => {
    const src  = path.join(outputDir, f);
    const dest = path.join(outputDir, `slide_${String(i + 1).padStart(3, '0')}.png`);
    fs.renameSync(src, dest);
    return dest;
  });

  return pngPaths;
}

/**
 * Rasterise every page of a PDF to 1280px-wide PNG files using pdftoppm
 * (part of the poppler-utils package). Runs entirely locally — no network
 * calls, no cloud function, no GCS credentials required.
 *
 * If the PDF has exactly one embedded raster image per page (e.g. a
 * PowerPoint handout with speaker-notes text), pdfimages is used to extract
 * the clean slide images directly — avoiding the note-text bleed-through that
 * pdftoppm rasterisation would produce.
 *
 * Install poppler:
 *   macOS:  brew install poppler
 *   Ubuntu: apt-get install poppler-utils
 *
 * Files are named slide_001.png, slide_002.png, ...
 */
async function extractPNGs(pdfPath, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const { spawnSync } = require('child_process');

  // ── Try embedded-image extraction first ──────────────────────────────────
  const pageCount = await getPDFPageCount(pdfPath);
  const embeddedCount = detectEmbeddedSlideImages(pdfPath, pageCount);
  if (embeddedCount !== null) {
    console.log(`  Detected ${embeddedCount} embedded slide image(s) — extracting with pdfimages...`);
    const pngPaths = extractEmbeddedImages(pdfPath, outputDir);
    console.log(`  Extracted ${pngPaths.length} slide images`);
    return pngPaths;
  }

  // ── Fallback: full-page rasterisation via pdftoppm ───────────────────────
  // pdftoppm -scale-to-x 1280 scales the page width to 1280px (height follows
  // aspect ratio, so a 16:9 PDF produces 1280×720 PNGs automatically).
  // The output prefix becomes: <outputDir>/slide-<n>.png
  const prefix = path.join(outputDir, 'slide');
  console.log(`  Rasterising PDF with pdftoppm...`);
  const result = spawnSync('pdftoppm', [
    '-png',
    '-scale-to-x', '1280',
    '-scale-to-y', '-1',
    pdfPath,
    prefix,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    const msg = result.stderr || result.error?.message || 'unknown error';
    throw new Error(
      `pdftoppm failed (exit ${result.status}): ${msg}\n` +
      'Make sure poppler-utils is installed: brew install poppler'
    );
  }

  // Collect pdftoppm output files (slide-1.png … or slide-001.png …) and
  // rename them to the canonical zero-padded format: slide_001.png, …
  const rawFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('slide-') && f.endsWith('.png'))
    .sort((a, b) => {
      // Sort numerically by the page number embedded in the filename
      const n = s => parseInt(s.replace(/^slide-0*/, '').replace('.png', ''), 10);
      return n(a) - n(b);
    });

  const pngPaths = rawFiles.map((f, i) => {
    const src  = path.join(outputDir, f);
    const dest = path.join(outputDir, `slide_${String(i + 1).padStart(3, '0')}.png`);
    fs.renameSync(src, dest);
    return dest;
  });

  console.log(`  Extracted ${pngPaths.length} slide PNGs`);
  return pngPaths;
}

/**
 * Get page count from a PDF using pdf-parse (lightweight).
 */
async function getPDFPageCount(pdfPath) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch {
    pdfParse = require(path.join(SKILL_ROOT, 'node_modules', 'pdf-parse'));
  }
  const buf = fs.readFileSync(pdfPath);
  const result = await pdfParse(buf);
  return result.numpages || 1;
}

/**
 * Extract text content per page from a PDF using pdf-parse.
 * Returns an array of strings (one per page).
 */
async function extractPageText(pdfPath) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch {
    pdfParse = require(path.join(SKILL_ROOT, 'node_modules', 'pdf-parse'));
  }

  const buf   = fs.readFileSync(pdfPath);
  const pages = [];

  const opts = {
    pagerender(pageData) {
      return pageData.getTextContent().then(tc => {
        const text = tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
        pages.push(text);
        return text;
      });
    },
  };

  await pdfParse(buf, opts);

  // Fall back: split on form-feed
  if (pages.length === 0) {
    const result = await pdfParse(buf);
    const fullText = result.text || '';
    fullText.split(/\f/).forEach(p => pages.push(p.trim()));
  }

  return pages;
}

/**
 * Detect and extract embedded speaker notes from per-page text.
 * Returns an array of narration strings if ALL pages match the
 * "Slide N of M SPEAKER NOTES ..." pattern, or null otherwise.
 */
function parseSpeakerNotes(pageTexts) {
  const NOTE_RE = /^Slide\s+\d+\s+of\s+\d+\s+SPEAKER\s+NOTES\s+(.+)$/s;
  const narrations = [];
  for (const text of pageTexts) {
    const match = text.match(NOTE_RE);
    if (!match || !match[1].trim()) return null;
    narrations.push(match[1].trim());
  }
  if (narrations.length === 0) return null;
  console.log(`  ✓ Detected embedded speaker notes on all ${narrations.length} pages — skipping AI narration`);
  return narrations;
}

module.exports = { extractPNGs, extractPageText, parseSpeakerNotes };
