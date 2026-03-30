// Shockproof AI HTML→PNG Slide Template (Flow-Based Layout)
// Generates pixel-perfect HTML/CSS slides → PNG (via Puppeteer) → PDF (via pdf-lib).
//
// Key design principles:
// - Flow-based layout: components auto-stack in a flex column between header and footer
// - No manual (x, y, w, h) coordinates needed for most components
// - Flexbox and CSS Grid handle spacing, wrapping, and alignment natively
// - Dynamic font sizing via CSS clamp() and JS pre-calculation where needed
// - Puppeteer screenshots each slide to PNG (1280×720)
//
// Usage:
//   const tpl = require("./sai_html_template.js")({ seriesTitle: "My Series", totalModules: 4 });
//   const { C, createPresentation, addChrome, addTitleSlide, ... } = tpl;

'use strict';
const path = require('path');
const { C, FONT, W, H, SCALE, PT, ACCENTS } = require('./constants');
const { px, pt, esc, loadLogoDataUri, wrapText, fitFontSize, boldPrefixHtml } = require('./utils');
const { BASE_STYLES, Slide } = require('./base_styles');
const makePresentation = require('./presentation');
const makeChrome = require('./components/chrome');
const makeSlideLayouts = require('./components/slide_layouts');
const makeCards = require('./components/cards');
const makeContent = require('./components/content');
const makeStructured = require('./components/structured');
const makeTakeaways = require('./components/takeaways');
const makeLayoutHelpers = require('./components/layout_helpers');

module.exports = function createTemplate(config = {}) {
  const SERIES_TITLE  = config.seriesTitle  || 'Training Series';
  const TOTAL_MODULES = config.totalModules || 1;
  const LOGO_PATH       = config.logoPath || path.join(__dirname, '../assets/shockproof_logo.png');
  const LOGO_WHITE_PATH = config.logoWhitePath || path.join(__dirname, '../assets/shockproof_logo_white.png');
  const LOGO_DATA       = loadLogoDataUri(LOGO_PATH);
  const LOGO_WHITE_DATA = loadLogoDataUri(LOGO_WHITE_PATH);

  function logoImgAbs(xIn, yIn, wIn, hIn) {
    if (!LOGO_DATA) return '';
    return `<img class="abs" src="${LOGO_DATA}" style="left:${px(xIn)}px;top:${px(yIn)}px;width:${px(wIn)}px;height:${px(hIn)}px;object-fit:contain;">`;
  }

  function logoImgInline(wIn, hIn, white) {
    const src = white ? LOGO_WHITE_DATA : LOGO_DATA;
    if (!src) return '';
    return `<img src="${src}" style="width:${px(wIn)}px;height:${px(hIn)}px;object-fit:contain;">`;
  }

  // ── Footer HTML (shared by all slide types) ────────────────────────────
  function footerHtml(moduleNum, moduleTitle, pageNum, totalPages, bg) {
    return `<div class="slide-footer" style="background:${bg || C.footerBg};">
      <span style="font-size:${pt(10)}px;color:${C.gray};">Module ${moduleNum} of ${TOTAL_MODULES}  |  ${esc(moduleTitle)}</span>
      <span style="font-size:${pt(10)}px;color:${C.gray};">${pageNum} / ${totalPages}</span>
    </div>`;
  }

  // Build shared context object passed to all component factories
  const ctx = {
    C, FONT, W, H, SCALE, PT, ACCENTS,
    px, pt, esc, boldPrefixHtml, wrapText, fitFontSize,
    BASE_STYLES, Slide,
    SERIES_TITLE, TOTAL_MODULES,
    LOGO_DATA, LOGO_WHITE_DATA,
    logoImgAbs, logoImgInline, footerHtml,
  };

  // Wire up all component modules
  const { addChrome } = makeChrome(ctx);
  // addChrome must be in ctx so takeaways can call it
  ctx.addChrome = addChrome;

  const { addTitleSlide, addSectionSlide, addClosingSlide } = makeSlideLayouts(ctx);
  const { addCard, addStatCard, cardHtml, addCardGrid, lucideIconSvg } = makeCards(ctx);
  const { addCalloutBox, addBullets, addChecklist } = makeContent(ctx);
  const { addStepRow, addComparison, addStyledTable, tableHtml } = makeStructured(ctx);
  const { addKeyTakeaways, addRedFlagPairs, addReferencesSlide } = makeTakeaways(ctx);
  const { startRow, addRawHtml } = makeLayoutHelpers(ctx);
  const createPresentation = makePresentation(ctx);

  // ─── Exports ─────────────────────────────────────────────────────────────
  return {
    C, FONT, ACCENTS, W, H,
    createPresentation,
    addChrome, addTitleSlide, addSectionSlide, addClosingSlide,
    addCard, addStatCard, addCardGrid, addCalloutBox,
    addStepRow, addComparison, addStyledTable, addKeyTakeaways,
    addRedFlagPairs, addChecklist, addBullets, addReferencesSlide,
    // Layout helpers
    startRow, cardHtml, tableHtml, addRawHtml, lucideIconSvg,
  };
};
