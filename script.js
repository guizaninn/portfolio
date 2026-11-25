// Fade-up reveal for elements marked .reveal as they enter the viewport
(() => {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  items.forEach((el) => io.observe(el));
})();

// Pause the hero's looping animations while the hero is off screen (saves battery)
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([entry]) => {
    hero.classList.toggle('is-offscreen', !entry.isIntersecting);
  }).observe(hero);
})();

// Footer: copy the email address, and show the current time in Florianópolis
(() => {
  const btn = document.querySelector('.connect__copy');
  if (btn && navigator.clipboard) {
    let timer;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied';
        btn.classList.add('is-copied');
        clearTimeout(timer);
        timer = setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('is-copied');
        }, 1800);
      } catch { /* clipboard blocked: the mailto link still works */ }
    });
  } else if (btn) {
    btn.remove();
  }

  const clock = document.querySelector('.connect__clock');
  if (!clock) return;
  const time = clock.querySelector('time');
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: '2-digit' });
  const tick = () => { time.textContent = fmt.format(new Date()); };
  tick();
  clock.hidden = false;
  setInterval(tick, 30000);
})();

// Smooth, slightly slowed-down scrolling for mouse wheels and trackpads (the feel
// the old Framer site had). Each wheel tick moves a target and the page eases
// toward it every frame. On the About page each gesture turns exactly one
// chapter instead. Touch scrolling, the scrollbar and reduced motion stay native.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  root.classList.add('smooth-scroll'); // styles.css: hands scrolling over to this script

  const EASE = 0.055;          // free scrolling: share of the remaining distance per 60fps frame (lower = slower)
  const TURN_MS = 900;         // About: how long one page turn takes
  let target = scrollY;
  let current = scrollY;
  let raf = 0;
  let last = 0;
  let tween = null;            // { from, to, start } while a page turn is running

  const maxScroll = () => root.scrollHeight - innerHeight;
  const clamp = (v) => Math.min(Math.max(v, 0), maxScroll());
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  const frame = (now) => {
    if (tween) {
      tween.start ??= now;
      const p = Math.min((now - tween.start) / TURN_MS, 1);
      current = tween.from + (tween.to - tween.from) * easeInOut(p);
      if (p === 1) tween = null;
    } else {
      const dt = Math.min(now - (last || now), 64) || 16.7;
      current += (target - current) * (1 - Math.pow(1 - EASE, dt / 16.7));
      if (Math.abs(target - current) < 0.5) current = target;
    }
    last = now;
    scrollTo(0, current);
    if (tween || current !== target) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; }
  };
  const run = () => { if (!raf) raf = requestAnimationFrame(frame); };

  // free scrolling: ease toward y
  const easeTo = (y) => {
    if (!raf) current = scrollY;
    tween = null;
    target = clamp(y);
    run();
  };
  // page turn: a fixed-length glide to y
  const glideTo = (y) => {
    if (!raf) current = scrollY;
    target = clamp(y);
    tween = { from: current, to: target, start: null };
    run();
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    tween = null;
    target = current = scrollY;
  };
  const position = () => (raf ? target : scrollY);

  // Leave the wheel alone over anything that scrolls on its own
  const scrollsItself = (el, dy) => {
    for (; el && el !== document.body && el !== root; el = el.parentElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) {
        if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
      }
    }
    return false;
  };

  // ---- About: one chapter per gesture --------------------------------------
  const book = document.querySelector('.page-about');
  const chapters = book ? [...document.querySelectorAll('.chapter')] : [];
  const ledger = book && document.querySelector('.ledger');
  const docTop = (el) => el.getBoundingClientRect().top + scrollY;
  // only when every chapter fits on screen; otherwise it's free scrolling
  const paging = () => chapters.length > 0 && innerHeight >= 560 && chapters.every((c) => c.offsetHeight <= innerHeight + 2);

  // Turns one page in `dir`. Returns false when the page should scroll freely
  // instead (inside "The short version" and the footer below the chapters).
  const turn = (dir) => {
    const y = position();
    const pages = chapters.map(docTop);
    const freeFrom = ledger ? docTop(ledger) : maxScroll();
    if (dir > 0) {
      if (y >= freeFrom - 2) return false;
      const next = pages.concat(freeFrom).find((t) => t > y + 2);
      glideTo(next ?? freeFrom);
    } else {
      if (y > freeFrom + 2) return false;
      const prev = pages.filter((t) => t < y - 2).pop();
      if (prev === undefined) return true;
      glideTo(prev);
    }
    root.classList.add('js-paging'); // pages.css: the CSS snap steps aside
    return true;
  };

  // A trackpad keeps sending decaying "momentum" events after the fingers lift,
  // so a gesture ends after a short pause, or when a fresh swipe or a wheel
  // notch shows up once the turn has finished.
  let lastWheel = 0;
  let lastAbs = 0;
  let acc = 0;
  let mode = null;             // this gesture: null (undecided) | 'turned' | 'free'
  // true = the wheel event is handled here; false = scroll freely
  const pageWheel = (dy) => {
    const now = performance.now();
    const abs = Math.abs(dy);
    const newSwipe = mode === 'turned' && !tween && ((abs > lastAbs * 1.6 && abs > 8) || (abs >= 80 && abs >= lastAbs));
    if (now - lastWheel > 140 || newSwipe) { acc = 0; mode = null; }
    lastWheel = now;
    lastAbs = abs;
    if (mode === 'free') return false;
    if (mode === 'turned' || tween) return true;
    acc += dy;
    if (Math.abs(acc) < 24) return true;
    mode = turn(Math.sign(acc)) ? 'turned' : 'free';
    return mode === 'turned';
  };

  addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.defaultPrevented) return;                 // pinch-zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;         // sideways swipes
    if (scrollsItself(e.target, e.deltaY)) return;
    e.preventDefault();
    const dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
    if (book) root.classList.add('js-paging');
    if (paging() && pageWheel(dy)) return;
    if (tween) return;
    let y = position() + dy;
    // free scrolling stops at the first item below the chapters; the next gesture turns back
    if (paging() && ledger && dy < 0) y = Math.max(y, docTop(ledger));
    easeTo(y);
  }, { passive: false });

  // keyboard page turns on the About page
  if (book) {
    addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !paging()) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
      const dir = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1, ' ': e.shiftKey ? -1 : 1 }[e.key];
      if (!dir || tween) { if (dir) e.preventDefault(); return; }
      if (turn(dir)) e.preventDefault();
    });
  }

  // Someone else moved the page (scrollbar drag, find-in-page): let go
  addEventListener('scroll', () => {
    if (raf && Math.abs(scrollY - current) > 2) stop();
  }, { passive: true });

  addEventListener('resize', () => { target = clamp(target); });

  // In-page links (#connect, #selectedwork, #top) glide instead of jumping,
  // and the address bar stays clean
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = link.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    easeTo(docTop(el));
  });
})();
