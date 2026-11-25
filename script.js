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
