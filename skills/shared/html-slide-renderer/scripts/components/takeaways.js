'use strict';

module.exports = function makeTakeaways(ctx) {
  const { C, px, pt, esc, addChrome } = ctx;

  // ═══════════════════════════════════════════════════════════════════════════
  // KEY TAKEAWAYS — numbered list
  // ═══════════════════════════════════════════════════════════════════════════
  function addKeyTakeaways(slide, pres, moduleNum, moduleTitle, pageNum, totalPages, takeaways, opts = {}) {
    addChrome(slide, pres, 'Key Takeaways', moduleNum, moduleTitle, pageNum, totalPages);

    const hl = opts.highlight;
    const hasHl = hl && hl.length > 0;

    takeaways.forEach((item, i) => {
      const dim = hasHl && !hl.includes(i) ? 'opacity:0.35;' : '';
      slide.add(`<div style="display:grid;grid-template-columns:${px(0.5)}px 1fr;gap:14px;align-items:start;${dim}">
        <div style="font-size:${pt(24)}px;font-weight:bold;color:${C.blue};text-align:center;">${i + 1}</div>
        <div>
          <div style="font-size:${pt(16)}px;font-weight:bold;color:${C.navy};margin-bottom:8px;">${esc(item.title)}</div>
          <div style="font-size:${pt(11)}px;color:${C.gray};line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(item.desc)}</div>
        </div>
      </div>`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RED FLAG PAIRS — two-column warning grid
  // ═══════════════════════════════════════════════════════════════════════════
  function addRedFlagPairs(slide, flags, opts = {}) {
    const hl = opts.highlight;
    const hasHl = hl && hl.length > 0;

    const flagsHtml = flags.map((pair, i) => {
      const dim = hasHl && !hl.includes(i) ? 'opacity:0.35;' : '';
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${px(0.3)}px;${dim}">
      ${[0, 1].map(side => {
        if (!pair[side]) return '<div></div>';
        return `<div style="display:flex;align-items:flex-start;gap:6px;font-size:${pt(12)}px;color:${C.navy};line-height:1.35;">
          <span style="color:${C.red};font-weight:bold;font-size:${pt(13)}px;flex-shrink:0;">\u26a0</span>
          <span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(pair[side])}</span>
        </div>`;
      }).join('\n')}
    </div>`;
    }).join('\n');

    slide.add(`<div style="display:flex;flex-direction:column;gap:16px;">${flagsHtml}</div>`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCES SLIDE — creates its own slide with chrome
  // ═══════════════════════════════════════════════════════════════════════════
  function addReferencesSlide(pres, moduleNum, moduleTitle, pageNum, totalPages, references) {
    const slide = pres.addSlide();
    addChrome(slide, pres, 'References & Resources', moduleNum, moduleTitle, pageNum, totalPages);

    references.forEach(section => {
      slide.add(`<div>
        <div style="font-size:${pt(13)}px;font-weight:bold;color:${C.blue};margin-bottom:4px;">${esc(section.category)}</div>
        <div style="display:flex;flex-direction:column;gap:2px;">
          ${section.items.map(item => `<div style="font-size:${pt(10)}px;color:${C.navy};padding-left:12px;">${esc(item)}</div>`).join('\n')}
        </div>
      </div>`);
    });

    slide.add(`<div style="margin-top:auto;font-size:${pt(9)}px;font-style:italic;color:${C.ltGray};">All URLs verified as of presentation date. Visit agency websites for the most current versions.</div>`);

    return slide;
  }

  return { addKeyTakeaways, addRedFlagPairs, addReferencesSlide };
};
