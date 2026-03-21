'use strict';
const fs = require('fs');
const { SCALE, PT } = require('./constants');

function px(inches) { return Math.round(inches * SCALE); }
function pt(points) { return +(points * PT).toFixed(2); }

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadLogoDataUri(logoPath) {
  try {
    const data = fs.readFileSync(logoPath);
    return 'data:image/png;base64,' + data.toString('base64');
  } catch (e) {
    return '';
  }
}

// ─── Text fitting (for dynamic font sizing decisions) ───────────────────────
function wrapText(text, maxWidthPx, fontSizePx, avgCharRatio = 0.42) {
  const charsPerLine = Math.max(10, Math.floor(maxWidthPx / (fontSizePx * avgCharRatio)));
  const words = String(text).split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (test.length > charsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitFontSize(text, widthPx, heightPx, startSize, minSize = 8) {
  let sz = startSize;
  while (sz >= minSize) {
    const lineH = pt(sz) * 1.4;
    const maxLines = Math.floor(heightPx / lineH);
    const lines = wrapText(text, widthPx, pt(sz));
    if (lines.length <= maxLines) return sz;
    sz -= 0.5;
  }
  return minSize;
}

// ─── Bold-prefix rendering ──────────────────────────────────────────────────
function boldPrefixHtml(text, color) {
  const colonIdx = text.indexOf(': ');
  if (colonIdx > 0 && colonIdx < 60) {
    const boldPart = esc(text.substring(0, colonIdx + 1));
    const restPart = esc(text.substring(colonIdx + 1));
    return `<span style="color:${color}"><strong>${boldPart}</strong>${restPart}</span>`;
  }
  return `<span style="color:${color}">${esc(text)}</span>`;
}

module.exports = { px, pt, esc, loadLogoDataUri, wrapText, fitFontSize, boldPrefixHtml };
