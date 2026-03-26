#!/usr/bin/env node
'use strict';

/**
 * Build pdf-lossless-deck.plugin
 *
 * Packages skills/pdf-lossless-deck/ as a standalone installable .plugin file
 * and copies it to the most recently active Cowork session outputs directory.
 *
 * Usage:
 *   node scripts/build-lossless-plugin.js [--output <path>]
 *   npm run build:pdf-lossless-deck
 *
 * Output: pdf-lossless-deck.plugin (in repo root by default)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const REPO_ROOT   = path.join(__dirname, '..');
const SKILL_ROOT  = path.join(REPO_ROOT, 'skills', 'pdf-lossless-deck');

if (!fs.existsSync(SKILL_ROOT)) {
  console.error(`❌  Plugin source not found: ${SKILL_ROOT}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputPath = outputIdx !== -1
  ? path.resolve(args[outputIdx + 1])
  : path.join(REPO_ROOT, 'pdf-lossless-deck.plugin');

// Remove existing
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
  console.log(`Removed existing ${path.basename(outputPath)}`);
}

console.log('Building pdf-lossless-deck.plugin...\n');

execSync(
  `zip -r "${outputPath}" . \
    -x "*.git*" \
    -x "node_modules/*" \
    -x "*/mnt/outputs/*" \
    -x "*.plugin" \
    -x ".DS_Store"`,
  { cwd: SKILL_ROOT, stdio: 'inherit' }
);

const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`\n✅  Built: ${outputPath} (${sizeKb} KB)`);

// ── Auto-deliver to most recent Cowork session outputs ────────────────────────
const sessionsRoot = path.join(
  os.homedir(),
  'Library', 'Application Support', 'Claude', 'local-agent-mode-sessions'
);

if (fs.existsSync(sessionsRoot)) {
  try {
    // Walk outer sessions → inner sessions → local_* → outputs
    let latestOutputs = null;
    let latestMtime = 0;

    for (const outer of fs.readdirSync(sessionsRoot)) {
      const outerDir = path.join(sessionsRoot, outer);
      if (!fs.statSync(outerDir).isDirectory()) continue;

      for (const inner of fs.readdirSync(outerDir)) {
        const innerDir = path.join(outerDir, inner);
        if (!fs.statSync(innerDir).isDirectory()) continue;

        for (const local of fs.readdirSync(innerDir)) {
          if (!local.startsWith('local_')) continue;
          const outputsDir = path.join(innerDir, local, 'outputs');
          if (!fs.existsSync(outputsDir)) continue;

          const mtime = fs.statSync(outputsDir).mtimeMs;
          if (mtime > latestMtime) {
            latestMtime = mtime;
            latestOutputs = outputsDir;
          }
        }
      }
    }

    if (latestOutputs) {
      const dest = path.join(latestOutputs, 'pdf-lossless-deck.plugin');
      fs.copyFileSync(outputPath, dest);
      console.log(`📦  Delivered to Cowork outputs: ${dest}`);
    }
  } catch (err) {
    console.log(`  (Could not auto-deliver to Cowork: ${err.message})`);
  }
}

console.log(`\nDrop pdf-lossless-deck.plugin into Claude Cowork to install.`);
