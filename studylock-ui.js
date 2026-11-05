// StudyLock — shared site behavior: nav, reveal, spotlight, FAQ accordion,
// the pinned scroll-driven 3D laptop (3 turns), and waitlist form submission.

(function () {
  // ---------------------------------------------------------------------
  // Mobile nav toggle
  // ---------------------------------------------------------------------
  function initNavToggle() {
    const toggle = document.getElementById('navToggle');
    const pill = document.getElementById('navPill');
    if (!toggle || !pill) return;
    toggle.addEventListener('click', () => {
      const open = pill.classList.toggle('open');
      toggle.innerHTML = open ? '&#10005;' : '&#9776;';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    pill.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        pill.classList.remove('open');
        toggle.innerHTML = '&#9776;';
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------------------------------------------------------------------
  // Sticky header — gains a solid backing once the page scrolls.
  // ---------------------------------------------------------------------
  function initStickyHeader() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    const setState = () => header.classList.toggle('scrolled', window.scrollY > 8);
    setState();
    window.addEventListener('scroll', setState, { passive: true });
  }

  // ---------------------------------------------------------------------
  // Scroll reveal
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
    }, { threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  }

  // ---------------------------------------------------------------------
  // Spotlight hover glow on compare cards
  // ---------------------------------------------------------------------
  function initSpotlight() {
    document.querySelectorAll('.spotlight').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
      });
    });
  }

  // ---------------------------------------------------------------------
  // FAQ accordion
  // ---------------------------------------------------------------------
  function initFaqAccordion() {
    const items = document.querySelectorAll('[data-faq]');
    if (!items.length) return;
    items.forEach((item) => {
      const q = item.querySelector('.faq-q');
      q.addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        items.forEach((other) => {
          other.classList.remove('open');
          other.querySelector('.faq-toggle').textContent = '+';
        });
        if (!wasOpen) {
          item.classList.add('open');
          item.querySelector('.faq-toggle').textContent = '−';
        }
      });
    });
  }

  // ---------------------------------------------------------------------
  // Laptop keyboard — fills the CSS-grid key rows programmatically.
  // ---------------------------------------------------------------------
  function buildKeyboard() {
    const kb = document.getElementById('lpKeyboard');
    if (!kb) return;
    const rows = 4;
    const cols = 14;
    for (let i = 0; i < rows * cols; i++) {
      const k = document.createElement('div');
      k.className = 'lp-key';
      kb.appendChild(k);
    }
  }

  // ---------------------------------------------------------------------
  // Pinned 3D laptop — scrolls through a tall wrapper; the scroll
  // progress is split into 3 even segments ("turns"). Each turn: the
  // laptop does a quick tilt/turn motion, the screen content swaps to
  // that feature, the turn-list + progress dots update. Because the
  // turn is derived straight from scroll position (not a timer), a fast
  // flick can't skip a turn's visual state — it just passes through it
  // quickly rather than never rendering it.
  // ---------------------------------------------------------------------
  function initLaptopTurns() {
    const wrap = document.getElementById('laptopPinWrap');
    const laptop = document.getElementById('laptop3d');
    const lidPivot = document.getElementById('lpLidPivot');
    const turnItems = document.querySelectorAll('.turn-item');
    const dashes = document.querySelectorAll('.turn-progress .dash');
    const label = document.getElementById('turnLabel');
    const leftPane = document.getElementById('lpLeftPane');
    const rightPane = document.getElementById('lpRightPane');
    const tabLabel = document.getElementById('lpTabLabel');
    const replay = document.getElementById('laptopReplay');
    if (!wrap || !laptop) return;

    const TURN_LABELS = ['01 FLEXIBLE TIMER', '02 BUILT-IN TASKS', '03 REAL SITE BLOCKING'];
    // Negative rotateX tips the screen toward the viewer and drops the
    // camera above the deck, so the keyboard reads as a top-down/overhead
    // product shot rather than a view up from underneath it.
    const TILT_BASE = -30;
    let currentTurn = -1;
    let ticking = false;

    function laptopScale() {
      const w = window.innerWidth;
      if (w <= 640) return 0.56;
      if (w <= 980) return 0.72;
      return 1;
    }

    function setTurn(turn) {
      if (turn === currentTurn) return;
      currentTurn = turn;

      turnItems.forEach((item) => {
        item.classList.toggle('active', Number(item.dataset.turn) === turn);
      });
      dashes.forEach((d) => d.classList.toggle('done', Number(d.dataset.dash) <= turn));
      if (label) label.textContent = 'Turn ' + (turn + 1) + ' of 3';
      if (tabLabel) tabLabel.textContent = TURN_LABELS[turn];

      if (leftPane) leftPane.style.boxShadow = turn === 0 ? 'inset 0 0 0 1.5px #d2725f' : 'none';
      if (rightPane) rightPane.style.boxShadow = (turn === 1 || turn === 2) ? 'inset 0 0 0 1.5px #d2725f' : 'none';
    }

    function update() {
      ticking = false;
      const rect = wrap.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / total));

      // 3 even segments, each driving one full turn of rotateY plus a
      // gentle rotateX wobble so the laptop visibly "turns" and settles.
      const seg = Math.min(2, Math.floor(progress * 3));
      const segT = Math.min(1, Math.max(0, progress * 3 - seg)); // 0..1 within the segment

      // settle quickly (first 35% of the segment is the turning motion,
      // the rest holds still so the feature is actually readable)
      const turnPortion = 0.35;
      let spin;
      if (segT < turnPortion) {
        const t = segT / turnPortion;
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        spin = eased * 360;
      } else {
        spin = 360;
      }

      const rotY = seg * 360 + spin;
      const scale = laptopScale();
      laptop.style.transform = `scale(${scale}) rotateX(${TILT_BASE}deg) rotateY(${(rotY % 360) < 180 ? rotY % 360 : (rotY % 360) - 360}deg)`;

      setTurn(seg);

      if (replay) replay.classList.toggle('visible', progress > 0.985);
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);

    // click a turn-list item to jump to that segment of the pin
    turnItems.forEach((item) => {
      item.addEventListener('click', () => {
        const turn = Number(item.dataset.turn);
        const rect = wrap.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const targetProgress = (turn + 0.6) / 3;
        const targetY = window.scrollY + rect.top + targetProgress * total;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      });
    });

    if (replay) {
      replay.addEventListener('click', () => {
        const rect = wrap.getBoundingClientRect();
        const targetY = window.scrollY + rect.top + 10;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      });
    }

    // interactive bits inside the laptop screen — presets + task rows
    document.querySelectorAll('.lp-preset').forEach((p) => {
      p.addEventListener('click', () => {
        document.querySelectorAll('.lp-preset').forEach((o) => {
          o.classList.remove('on');
          o.style.background = 'none';
          o.style.color = '#9ba3ba';
          o.style.fontWeight = 'normal';
        });
        p.classList.add('on');
        p.style.background = '#d2725f';
        p.style.color = '#1b0d08';
        p.style.fontWeight = '700';
      });
    });
    document.querySelectorAll('.lp-task').forEach((t) => {
      t.addEventListener('click', () => {
        const done = t.style.textDecoration === 'line-through';
        t.style.textDecoration = done ? 'none' : 'line-through';
        t.style.color = done ? '#f4ede0' : '#6b7184';
        const box = t.querySelector('span');
        if (box) {
          box.style.background = done ? 'transparent' : '#d2725f';
          box.style.border = done ? '1px solid var(--navy-line)' : 'none';
        }
      });
    });
  }

  // ---------------------------------------------------------------------
  // Waitlist forms — Formspree submission with honeypot + char counter.
  // ---------------------------------------------------------------------
  function initWaitlistForms() {
    document.querySelectorAll('[data-waitlist-form]').forEach((form) => {
      const textarea = form.querySelector('textarea');
      const counter = form.querySelector('.char-count .cur');
      if (textarea && counter) {
        const updateCount = () => { counter.textContent = String(textarea.value.length); };
        textarea.addEventListener('input', updateCount);
        updateCount();
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = form.querySelector('.form-status');
        const submitBtn = form.querySelector('button[type="submit"]');
        const honeypot = form.querySelector('.hp');

        if (honeypot && honeypot.value) {
          // silently "succeed" for bots without sending anything
          if (statusEl) {
            statusEl.textContent = "You're on the list. We'll email you the day it launches.";
            statusEl.className = 'form-status show ok';
          }
          form.reset();
          return;
        }

        const emailField = form.querySelector('input[type="email"]');
        if (emailField && !emailField.value) {
          if (statusEl) {
            statusEl.textContent = 'Please add your email so we know where to send the launch note.';
            statusEl.className = 'form-status show err';
          }
          return;
        }

        const originalLabel = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = 'Sending…'; }

        try {
          const res = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: { Accept: 'application/json' },
          });
          if (res.ok) {
            if (statusEl) {
              statusEl.textContent = "You're on the list. We'll email you the day it launches — nothing else.";
              statusEl.className = 'form-status show ok';
            }
            form.reset();
            if (textarea && counter) counter.textContent = '0';
          } else {
            throw new Error('Request failed');
          }
        } catch (err) {
          if (statusEl) {
            statusEl.textContent = "Something went wrong sending that. Try again in a moment.";
            statusEl.className = 'form-status show err';
          }
        } finally {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalLabel; }
        }
      });
    });
  }

  function initDeferred() {
    initNavToggle();
    initStickyHeader();
    initReveal();
    initSpotlight();
    initFaqAccordion();
    buildKeyboard();
    initLaptopTurns();
    initWaitlistForms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeferred);
  } else {
    initDeferred();
  }
})();
