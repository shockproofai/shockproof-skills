'use strict';

module.exports = function makeStructured(ctx) {
  const { C, px, pt, esc } = ctx;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP ROW — numbered step card (auto-stacks in flow)
  // ═══════════════════════════════════════════════════════════════════════════
  // opts.compact: true → smaller badge, font, and min-height for dense slides
  function addStepRow(slide, pres, num, title, description, opts = {}) {
    const compact  = opts.compact || false;
    const badgeS   = px(compact ? 0.33 : 0.42);
    const minH     = px(compact ? 0.52 : 0.72);
    const numPt    = compact ? 13  : 16;
    const titlePt  = compact ? 10  : 13;
    const descPt   = compact ? 8.5 : 10;
    const padV     = compact ? 5   : 8;

    slide.add(`<div style="
      display:grid; grid-template-columns:${px(0.07)}px 8px ${badgeS}px 8px 1fr;
      align-items:center;
      background:${C.white}; border-radius:5px;
      overflow:hidden; flex-shrink:0; min-height:${minH}px;
    ">
      <div style="background:${C.blue};height:100%;border-radius:3px 0 0 3px;"></div>
      <div></div>
      <div style="width:${badgeS}px;height:${badgeS}px;background:${C.blue};border-radius:4px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:${pt(numPt)}px;font-weight:bold;color:${C.white};">${num}</span>
      </div>
      <div></div>
      <div style="padding:${padV}px 12px ${padV}px 0;overflow:hidden;">
        <div style="font-size:${pt(titlePt)}px;font-weight:bold;color:${C.navy};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(title)}</div>
        <div style="font-size:${pt(descPt)}px;color:${C.gray};line-height:1.38;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(description)}</div>
      </div>
    </div>`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPARISON — two-column left (red) / right (green)
  // ═══════════════════════════════════════════════════════════════════════════
  function addComparison(slide, pres, leftTitle, leftBody, rightTitle, rightBody, opts = {}) {
    const height = opts.height || 'auto';
    const heightStyle = height === 'auto' ? 'flex:1;min-height:0;' : `height:${typeof height === 'number' ? height + 'px' : height};`;

    function renderCol(accentCol, title, body) {
      const items = body.split('\n').filter(l => l.trim());
      const itemGapPx = pt(10.5) * 0.7;
      return `<div style="
        flex:1; min-width:0;
        background:${C.card}; border:1px solid ${C.border}; border-radius:2px;
        display:grid; grid-template-columns:${px(0.06)}px 1fr;
        overflow:hidden;
      ">
        <div style="background:${accentCol};border-radius:1px 0 0 1px;"></div>
        <div style="padding:12px 16px;overflow:hidden;">
          <div style="font-size:${pt(14)}px;font-weight:bold;color:${accentCol};margin-bottom:12px;">${esc(title)}</div>
          <div style="display:flex;flex-direction:column;gap:${itemGapPx}px;">
            ${items.map(item => `<div style="display:flex;align-items:flex-start;gap:8px;font-size:${pt(10.5)}px;color:${C.gray};line-height:1.38;">
              <span style="color:${accentCol};font-weight:bold;flex-shrink:0;">\u2022</span>
              <span>${esc(item)}</span>
            </div>`).join('\n')}
          </div>
        </div>
      </div>`;
    }

    slide.add(`<div style="display:flex;gap:${px(0.3)}px;${heightStyle}">
      ${renderCol(C.red, leftTitle, leftBody)}
      ${renderCol(C.green, rightTitle, rightBody)}
    </div>`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLED TABLE — blue header, alternating rows
  // ═══════════════════════════════════════════════════════════════════════════
  function addStyledTable(slide, pres, rows, opts = {}) {
    const fontSize = opts.fontSize || 11;
    const rowH = opts.rowH ? px(opts.rowH) : px(0.35);
    const numCols = rows[0].length;
    const gridCols = opts.colWidths
      ? opts.colWidths.map(w => typeof w === 'number' ? `${w}fr` : w).join(' ')
      : `repeat(${numCols}, 1fr)`;

    const rowsHtml = rows.map((row, ri) => {
      const isHeader = ri === 0;
      const isEven = ri % 2 === 0;
      const rowBg = isHeader ? C.blue : (isEven ? C.card : C.white);
      const textFill = isHeader ? C.white : C.navy;
      const fontW = isHeader ? 'bold' : 'normal';

      return `<div style="display:grid;grid-template-columns:${gridCols};min-height:${rowH}px;">
        ${row.map((cell, ci) => {
          return `<div style="
            background:${rowBg};border:0.5px solid ${C.border};
            display:flex;align-items:center;justify-content:center;text-align:center;
            font-size:${pt(fontSize)}px;font-weight:${fontW};color:${textFill};
            padding:4px 6px;
          ">${esc(String(cell)).replace(/ \(([^)]*)\)/g, (_, inner) => `\u00a0(${inner.replace(/ /g, '\u00a0')})`  )}</div>`;
        }).join('')}
      </div>`;
    }).join('\n');

    slide.add(`<div style="flex-shrink:0;">${rowsHtml}</div>`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE HTML — styled table as raw HTML for use inside startRow()
  // Usage: row.add(tableHtml(rows, opts))  → side-by-side tables
  // ═══════════════════════════════════════════════════════════════════════════
  function tableHtml(rows, opts = {}) {
    const baseFontSize = opts.fontSize || 11;
    // Shrink font for denser tables (>5 data rows) so rows stay compact
    const dataRows = rows.length - 1; // header excluded
    const fontSize = dataRows > 5
      ? Math.max(8.5, baseFontSize - (dataRows - 5) * 0.5)
      : baseFontSize;
    const numCols = rows[0].length;
    const gridCols = opts.colWidths
      ? opts.colWidths.map(w => typeof w === 'number' ? `${w}fr` : w).join(' ')
      : `repeat(${numCols}, 1fr)`;

    const rowsHtml = rows.map((row, ri) => {
      const isHeader = ri === 0;
      const isEven   = ri % 2 === 0;
      const rowBg    = isHeader ? C.blue : (isEven ? C.card : C.white);
      const textFill = isHeader ? C.white : C.navy;
      const fontW    = isHeader ? 'bold' : 'normal';

      // flex:1 + min-height:0 on each row lets the flexbox chain distribute
      // available height equally — rows compress automatically when the slide
      // title is tall (e.g. wraps to two lines) without overflowing.
      return `<div style="display:grid;grid-template-columns:${gridCols};flex:1;min-height:0;">
        ${row.map((cell, ci) => {
          return `<div style="
            background:${rowBg};border:0.5px solid ${C.border};
            display:flex;align-items:center;justify-content:center;text-align:center;
            font-size:${pt(fontSize)}px;font-weight:${fontW};color:${textFill};
            padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          ">${esc(String(cell))}</div>`;
        }).join('')}
      </div>`;
    }).join('\n');

    // flex:1 + min-height:0 on the container participates in the slide's flex
    // column, so the table shrinks when sibling components (title, bullets)
    // consume more vertical space.
    return `<div style="flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;overflow:hidden;">${rowsHtml}</div>`;
  }

  return { addStepRow, addComparison, addStyledTable, tableHtml };
};
