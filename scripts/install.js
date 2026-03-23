#!/usr/bin/env node
'use strict';

/**
 * shockproof-skills install CLI
 *
 * Usage:
 *   npx @shockproofai/shockproof-skills install <skill-id> [--target <dir>]
 *   node scripts/install.js <skill-id> [--target <dir>]
 *   node scripts/install.js list
 *
 * Copies a skill (and its shared dependencies) from this package into
 * the target project's .claude/skills/ directory and prints the CLAUDE.md
 * registration snippet.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'registry.json'), 'utf8'));

// ── Helpers ──────────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function resolveTargetSkillsDir(targetArg) {
  if (targetArg) return path.resolve(targetArg);
  // Walk up from cwd to find a .claude/skills directory
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, '.claude', 'skills');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  // Fallback: create .claude/skills in cwd
  return path.join(process.cwd(), '.claude', 'skills');
}

function listSkills() {
  console.log('\nAvailable skills in the Shockproof Skills marketplace:\n');
  for (const skill of registry.skills) {
    const tags = skill.tags.slice(0, 4).join(', ');
    console.log(`  ${skill.id.padEnd(32)} v${skill.version}`);
    console.log(`    ${skill.description}`);
    console.log(`    Tags: ${tags}\n`);
  }
  console.log(`Install a skill:`);
  console.log(`  npx @shockproofai/shockproof-skills install <skill-id>\n`);
}

function installSkill(skillId, targetArg) {
  const skill = registry.skills.find(s => s.id === skillId);
  if (!skill) {
    console.error(`\nError: skill "${skillId}" not found in registry.\n`);
    console.error('Run with "list" to see available skills.');
    process.exit(1);
  }

  const targetSkillsDir = resolveTargetSkillsDir(targetArg);
  const skillSrc = path.join(REPO_ROOT, skill.path);
  const skillDest = path.join(targetSkillsDir, 'shockproof-skills', skill.id);

  console.log(`\nInstalling "${skill.name}" (v${skill.version})...`);

  // Copy skill directory
  copyDir(skillSrc, skillDest);
  console.log(`  ✓ Copied skill to ${skillDest}`);

  // Copy shared dependencies
  const sharedNames = skill.shared || [];
  for (const sharedName of sharedNames) {
    const sharedSrc = path.join(REPO_ROOT, 'skills', 'shared', sharedName);
    const sharedDest = path.join(targetSkillsDir, 'shockproof-skills', 'shared', sharedName);
    if (fs.existsSync(sharedSrc)) {
      copyDir(sharedSrc, sharedDest);
      console.log(`  ✓ Copied shared package "${sharedName}"`);
    }
  }

  // Print CLAUDE.md registration snippet
  const relSkillmd = path.join('.claude', 'skills', 'shockproof-skills', skill.id, 'SKILL.md');
  console.log(`\n✅ Done! Register the skill in your CLAUDE.md:\n`);
  console.log(`  - **[${skill.id}](${relSkillmd})** — ${skill.description}\n`);

  // Print env var reminders
  const envVars = skill.dependencies?.env || [];
  if (envVars.length > 0) {
    console.log(`⚠️  This skill requires the following environment variables:`);
    for (const v of envVars) console.log(`   - ${v}`);
    console.log();
  }

  // Print npm install reminder for shared deps
  if (sharedNames.length > 0) {
    console.log(`📦 Install shared renderer dependencies:`);
    console.log(`   cd ${path.join(targetSkillsDir, 'shockproof-skills', 'shared', 'html-slide-renderer')}`);
    console.log(`   npm install\n`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(`
Usage:
  npx @shockproofai/shockproof-skills <command> [options]

Commands:
  list                          List all available skills
  install <skill-id>            Install a skill into this project
    --target <dir>              Custom target directory (default: nearest .claude/skills/)
  help                          Show this help message

Examples:
  npx @shockproofai/shockproof-skills list
  npx @shockproofai/shockproof-skills install create-html-deck
  npx @shockproofai/shockproof-skills install convert-pdf-to-html-deck --target ./my-project
`);
  process.exit(0);
}

if (command === 'list') {
  listSkills();
  process.exit(0);
}

if (command === 'install') {
  const skillId = args[1];
  if (!skillId) {
    console.error('Error: missing <skill-id>. Run "list" to see available skills.');
    process.exit(1);
  }
  const targetIdx = args.indexOf('--target');
  const targetArg = targetIdx !== -1 ? args[targetIdx + 1] : null;
  installSkill(skillId, targetArg);
  process.exit(0);
}

console.error(`Unknown command: "${command}". Run with --help for usage.`);
process.exit(1);
