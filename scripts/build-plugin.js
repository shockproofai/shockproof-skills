#!/usr/bin/env node
'use strict';

/**
 * Build shockproof-skills.plugin
 *
 * A .plugin file is a zip of the plugin contents, used to manually
 * install the marketplace in Claude Cowork / Claude Code.
 *
 * Usage:
 *   node scripts/build-plugin.js [--output <path>]
 *   pnpm run build:plugin
 *
 * Output: shockproof-skills.plugin (in repo root by default)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputPath = outputIdx !== -1
  ? path.resolve(args[outputIdx + 1])
  : path.join(REPO_ROOT, 'shockproof-skills.plugin');

// Remove existing file
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
  console.log(`Removed existing ${path.basename(outputPath)}`);
}

console.log('Building shockproof-skills.plugin...\n');

// Build the zip, excluding dev/build artifacts
execSync(
  `zip -r "${outputPath}" . \
    -x "*.git*" \
    -x "node_modules/*" \
    -x "scripts/build-plugin.js" \
    -x "*/mnt/outputs/*" \
    -x "*.plugin" \
    -x ".DS_Store"`,
  { cwd: REPO_ROOT, stdio: 'inherit' }
);

const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`\n✅  Built: ${outputPath} (${sizeKb} KB)`);
console.log(`\nDrop shockproof-skills.plugin into Claude Cowork to install.`);
