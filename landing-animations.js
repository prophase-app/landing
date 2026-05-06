'use strict';
// Landing-page animation runtime.
// Single IIFE. No module system. No build step.
//
// Modules:
//   - scroll reveal       (this commit)
//   - counter animator    (Task 5)
//   - hero typewriter     (Task 6)
//   - activity feed       (Task 7)
//   - rate chart          (Task 8)
//
// All effects respect prefers-reduced-motion: reduce by short-circuiting to
// their final state.

(function () {
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── scroll reveal ────────────────────────────────────────────────────────
  // Observe .reveal and .fade-in elements; add .is-visible the first time
  // each enters the viewport. Stagger via CSS nth-child rules.
  function wireScrollReveal() {
    const targets = document.querySelectorAll('.reveal, .fade-in');
    if (!targets.length) return;

    if (reduceMotion) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    targets.forEach((el) => io.observe(el));
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireScrollReveal);
  } else {
    wireScrollReveal();
  }
})();
