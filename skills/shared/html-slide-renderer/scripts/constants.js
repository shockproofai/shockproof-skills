'use strict';

// ─── Color Palette (same hex values as sai_template.js) ────────────────────
const C = {
  blue:     '#1A4FE8',
  navy:     '#1A3068',
  white:    '#FFFFFF',
  bg:       '#F8F9FC',
  card:     '#EEF2FF',
  card2:    '#E0E7FF',
  gray:     '#666666',
  ltGray:   '#999999',
  green:    '#2E7D32',
  gold:     '#C17D10',
  red:      '#B91C1C',
  teal:     '#0F766E',
  footerBg: '#E8EDF8',
  border:   '#CBD5E1',
  black:    '#222222',
};

const FONT = "'Carlito', 'Liberation Sans', 'Arial', sans-serif";

// Slide canvas: 10" × 5.625" at 128 px/inch → 1280 × 720 px
const W = 1280, H = 720;
const SCALE = 128;
const PT = SCALE / 72;

const ACCENTS = [C.blue, C.green, C.gold, C.red, C.teal];

module.exports = { C, FONT, W, H, SCALE, PT, ACCENTS };
