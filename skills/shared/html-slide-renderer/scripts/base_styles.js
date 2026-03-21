'use strict';
const { C, FONT, W, H } = require('./constants');
const { px, pt } = require('./utils');

// ─── Base styles shared by all slides ───────────────────────────────────────
const BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${W}px; height: ${H}px;
    font-family: ${FONT};
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .slide {
    width: ${W}px; height: ${H}px;
    display: flex; flex-direction: column;
    position: relative;
  }
  .slide-header {
    flex-shrink: 0;
    position: relative;
  }
  .slide-content {
    flex: 1;
    padding: 24px ${px(0.5)}px 32px ${px(0.5)}px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 18px;
    overflow: hidden;
    min-height: 0;
  }
  .slide-footer {
    flex-shrink: 0;
    height: ${px(0.425)}px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 ${px(0.2)}px 0 ${px(0.5)}px;
  }
  .row { display: flex; gap: 16px; }
  .row-tight { display: flex; gap: ${px(0.3)}px; }
  .col { display: flex; flex-direction: column; gap: 16px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grow { flex: 1; min-height: 0; }
`;

// ─── Slide class ────────────────────────────────────────────────────────────
class Slide {
  constructor(bgColor, extraStyles) {
    this._bg = bgColor || C.bg;
    this._header = '';
    this._contentItems = [];
    this._footer = '';
    this._extraStyles = extraStyles || '';
    this._rawElements = []; // for special slides that bypass flow layout
    this._isFlowSlide = true; // use flex layout by default
    this._narration = '';
  }

  // Add a component to the flow content area
  add(html) { this._contentItems.push(html); }

  // Set narration text for this slide (used by TTS pipeline)
  narrate(text) { this._narration = text; return this; }

  // Add raw HTML (absolute positioned, for special slides)
  pushRaw(html) { this._rawElements.push(html); this._isFlowSlide = false; }

  htmlString() {
    if (!this._isFlowSlide) {
      // Special slides (title, section, closing) use absolute positioning
      return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>${BASE_STYLES}
body { background: ${this._bg}; position: relative; }
.abs { position: absolute; }
${this._extraStyles}
</style></head><body>
${this._rawElements.join('\n')}
</body></html>`;
    }

    // Flow-based slide layout
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>${BASE_STYLES}
${this._extraStyles}
</style></head><body>
<div class="slide" style="background:${this._bg};">
  ${this._header}
  <div class="slide-content">
    ${this._contentItems.join('\n')}
  </div>
  ${this._footer}
</div>
</body></html>`;
  }
}

module.exports = { BASE_STYLES, Slide };
