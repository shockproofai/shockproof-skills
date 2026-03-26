#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

function usage() {
  console.log(`
Usage: node convert.js <pdf-path> [options]

Options:
  --no-video            Skip Narakeet submission (stop after PNGs + ZIP)
  --output <dir>        Output directory (default: ./mnt/outputs/<pdf-basename>/)
  --series-title "X"    Series title for the presentation
  --module-num N        Module number (default: 1)
  --module-title "X"    Module title (optional)
  --total-modules N     Total modules in series (default: 1)
  --video-filename X    Output MP4 filename (default: <pdf-basename>.mp4)

Examples:
  node convert.js input.pdf
  node convert.js input.pdf --no-video
  node convert.js input.pdf --output ./out --series-title "Risk Training" --module-num 2
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
    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  pdf-lossless-deck  [lossless mode]                       ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝`);

    const { losslessConvert } = require('./lossless_convert');
    const result = await losslessConvert(pdfPath, outputDir, opts);

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('✅  Conversion complete!');
    console.log(`   Output: ${outputDir}`);
    if (result.videoPath) console.log(`   Video:  ${result.videoPath}`);

    if (result.timing) {
      const fmt = ms => ms >= 60000
        ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
        : `${(ms / 1000).toFixed(1)}s`;
      const T = result.timing;
      console.log('');
      const rows = [
        ['Step', 'Time'],
        ['─────────────────────────', '──────'],
        ['PDF rasterisation',     fmt(T.rasterisation || 0)],
        ['Narration (Claude)',     fmt(T.narration     || 0)],
        ['ZIP build',              fmt(T.zip           || 0)],
      ];
      if (T.narakeet != null) rows.push(['Narakeet upload + build', fmt(T.narakeet)]);
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
