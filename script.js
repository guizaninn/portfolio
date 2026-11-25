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
// the old Framer site had). Each wheel tick moves a target; the page eases toward
// it every frame. Touch scrolling, keyboard and scrollbar stay native.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  root.classList.add('smooth-scroll'); // styles.css: hands scrolling over to this script

  const EASE = 0.085;          // share of the remaining distance covered per 60fps frame (lower = slower)
  let target = scrollY;
  let current = scrollY;
  let raf = 0;
  let last = 0;

  const maxScroll = () => root.scrollHeight - innerHeight;
  const clamp = (v) => Math.min(Math.max(v, 0), maxScroll());

  const frame = (now) => {
    const dt = Math.min(now - (last || now), 64) || 16.7;
    last = now;
    current += (target - current) * (1 - Math.pow(1 - EASE, dt / 16.7));
    if (Math.abs(target - current) < 0.5) {
      current = target;
      raf = 0;
      last = 0;
    } else {
      raf = requestAnimationFrame(frame);
    }
    scrollTo(0, current);
  };

  const scrollToY = (y) => {
    if (!raf) current = scrollY;
    target = clamp(y);
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    target = current = scrollY;
  };

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

  // About page: the chapters snap into place once the wheel goes quiet
  const snapPoints = document.querySelector('.page-about')
    ? () => [...document.querySelectorAll('.chapter, .ledger')].map((el) => el.getBoundingClientRect().top + scrollY).concat(maxScroll())
    : null;
  let snapTimer;
  const snapSoon = () => {
    if (!snapPoints || innerHeight < 560) return;
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      const nearest = snapPoints().reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
      if (Math.abs(nearest - target) < innerHeight * 0.35) scrollToY(nearest);
    }, 160);
  };

  addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.defaultPrevented) return;                 // pinch-zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;         // sideways swipes
    if (scrollsItself(e.target, e.deltaY)) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
    scrollToY((raf ? target : scrollY) + e.deltaY * unit);
    snapSoon();
  }, { passive: false });

  // Someone else moved the page (scrollbar drag, keyboard, find-in-page): let go
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
    if (!id || !el) return;
    e.preventDefault();
    scrollToY(el.getBoundingClientRect().top + scrollY);
  });
})();
