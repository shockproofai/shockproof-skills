'use strict';

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
        bodyHtml = `<div style="display:flex;flex-direction:column;gap:${itemGapPx}px;margin-top:10px;overflow:hidden;">
          ${bodyText.map(item => `<div style="display:flex;align-items:flex-start;gap:8px;font-size:${pt(dynSize)}px;color:${C.gray};line-height:1.35;">
            <span style="color:${accentColor};font-weight:bold;flex-shrink:0;">\u2022</span>
            <span>${esc(item)}</span>
          </div>`).join('\n')}
        </div>`;
      } else {
        bodyHtml = `<div style="font-size:${pt(bodyFontSize)}px;color:${C.gray};line-height:1.4;overflow:hidden;">${esc(bodyText)}</div>`;
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
      <div style="padding:12px 14px;overflow:hidden;display:flex;flex-direction:column;">
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
        bodyContent = `<div style="display:flex;flex-direction:column;gap:${itemGapPx}px;margin-top:${marginTop}px;overflow:hidden;">
          ${bodyText.map(item => `<div style="display:flex;align-items:flex-start;gap:8px;font-size:${pt(dynSize)}px;color:${C.gray};line-height:1.35;">
            <span style="color:${accentColor};font-weight:bold;flex-shrink:0;">\u2022</span>
            <span>${esc(item)}</span>
          </div>`).join('\n')}
        </div>`;
      } else {
        bodyContent = `<div style="font-size:${pt(bodyFontSize)}px;color:${C.gray};line-height:1.4;overflow:hidden;">${esc(bodyText)}</div>`;
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
      <div style="padding:${pad};overflow:hidden;display:flex;flex-direction:column;">
        ${titleHtml}
        ${bodyContent}
      </div>
    </div>`;
  }

  return { addCard, addStatCard, cardHtml };
};
