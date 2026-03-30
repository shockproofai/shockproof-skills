'use strict';

const LUCIDE_SVGS = require('./lucide-svgs');

module.exports = function makeCards(ctx) {
  const { C, px, pt, esc } = ctx;

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD — accent-bordered info box (flow component)
  // ═══════════════════════════════════════════════════════════════════════════
  function addCard(slide, pres, accentColor, titleText, bodyText, opts = {}) {
    const bodyFontSize  = opts.bodyFontSize  || 12;
    const titleFontSize = opts.titleFontSize || 16;
    const titleColor    = opts.titleColor    || C.navy;
    const height = opts.height || 'auto';
    const heightStyle = height === 'auto' ? 'flex:1;min-height:0;' : `height:${typeof height === 'number' ? height + 'px' : height};`;

    let bodyHtml = '';
    if (bodyText) {
      if (Array.isArray(bodyText)) {
        const dynSize = bodyText.length > 4
          ? Math.max(8.5, bodyFontSize - (bodyText.length - 4) * 0.4)
          : bodyFontSize;
        const itemGapPx = pt(dynSize) * 0.65;
        bodyHtml = `<div style="display:flex;flex-direction:column;gap:${itemGapPx}px;margin-top:10px;padding-bottom:4px;">
          ${bodyText.map(item => `<div style="display:flex;align-items:flex-start;gap:8px;font-size:${pt(dynSize)}px;color:${C.gray};line-height:1.35;">
            <span style="color:${accentColor};font-weight:bold;flex-shrink:0;">\u2022</span>
            <span>${esc(item)}</span>
          </div>`).join('\n')}
        </div>`;
      } else {
        bodyHtml = `<div style="font-size:${pt(bodyFontSize)}px;color:${C.gray};line-height:1.4;">${esc(bodyText)}</div>`;
      }
    }

    const titleHtml = titleText
      ? `<div style="font-size:${pt(titleFontSize)}px;font-weight:bold;color:${titleColor};line-height:1.25;margin-bottom:8px;flex-shrink:0;">${esc(titleText)}</div>`
      : '';

    slide.add(`<div style="
      ${heightStyle}
      background:${C.card}; border:1px solid ${C.border}; border-radius:2px;
      display:grid; grid-template-columns:${px(0.06)}px 1fr;
      overflow:hidden;
    ">
      <div style="background:${accentColor};border-radius:1px 0 0 1px;"></div>
      <div style="padding:12px 14px;display:flex;flex-direction:column;">
        ${titleHtml}
        ${bodyHtml}
      </div>
    </div>`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAT CARD — big number + label
  // ═══════════════════════════════════════════════════════════════════════════
  function addStatCard(slide, pres, accentColor, statVal, statLabel, opts = {}) {
    const height = opts.height || 'auto';
    const heightStyle = height === 'auto' ? 'flex:1;min-height:0;' : `height:${typeof height === 'number' ? height + 'px' : height};`;

    slide.add(`<div style="
      ${heightStyle}
      background:${C.card}; border:1px solid ${C.border}; border-radius:2px;
      display:grid; grid-template-columns:${px(0.06)}px 1fr;
      overflow:hidden;
    ">
      <div style="background:${accentColor};border-radius:1px 0 0 1px;"></div>
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
        <div style="font-size:${pt(34)}px;font-weight:bold;color:${C.navy};">${esc(statVal)}</div>
        <div style="font-size:${pt(12)}px;color:${C.gray};">${esc(statLabel)}</div>
      </div>
    </div>`);
  }

  // Wrap raw card HTML in a flex item so it participates in row layout
  // opts.compact: true → smaller title/body fonts, tighter padding and gaps for dense multi-card slides
  function cardHtml(accentColor, titleText, bodyText, opts = {}) {
    const compact       = opts.compact       || false;
    const bodyFontSize  = opts.bodyFontSize  || (compact ? 10  : 12);
    const titleFontSize = opts.titleFontSize || (compact ? 13  : 16);
    const titleColor    = opts.titleColor    || C.navy;
    const pad           = compact ? '8px 10px' : '12px 14px';
    const marginTop     = compact ? 5 : 10;
    const titleMb       = compact ? 4 : 8;

    let bodyContent = '';
    if (bodyText) {
      if (Array.isArray(bodyText)) {
        const dynSize = bodyText.length > 4
          ? Math.max(8.5, bodyFontSize - (bodyText.length - 4) * 0.4)
          : bodyFontSize;
        const itemGapPx = pt(dynSize) * 0.65;
        bodyContent = `<div style="display:flex;flex-direction:column;gap:${itemGapPx}px;margin-top:${marginTop}px;padding-bottom:4px;">
          ${bodyText.map(item => `<div style="display:flex;align-items:flex-start;gap:8px;font-size:${pt(dynSize)}px;color:${C.gray};line-height:1.35;">
            <span style="color:${accentColor};font-weight:bold;flex-shrink:0;">\u2022</span>
            <span>${esc(item)}</span>
          </div>`).join('\n')}
        </div>`;
      } else {
        bodyContent = `<div style="font-size:${pt(bodyFontSize)}px;color:${C.gray};line-height:1.4;">${esc(bodyText)}</div>`;
      }
    }

    const titleHtml = titleText
      ? `<div style="font-size:${pt(titleFontSize)}px;font-weight:bold;color:${titleColor};line-height:1.25;margin-bottom:${titleMb}px;flex-shrink:0;">${esc(titleText)}</div>`
      : '';

    return `<div style="
      flex:1; min-width:0; min-height:0;
      background:${C.card}; border:1px solid ${C.border}; border-radius:2px;
      display:grid; grid-template-columns:${px(0.06)}px 1fr;
      overflow:hidden;
    ">
      <div style="background:${accentColor};border-radius:1px 0 0 1px;"></div>
      <div style="padding:${pad};display:flex;flex-direction:column;">
        ${titleHtml}
        ${bodyContent}
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD GRID — 4–8 cards in a responsive CSS Grid with inline Lucide icons
  // ═══════════════════════════════════════════════════════════════════════════

  // Card-grid accent palette (softer tints for card backgrounds, vivid for icons/badges)
  const CARD_GRID_COLORS = {
    orange: { bg: '#FFF7ED', border: '#FDBA74', accent: '#f97316' },
    blue:   { bg: '#EFF6FF', border: '#93C5FD', accent: '#3b82f6' },
    green:  { bg: '#F0FDF4', border: '#86EFAC', accent: '#22c55e' },
    purple: { bg: '#FAF5FF', border: '#D8B4FE', accent: '#a855f7' },
    pink:   { bg: '#FDF2F8', border: '#F9A8D4', accent: '#ec4899' },
    teal:   { bg: '#F0FDFA', border: '#5EEAD4', accent: '#14b8a6' },
    amber:  { bg: '#FFFBEB', border: '#FCD34D', accent: '#f59e0b' },
    red:    { bg: '#FEF2F2', border: '#FCA5A5', accent: '#ef4444' },
  };

  /**
   * Render an inline SVG for a Lucide icon name.
   * Returns '' if the icon is not found.
   */
  function lucideIconSvg(iconName, sizePx, color) {
    const inner = LUCIDE_SVGS[iconName];
    if (!inner) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  }

  /**
   * Build a single card-grid card as an HTML string.
   * @param {object} card - { title, description, icon, color, category? }
   * @param {object} opts - { compact?, titleFontSize?, descFontSize?, iconSize? }
   */
  function cardGridCardHtml(card, opts = {}) {
    const palette = CARD_GRID_COLORS[card.color] || CARD_GRID_COLORS.blue;
    const compact       = opts.compact || false;
    const iconSize      = opts.iconSize || (compact ? 24 : 32);
    const titleFontSize = pt(opts.titleFontSize || (compact ? 14 : 17));
    const descFontSize  = pt(opts.descFontSize  || (compact ? 11 : 13));
    const pad           = compact ? '14px 16px' : '20px 22px';
    const gap           = compact ? '8px' : '12px';

    const iconHtml = card.icon
      ? lucideIconSvg(card.icon, iconSize, palette.accent)
      : '';

    const categoryHtml = card.category
      ? `<span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:${pt(9)}px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:${palette.accent};color:#fff;width:fit-content;">${esc(card.category)}</span>`
      : '';

    return `<div style="
      background:${palette.bg};
      border:1px solid ${palette.border};
      border-radius:10px;
      padding:${pad};
      display:flex;
      flex-direction:column;
      gap:${gap};
      overflow:hidden;
      min-width:0;
    ">
      <div style="display:flex;align-items:center;gap:10px;">
        ${iconHtml}
        <div style="font-size:${titleFontSize}px;font-weight:700;color:${C.navy};line-height:1.25;">${esc(card.title)}</div>
      </div>
      ${categoryHtml}
      <div style="font-size:${descFontSize}px;color:${C.gray};line-height:1.45;flex:1;">${esc(card.description)}</div>
    </div>`;
  }

  /**
   * Build the complete card-grid HTML and add it to the slide.
   * @param {object}   slide  - Slide object with .add()
   * @param {object[]} cards  - Array of { title, description, icon, color, category? }
   * @param {object}   opts   - { compact?, titleFontSize?, descFontSize?, iconSize?, gap? }
   */
  function addCardGrid(slide, cards, opts = {}) {
    const count = cards.length;
    const gap = opts.gap || (count > 6 ? 12 : 16);

    // Determine grid columns based on card count (matches archetype logic)
    let gridStyle;
    if (count <= 4) {
      gridStyle = 'grid-template-columns:repeat(2,1fr);';
    } else if (count === 5) {
      // 3+2 centred: 6-column virtual grid, each card spans 2
      gridStyle = 'grid-template-columns:repeat(6,1fr);';
    } else if (count === 6) {
      gridStyle = 'grid-template-columns:repeat(3,1fr);';
    } else if (count === 7) {
      // 4+3 centred: 8-column virtual grid, each card spans 2
      gridStyle = 'grid-template-columns:repeat(8,1fr);';
    } else {
      gridStyle = 'grid-template-columns:repeat(4,1fr);';
    }

    // Auto-compact if many cards
    const effectiveOpts = count > 6
      ? { compact: true, ...opts }
      : opts;

    const cardHtmls = cards.map((card, i) => {
      const html = cardGridCardHtml(card, effectiveOpts);
      // For 5-card and 7-card layouts, offset the second row to centre it
      let spanStyle = '';
      if (count === 5 || count === 7) {
        spanStyle = 'grid-column:span 2;';
        // For 5 cards: card index 3 starts at col 2
        if (count === 5 && i === 3) spanStyle = 'grid-column:2/span 2;';
        // For 7 cards: card index 4 starts at col 2
        if (count === 7 && i === 4) spanStyle = 'grid-column:2/span 2;';
      }
      return spanStyle
        ? `<div style="${spanStyle}">${html}</div>`
        : html;
    });

    slide.add(`<div style="
      display:grid;
      ${gridStyle}
      gap:${gap}px;
      flex:1;
      min-height:0;
      align-content:start;
    ">${cardHtmls.join('\n')}</div>`);
  }

  return { addCard, addStatCard, cardHtml, addCardGrid, lucideIconSvg };
};
