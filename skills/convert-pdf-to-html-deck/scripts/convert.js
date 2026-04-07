#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

function usage() {
  console.log(`
Usage: node convert.js <pdf-path> [options]

Options:
  --lossless            Keep original PDF page PNGs; only generate narration + video
  --no-video            Skip Narakeet submission (stop after PNGs/PDF/ZIP)
  --output <dir>        Output directory (default: ./mnt/outputs/<pdf-basename>/)
  --series-title "X"    Series title for the presentation
  --module-num N        Module number (default: 1)
  --module-title "X"    Module title (optional; Claude infers if not set)
  --total-modules N     Total modules in series (default: 1)
  --video-filename X    Output MP4 filename (default: <pdf-basename>.mp4)

Examples:
  node convert.js input.pdf --lossless
  node convert.js input.pdf --output ./out --series-title "Risk Training" --module-num 2
  node convert.js input.pdf --no-video
`);
  process.exit(0);
}

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (!args.length || args[0] === '--help') usage();

const pdfPath = path.resolve(args[0]);
if (!fs.existsSync(pdfPath)) {
  console.error(`❌ File not found: ${pdfPath}`);
  process.exit(1);
}

const opts = {
  lossless:      args.includes('--lossless'),
  noVideo:       args.includes('--no-video'),
  seriesTitle:   null,
  moduleNum:     1,
  moduleTitle:   null,
  totalModules:  1,
  videoFilename: null,
  output:        null,
};

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--series-title'  && args[i+1]) { opts.seriesTitle   = args[++i]; }
  if (args[i] === '--module-num'    && args[i+1]) { opts.moduleNum     = parseInt(args[++i], 10); }
  if (args[i] === '--module-title'  && args[i+1]) { opts.moduleTitle   = args[++i]; }
  if (args[i] === '--total-modules' && args[i+1]) { opts.totalModules  = parseInt(args[++i], 10); }
  if (args[i] === '--video-filename'&& args[i+1]) { opts.videoFilename = args[++i]; }
  if (args[i] === '--output'        && args[i+1]) { opts.output        = path.resolve(args[++i]); }
}

const pdfBasename = path.basename(pdfPath, '.pdf');
const outputDir   = opts.output ||
  path.join(__dirname, '..', 'mnt', 'outputs', pdfBasename);

// ── Run ───────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const mode = opts.lossless ? 'lossless' : 'semantic';
    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  convert-pdf-to-html-deck  [${mode.padEnd(8)}] mode        ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝`);

    let result;
    if (opts.lossless) {
      const { losslessConvert } = require('./lossless_convert');
      result = await losslessConvert(pdfPath, outputDir, opts);
    } else {
      const { semanticConvert } = require('./semantic_convert');
      result = await semanticConvert(pdfPath, outputDir, opts);
    }

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('✅  Conversion complete!');
    console.log(`   Output: ${outputDir}`);
    if (result.videoPath) console.log(`   Video:  ${result.videoPath}`);

    // Timing table
    if (result.timing) {
      const fmt = ms => ms >= 60000
        ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
        : `${(ms / 1000).toFixed(1)}s`;
      const T = result.timing;
      const rows = [
        ['Step', 'Time'],
        ['─────────────────────────', '──────'],
      ];
      if (opts.lossless) {
        rows.push(['PDF rasterisation',     fmt(T.rasterisation || 0)]);
        rows.push([T.narration === 0 ? 'Narration (speaker notes)' : 'Narration (Claude)', fmt(T.narration || 0)]);
        rows.push(['ZIP build',              fmt(T.zip           || 0)]);
      } else {
        rows.push(['PDF analysis (Claude)',  fmt(T.claudeAnalysis || 0)]);
        rows.push(['Slide rendering',        fmt(T.rendering      || 0)]);
        if (T.visualCheck != null)
          rows.push(['Visual check + fix',   fmt(T.visualCheck)]);
      }
      if (T.narakeet != null)
        rows.push(['Narakeet upload + build', fmt(T.narakeet)]);
      console.log('');
      rows.forEach(([label, val]) =>
        console.log(`   ${label.padEnd(26)} ${val}`)
      );
    }

    console.log('══════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌  Conversion failed:', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
})();
