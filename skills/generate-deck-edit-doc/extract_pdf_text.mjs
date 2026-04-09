#!/usr/bin/env node
/**
 * Extract speaker notes and slide metadata from a PDF slide handout.
 *
 * Slide content (title, body, tables, cards) lives inside embedded images
 * and cannot be extracted via PDF text APIs — that step is handled by
 * Claude's vision analysis of the PDF pages.  This script extracts
 * everything that IS available as selectable PDF text:
 *   - Slide count and per-slide numbering
 *   - Speaker notes paragraphs
 *
 * Produces a skeleton intermediate JSON that Claude fills in with visual
 * slide content before passing to generate_edit_doc.mjs.
 *
 * Usage: node extract_pdf_text.mjs <input.pdf> [output_dir]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";
import { execSync } from "child_process";

// ── Auto-install pdfjs-dist ──────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localPkg = path.join(__dirname, "node_modules", "pdfjs-dist");

if (!fs.existsSync(localPkg)) {
  console.error("First run: installing pdfjs-dist into skill node_modules/ …");
  const nodeDir = path.dirname(process.execPath);
  const env = { ...process.env, PATH: `${nodeDir}:${process.env.PATH || ""}` };
  execSync("npm install --save pdfjs-dist", { cwd: __dirname, stdio: "inherit", env });
  console.error("Done.");
}

// Load pdfjs-dist via dynamic ESM import (v4+ ships only ESM builds)
const esmCandidates = [
  path.join(localPkg, "legacy", "build", "pdf.mjs"),
  path.join(localPkg, "build", "pdf.mjs"),
];
let pdfjsLib;
for (const p of esmCandidates) {
  if (fs.existsSync(p)) {
    pdfjsLib = await import(pathToFileURL(p).href);
    break;
  }
}
if (!pdfjsLib) {
  console.error("Could not load pdfjs-dist. Try: cd " + __dirname + " && npm install pdfjs-dist");
  process.exit(1);
}
const { getDocument } = pdfjsLib;
// ─────────────────────────────────────────────────────────────────────

const LINE_Y_TOL = 3; // pts — items within this Y distance are same line
const NOTES_RE = /^SPEAKER\s*NOTES$/;
const HEADER_RE = /^Slide\s+(\d+)\s+of\s+(\d+)$/;

// ── Main ─────────────────────────────────────────────────────────────

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node extract_pdf_text.mjs <input.pdf> [output_dir]");
  process.exit(1);
}

const outputDir = process.argv[3] || path.dirname(pdfPath);
const deckName = path.basename(pdfPath, path.extname(pdfPath));

const fileData = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data: fileData, useSystemFonts: true }).promise;

const slides = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  const styles = tc.styles || {};

  const items = tc.items
    .filter(it => it.str && it.str.trim())
    .map(it => ({
      text: it.str,
      x: r(it.transform[4]),
      y: r(it.transform[5]),
      fontSize: r(Math.abs(it.transform[0])),
      fontFamily: (styles[it.fontName] || {}).fontFamily || it.fontName || "",
      width: r(it.width || 0),
    }));

  slides.push(parsePage(items, p));
  page.cleanup();
}

const intermediate = {
  source_pdf: path.basename(pdfPath),
  deck_name: deckName,
  slide_count: doc.numPages,
  slides,
};

const outPath = path.join(outputDir, `${deckName}_intermediate.json`);
fs.writeFileSync(outPath, JSON.stringify(intermediate, null, 2));
console.log(`Intermediate: ${outPath}`);

// ── Page-level parsing ───────────────────────────────────────────────

function parsePage(items, pageNum) {
  // Sort top-to-bottom (high Y = page top), then left-to-right
  items.sort((a, b) => b.y - a.y || a.x - b.x);

  // Extract slide number from "Slide N of M"
  let slideNumber = pageNum;
  const headerIdx = items.findIndex(i => HEADER_RE.test(i.text.trim()));
  if (headerIdx >= 0) {
    slideNumber = parseInt(items[headerIdx].text.match(/\d+/)[0]);
  }

  // Split at "SPEAKER NOTES" divider
  const notesIdx = items.findIndex(i => NOTES_RE.test(i.text.trim()));
  const notesItems = notesIdx >= 0 ? items.slice(notesIdx + 1) : [];

  // Parse speaker notes into paragraphs
  const speakerNotes = mergeIntoParas(notesItems);

  // Return skeleton — title/subtitle/body will be filled by Claude vision
  return {
    slide_number: slideNumber,
    title: null,
    subtitle: null,
    body_shapes: [],
    table: null,
    cards: null,
    speaker_notes: speakerNotes,
  };
}

// ── Speaker notes ────────────────────────────────────────────────────

function mergeIntoParas(items) {
  if (items.length === 0) return [];

  const lines = groupIntoLines(items);
  if (lines.length === 0) return [];

  // Merge adjacent lines into paragraphs; large Y gaps → paragraph break
  const paras = [];
  let cur = mergeLineText(lines[0].items);

  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1].y - lines[i].y;
    const text = mergeLineText(lines[i].items);
    if (!text) continue;

    if (gap > 15) {
      if (cur) paras.push(cur);
      cur = text;
    } else {
      cur += " " + text;
    }
  }
  if (cur) paras.push(cur);

  return paras;
}

// ── Line grouping ────────────────────────────────────────────────────

function groupIntoLines(items) {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const lines = [];
  let cur = { y: sorted[0].y, items: [sorted[0]] };

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - cur.y) <= LINE_Y_TOL) {
      cur.items.push(sorted[i]);
    } else {
      lines.push(cur);
      cur = { y: sorted[i].y, items: [sorted[i]] };
    }
  }
  lines.push(cur);

  for (const l of lines) l.items.sort((a, b) => a.x - b.x);
  return lines;
}

function mergeLineText(items) {
  if (!items || items.length === 0) return "";
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let result = sorted[0].text;
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].x + sorted[i - 1].width;
    result += (sorted[i].x - prevEnd > 3 ? " " : "") + sorted[i].text;
  }
  return result.trim();
}

function r(n) {
  return Math.round(n * 10) / 10;
}
