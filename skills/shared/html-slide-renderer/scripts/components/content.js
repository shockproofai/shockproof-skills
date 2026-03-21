'use strict';

module.exports = function makeContent(ctx) {
  const { C, px, pt, esc, boldPrefixHtml } = ctx;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLOUT BOX — blue accent bar, gold title
  // ═══════════════════════════════════════════════════════════════════════════
  function addCalloutBox(slide, pres, titleText, bodyText, opts = {}) {
    const height = opts.height || 'auto';
    const heightStyle = height === 'auto' ? '' : `height:${typeof height === 'number' ? height + 'px' : height};`;

    const titleHtml = titleText
      ? `<div style="font-size:${pt(14)}px;font-weight:bold;color:${C.gold};line-height:1.25;margin-bottom:8px;flex-shrink:0;">${esc(titleText)}</div>`
      : '';

    const bodyHtml = bodyText
      ? `<div style="font-size:${pt(12)}px;color:${C.gray};line-height:1.4;overflow:hidden;">${esc(bodyText)}</div>`
      : '';

    slide.add(`<div style="
      ${heightStyle}
      background:${C.card}; border-radius:2px;
      display:grid; grid-template-columns:${px(0.06)}px 1fr;
      overflow:hidden; flex-shrink:0;
    ">
      <div style="background:${C.blue};border-radius:1px 0 0 1px;"></div>
      <div style="padding:12px 16px;overflow:hidden;display:flex;flex-direction:column;">
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

    const itemsHtml = items.map(item => `<div style="display:flex;align-items:flex-start;gap:8px;font-size:${pt(dynSize)}px;line-height:1.35;">
      <span style="color:${C.blue};font-weight:bold;font-size:${pt(dynSize + 1)}px;flex-shrink:0;">\u2022</span>
      <span>${boldPrefixHtml(item, color)}</span>
    </div>`).join('\n');

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

    const itemsHtml = items.map(item => `<div style="display:flex;align-items:flex-start;gap:8px;font-size:${pt(dynSize)}px;line-height:1.35;">
      <span style="color:${C.blue};font-weight:bold;font-size:${pt(dynSize + 1)}px;flex-shrink:0;">\u2022</span>
      <span>${boldPrefixHtml(item, C.navy)}</span>
    </div>`).join('\n');

    slide.add(`<div style="display:flex;flex-direction:column;gap:${itemGap}px;overflow:hidden;">${itemsHtml}</div>`);
  }

  return { addCalloutBox, addBullets, addChecklist };
};
