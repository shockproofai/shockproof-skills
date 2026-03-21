'use strict';

module.exports = function makeSlideLayouts(ctx) {
  const { C, W, H, px, pt, esc, SERIES_TITLE, TOTAL_MODULES, footerHtml, logoImgInline } = ctx;

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE SLIDE — special layout, not flow-based
  // ═══════════════════════════════════════════════════════════════════════════
  function addTitleSlide(pres, moduleNum, title, subtitle, totalPages) {
    const slide = pres.addSlide(C.white);
    slide._isFlowSlide = false;

    let titleFontPt = 44;
    if (title.length > 60) titleFontPt = 38;
    if (title.length > 80) titleFontPt = 34;
    if (title.length > 100) titleFontPt = 30;

    slide._extraStyles = `
      .title-layout {
        width: ${W}px; height: ${H}px;
        display: flex; flex-direction: column;
      }
      .title-top-bar { height: ${px(0.15)}px; background: ${C.blue}; flex-shrink: 0; }
      .title-logo-row {
        display: flex; justify-content: flex-end;
        padding: ${px(0.10)}px ${px(0.2)}px 0;
        flex-shrink: 0;
      }
      .title-center {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 24px; padding: 0 ${px(0.5)}px;
        min-height: 0;
      }
      .title-main {
        font-size: ${pt(titleFontPt)}px; font-weight: bold; color: ${C.navy};
        text-align: center; line-height: 1.2; max-width: ${px(9)}px;
      }
      .title-divider {
        width: ${px(3)}px; height: 4px; background: ${C.blue}; border-radius: 2px;
      }
      .title-subtitle {
        font-size: ${pt(16)}px; color: ${C.blue}; text-align: center;
      }
      .title-series {
        font-size: ${pt(14)}px; font-style: italic; color: ${C.gray}; text-align: center;
      }
      .title-footer {
        flex-shrink: 0; height: ${px(0.425)}px; background: ${C.navy};
        display: flex; align-items: center; justify-content: center;
        font-size: ${pt(11)}px; font-weight: bold; color: ${C.white};
      }
    `;

    const subtitleHtml = subtitle
      ? `<div class="title-subtitle">${esc(subtitle)}</div>`
      : '';

    slide.pushRaw(`<div class="title-layout">
      <div class="title-top-bar"></div>
      <div class="title-logo-row">${logoImgInline(1.6, 0.49)}</div>
      <div class="title-center">
        <div class="title-main">${esc(title)}</div>
        <div class="title-divider"></div>
        ${subtitleHtml}
        <div class="title-series">${esc(SERIES_TITLE)}  |  Module ${moduleNum} of ${TOTAL_MODULES}</div>
      </div>
      <div class="title-footer">Shockproof AI  |  ${esc(SERIES_TITLE)}</div>
    </div>`);

    return slide;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION DIVIDER — special layout
  // ═══════════════════════════════════════════════════════════════════════════
  function addSectionSlide(pres, title, subtitle, moduleNum, moduleTitle, pageNum, totalPages) {
    const slide = pres.addSlide(C.navy);
    slide._isFlowSlide = false;

    slide._extraStyles = `
      .section-layout {
        width: ${W}px; height: ${H}px;
        display: flex; flex-direction: column;
      }
      .section-logo-row {
        display: flex; justify-content: flex-end;
        padding: ${px(0.15)}px ${px(0.2)}px 0;
        flex-shrink: 0;
      }
      .section-center {
        flex: 1; display: flex; flex-direction: column;
        justify-content: center;
        padding: 0 ${px(0.5)}px;
        gap: 12px;
        min-height: 0;
      }
      .section-accent { width: ${px(3)}px; height: 4px; background: ${C.blue}; border-radius: 2px; }
      .section-title {
        font-size: ${pt(44)}px; font-weight: bold; color: ${C.white}; line-height: 1.2;
      }
      .section-subtitle {
        font-size: ${pt(16)}px; font-style: italic; color: ${C.ltGray};
      }
    `;

    const subtitleHtml = subtitle
      ? `<div class="section-subtitle">${esc(subtitle)}</div>`
      : '';

    slide.pushRaw(`<div class="section-layout">
      <div class="section-logo-row">${logoImgInline(1.6, 0.49, true)}</div>
      <div class="section-center">
        <div class="section-accent"></div>
        <div class="section-title">${esc(title)}</div>
        ${subtitleHtml}
      </div>
      ${footerHtml(moduleNum, moduleTitle, pageNum, totalPages)}
    </div>`);

    return slide;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSING SLIDE — special layout
  // ═══════════════════════════════════════════════════════════════════════════
  function addClosingSlide(pres, moduleNum, moduleTitle, nextModuleNum, nextModuleTitle, nextModuleDesc, totalPages) {
    const slide = pres.addSlide(C.navy);
    slide._isFlowSlide = false;

    slide._extraStyles = `
      .closing-layout {
        width: ${W}px; height: ${H}px;
        display: flex; flex-direction: column;
      }
      .closing-logo-row {
        display: flex; justify-content: flex-end;
        padding: ${px(0.15)}px ${px(0.2)}px 0;
        flex-shrink: 0;
      }
      .closing-content {
        flex: 1; display: flex; flex-direction: column;
        justify-content: center;
        padding: 0 ${px(0.8)}px;
        gap: 20px;
        min-height: 0;
      }
      .closing-accent { width: ${px(3)}px; height: 4px; background: ${C.blue}; border-radius: 2px; }
      .closing-module-complete { font-size: ${pt(42)}px; font-weight: bold; color: ${C.blue}; }
      .closing-module-title { font-size: ${pt(18)}px; font-style: italic; color: ${C.white}; }
      .closing-next { font-size: ${pt(14)}px; color: ${C.ltGray}; }
      .closing-next-complete { font-size: ${pt(14)}px; font-weight: bold; color: ${C.gold}; }
      .closing-thankyou { font-size: ${pt(26)}px; font-weight: bold; color: ${C.white}; margin-top: 16px; }
      .closing-contact { font-size: ${pt(11)}px; font-style: italic; color: ${C.ltGray}; }
    `;

    const nextHtml = nextModuleNum
      ? `<div class="closing-next">Next: Module ${nextModuleNum} \u2014 ${esc(nextModuleTitle)}</div>`
      : `<div class="closing-next-complete">Series Complete \u2014 Congratulations!</div>`;

    slide.pushRaw(`<div class="closing-layout">
      <div class="closing-logo-row">${logoImgInline(1.6, 0.49, true)}</div>
      <div class="closing-content">
        <div class="closing-accent"></div>
        <div class="closing-module-complete">Module ${moduleNum} Complete</div>
        <div class="closing-module-title">${esc(moduleTitle)}</div>
        ${nextHtml}
        <div class="closing-thankyou">Thank You</div>
        <div class="closing-contact">Questions? Contact: support@shockproof.ai</div>
      </div>
      ${footerHtml(moduleNum, SERIES_TITLE, totalPages, totalPages)}
    </div>`);

    return slide;
  }

  return { addTitleSlide, addSectionSlide, addClosingSlide };
};
