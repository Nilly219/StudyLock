// Renders the padlock glyph inside ".wordmark" elements (the "StudyL[lock]ck"
// nav button). The lock's circle is sized to match the actual rendered "o"
// glyph for the current font/weight (measured via canvas text metrics), so it
// sits flush in the word with no gap, and the shackle extends above it like
// the loop on a real padlock. Font-agnostic by design — works the same
// whether the wordmark is set in a sans or, as now, a display serif.

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

  // Run once immediately, then again once webfonts finish loading — Fraunces
  // is a variable font and metrics can shift once it swaps in from the
  // fallback serif.
  sizeLockGlyphs();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(sizeLockGlyphs);
  }
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeLockGlyphs, 150);
  });

  // ---------------------------------------------------------------------
  // Scroll reveal — fades/slides/blurs ".reveal" elements in as they enter
  // the viewport. Runs on every page; elements just need the class.
  // ---------------------------------------------------------------------
  function initReveal() {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    targets.forEach((el) => io.observe(el));
  }
  // ---------------------------------------------------------------------
  // Sticky glass nav — gains a stronger blur/shadow once the page scrolls,
  // so it reads as transparent chrome over the hero and "frosted glass"
  // once content is scrolling underneath it.
  // ---------------------------------------------------------------------
  function initStickyHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const setState = () => {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    setState();
    window.addEventListener('scroll', setState, { passive: true });
  }

  // ---------------------------------------------------------------------
  // Spotlight — a soft radial highlight that follows the cursor across
  // ".spotlight" cards (feature cards, comparison columns).
  // ---------------------------------------------------------------------
  function initSpotlight() {
    const cards = document.querySelectorAll('.spotlight');
    if (!cards.length) return;
    cards.forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
      });
    });
  }

  // ---------------------------------------------------------------------
  // Hero ambient glow — the secondary blob drifts gently toward the
  // cursor's horizontal position (index.html only; no-op elsewhere).
  // ---------------------------------------------------------------------
  function initHeroGlow() {
    const hero = document.querySelector('.hero-pin');
    const glow2 = document.querySelector('.ambient-glow-2');
    if (!hero || !glow2) return;
    hero.addEventListener('pointermove', (e) => {
      const rect = hero.getBoundingClientRect();
      const offset = (e.clientX - (rect.left + rect.width / 2)) * 0.12;
      glow2.style.setProperty('--mx', offset + 'px');
    });
  }

  // ---------------------------------------------------------------------
  // Laptop zoom — a scroll-scrubbed intro (index.html only). ".laptop-zoom"
  // is a tall wrapper; ".laptop-stage" is sticky inside it, so scrolling
  // through that extra height drives a progress value from 0 to 1, which
  // we map straight onto transforms — no autoplay, no scroll-snap, it
  // tracks the scrollbar exactly and simply stops when you stop scrolling.
  //   0.00–0.35  the laptop rises into place and the lid opens
  //   0.35–1.00  the whole rig scales up so the screen fills the frame,
  //              fading out right at the end to hand off to the section
  //              underneath (the real comparison content, not a replica
  //              squeezed into the tiny screen)
  function initLaptopZoom() {
    const wrap = document.querySelector('.laptop-zoom');
    const stage = document.querySelector('.laptop-stage');
    const rig = document.querySelector('.laptop-rig');
    const lid = document.querySelector('.laptop-lid');
    if (!wrap || !stage || !rig || !lid) return;

    const OPEN_END = 0.35;
    let ticking = false;

    function update() {
      ticking = false;
      const rect = wrap.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / total));

      const openT = Math.min(1, progress / OPEN_END);
      const openEased = 1 - Math.pow(1 - openT, 3);
      const lidAngle = -92 + openEased * 92;
      const rise = (1 - openEased) * 70;

      const zoomT = Math.max(0, (progress - OPEN_END) / (1 - OPEN_END));
      const zoomEased = zoomT * zoomT;
      const scale = 1 + zoomEased * 7.5;
      const fadeOut = Math.max(0, Math.min(1, (zoomT - 0.82) / 0.18));

      rig.style.opacity = openEased * (1 - fadeOut);
      rig.style.transform = `translateY(${rise}px) scale(${scale})`;
      lid.style.transform = `rotateX(${lidAngle}deg)`;

      const hint = wrap.querySelector('.laptop-hint');
      if (hint) hint.style.opacity = progress < 0.08 ? 1 : Math.max(0, 1 - progress / 0.3);
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  // This <script> tag sits right after the nav, near the top of <body> —
  // earlier than the .reveal/.spotlight content further down the page —
  // so anything that queries that later content has to wait for the full
  // document to parse rather than running immediately.
  function initDeferred() {
    initReveal();
    initStickyHeader();
    initSpotlight();
    initHeroGlow();
    initLaptopZoom();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeferred);
  } else {
    initDeferred();
  }
})();
