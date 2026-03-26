'use strict';
const fs   = require('fs');
const path = require('path');

const SKILL_ROOT = path.join(__dirname, '..');

/**
 * Rasterise every page of a PDF to 1280px-wide PNG files using pdftoppm
 * (part of the poppler-utils package). Runs entirely locally — no network
 * calls, no cloud function, no GCS credentials required.
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

  const rawFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('slide-') && f.endsWith('.png'))
    .sort((a, b) => {
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

  if (pages.length === 0) {
    const result = await pdfParse(buf);
    const fullText = result.text || '';
    fullText.split(/\f/).forEach(p => pages.push(p.trim()));
  }

  return pages;
}

module.exports = { extractPNGs, extractPageText };
