// Renders the padlock glyph inside ".wordmark" elements (the "StudyL[lock]ck"
// nav button). The lock's circle is sized to match the actual rendered "o"
// glyph for the current font/weight (measured via canvas text metrics), so it
// sits flush in the word with no gap, and the shackle extends above it like
// the loop on a real padlock.

(function () {
  function measureGlyphBox(ctx, ch) {
    const m = ctx.measureText(ch);
    const hasBounds = typeof m.actualBoundingBoxAscent === 'number';
    const width = hasBounds ? (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) : m.width;
    const height = hasBounds ? (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) : (m.width * 1.05);
    const ascent = hasBounds ? m.actualBoundingBoxAscent : height;
    return { width, height, ascent };
  }

  function buildLockSVG(diameter, shackleRise, strokeW) {
    const D = diameter, S = shackleRise, sw = strokeW;
    const W = D, H = D + S;
    const r = D / 2 - sw / 2;
    const cx = D / 2;
    const cy = H - D / 2;

    const shackleRx = r * 0.6;
    const legBottomY = cy - r * 0.2;
    const legTopY = Math.max(sw / 2 + shackleRx, sw / 2);

    const keyR = Math.max(r * 0.16, 1);
    const keyCx = cx, keyCy = cy - r * 0.22;
    const slotY1 = keyCy + keyR * 0.6;
    const slotY2 = Math.min(cy + r * 0.32, cy + r - sw / 2);

    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M ${cx - shackleRx} ${legBottomY} V ${legTopY} A ${shackleRx} ${shackleRx} 0 0 1 ${cx + shackleRx} ${legTopY} V ${legBottomY}"></path>
      <circle cx="${cx}" cy="${cy}" r="${r}"></circle>
      <circle cx="${keyCx}" cy="${keyCy}" r="${keyR}" fill="currentColor" stroke="none"></circle>
      <path d="M ${keyCx} ${slotY1} V ${slotY2}"></path>
    </svg>`;
  }

  function sizeLockGlyphs() {
    const wordmarks = document.querySelectorAll('.wordmark');
    if (!wordmarks.length) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    wordmarks.forEach((wm) => {
      const cs = getComputedStyle(wm);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const o = measureGlyphBox(ctx, 'o');
      const cap = measureGlyphBox(ctx, 'S');

      const D = (o.width + o.height) / 2;
      const strokeW = Math.min(Math.max(D * 0.17, 1.3), 2.6);
      const S = Math.min(D * 0.62, Math.max(cap.ascent - o.height, D * 0.35));

      const lockEl = wm.querySelector('.lock-o');
      if (!lockEl) return;
      lockEl.style.width = D + 'px';
      lockEl.style.height = D + 'px';
      lockEl.innerHTML = buildLockSVG(D, S, strokeW);
    });
  }

  sizeLockGlyphs();
  // Re-run once webfonts (if any) finish loading, since metrics can shift.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(sizeLockGlyphs);
  }
  // Re-run on resize in case responsive font-size rules change the button's
  // font-size at different breakpoints.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeLockGlyphs, 150);
  });
})();
