'use strict';

module.exports = function makeContent(ctx) {
  const { C, px, pt, esc, boldPrefixHtml } = ctx;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLOUT BOX — blue accent bar, gold title
  // ═══════════════════════════════════════════════════════════════════════════
  // opts.compact: true → smaller fonts and tighter padding for dense slides
  function addCalloutBox(slide, pres, titleText, bodyText, opts = {}) {
    const height = opts.height || 'auto';
    const heightStyle = height === 'auto' ? '' : `height:${typeof height === 'number' ? height + 'px' : height};`;
    const compact   = opts.compact || false;
    const titlePt   = compact ? 11  : 14;
    const bodyPt    = compact ? 10  : 12;
    const pad       = compact ? '8px 12px' : '12px 16px';
    const titleMb   = compact ? 4   : 8;

    const titleHtml = titleText
      ? `<div style="font-size:${pt(titlePt)}px;font-weight:bold;color:${C.gold};line-height:1.25;margin-bottom:${titleMb}px;flex-shrink:0;">${esc(titleText)}</div>`
      : '';

    const bodyHtml = bodyText
      ? `<div style="font-size:${pt(bodyPt)}px;color:${C.gray};line-height:1.4;overflow:hidden;">${esc(bodyText)}</div>`
      : '';

    slide.add(`<div style="
      ${heightStyle}
      background:${C.card}; border-radius:2px;
      display:grid; grid-template-columns:${px(0.06)}px 1fr;
      overflow:hidden; flex-shrink:0;
    ">
      <div style="background:${C.blue};border-radius:1px 0 0 1px;"></div>
      <div style="padding:${pad};overflow:hidden;display:flex;flex-direction:column;">
        ${titleHtml}
        ${bodyHtml}
      </div>
    </div>`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BULLETS — bulleted list with bold-prefix (auto-shrinking)
  // ═══════════════════════════════════════════════════════════════════════════
  function addBullets(slide, items, opts = {}) {
    const fontSize = opts.fontSize || 12;
    const color = opts.color || C.navy;
    const dynSize = items.length > 6
      ? Math.max(9, fontSize - Math.ceil((items.length - 6) * 0.75))
      : fontSize;
    const itemGap = pt(dynSize) * 0.75;

    const hl = opts.highlight;
    const hasHl = hl && hl.length > 0;

    const itemsHtml = items.map((item, i) => {
      const dim = hasHl && !hl.includes(i) ? 'opacity:0.35;' : '';
      return `<div style="display:flex;align-items:flex-start;gap:8px;font-size:${pt(dynSize)}px;line-height:1.35;${dim}">
      <span style="color:${C.blue};font-weight:bold;font-size:${pt(dynSize + 1)}px;flex-shrink:0;">\u2022</span>
      <span>${boldPrefixHtml(item, color)}</span>
    </div>`;
    }).join('\n');

    slide.add(`<div style="display:flex;flex-direction:column;gap:${itemGap}px;overflow:hidden;">${itemsHtml}</div>`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKLIST — bullet list with bold-prefix (auto-shrinking)
  // ═══════════════════════════════════════════════════════════════════════════
  function addChecklist(slide, items, opts = {}) {
    const fontSize = opts.fontSize || 12;
    const dynSize = items.length > 8
      ? Math.max(9, fontSize - Math.floor((items.length - 8) / 2))
      : fontSize;
    const itemGap = pt(dynSize) * 0.8;

    const hl = opts.highlight;
    const hasHl = hl && hl.length > 0;

    const itemsHtml = items.map((item, i) => {
      const dim = hasHl && !hl.includes(i) ? 'opacity:0.35;' : '';
      return `<div style="display:flex;align-items:flex-start;gap:8px;font-size:${pt(dynSize)}px;line-height:1.35;${dim}">
      <span style="color:${C.blue};font-weight:bold;font-size:${pt(dynSize + 1)}px;flex-shrink:0;">\u2022</span>
      <span>${boldPrefixHtml(item, C.navy)}</span>
    </div>`;
    }).join('\n');

    slide.add(`<div style="display:flex;flex-direction:column;gap:${itemGap}px;overflow:hidden;">${itemsHtml}</div>`);
  }

  return { addCalloutBox, addBullets, addChecklist };
};
