'use strict';

module.exports = function makeChrome(ctx) {
  const { C, px, pt, esc, TOTAL_MODULES, footerHtml, logoImgInline } = ctx;

  function addChrome(slide, pres, title, moduleNum, moduleTitle, pageNum, totalPages) {
    slide._bg = C.bg;
    slide._isFlowSlide = true;

    let titleFontPt = 28;
    if (title.length > 45) titleFontPt = 24;
    if (title.length > 60) titleFontPt = 20;

    slide._header = `<div class="slide-header">
      <div style="height:8px;background:${C.blue};"></div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:${px(0.15) + 8}px ${px(0.2)}px 0 ${px(0.5)}px;">
        <div style="flex:1;min-width:0;padding-right:32px;font-size:${pt(titleFontPt)}px;font-weight:bold;color:${C.navy};line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(title)}</div>
        ${logoImgInline(1.6, 0.49)}
      </div>
    </div>`;

    slide._footer = footerHtml(moduleNum, moduleTitle, pageNum, totalPages);
  }

  return { addChrome };
};
