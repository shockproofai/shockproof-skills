'use strict';

module.exports = function makeLayoutHelpers(ctx) {
  // ═══════════════════════════════════════════════════════════════════════════
  // LAYOUT HELPERS — compose multiple components in rows/grids
  // ═══════════════════════════════════════════════════════════════════════════

  // Start a flex row — returns the row HTML collector. Call endRow() to emit.
  function startRow() {
    const items = [];
    return {
      add(html) { items.push(html); return this; },
      html() { return `<div style="display:flex;gap:16px;flex:1;min-height:0;">${items.join('\n')}</div>`; },
    };
  }

  // Emit raw HTML directly into the content area
  function addRawHtml(slide, html) {
    slide.add(html);
  }

  return { startRow, addRawHtml };
};
