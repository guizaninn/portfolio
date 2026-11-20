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
