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

  // ── counter animator ────────────────────────────────────────────────────
  // Elements with data-count-to (and optional data-count-template containing
  // {n}) animate from 0 to the target value when they enter view. Counters
  // inside [data-count-driven] containers are skipped here — those are fired
  // by other modules (chart, feed, team cards) on their own timeline.
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCount(el, opts) {
    opts = opts || {};
    const to = Number(el.getAttribute('data-count-to'));
    if (!Number.isFinite(to)) return;
    const template = el.getAttribute('data-count-template') || '{n}';
    const duration = opts.duration || 1200;
    const start = performance.now();

    if (reduceMotion) {
      el.textContent = template.replace('{n}', String(to));
      return;
    }

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(to * easeOutCubic(t));
      el.textContent = template.replace('{n}', String(v));
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = template.replace('{n}', String(to));
    }
    requestAnimationFrame(tick);
  }

  function wireCounters() {
    // Counters that are NOT inside a [data-count-driven] container are
    // driven by section reveal. The driven ones are fired by their owning
    // module (chart / team cards) on their own timing.
    const sections = document.querySelectorAll('.landing-section');
    if (!sections.length) return;

    if (reduceMotion) {
      document.querySelectorAll('[data-count-to]').forEach((el) => animateCount(el));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const counters = entry.target.querySelectorAll('[data-count-to]');
        counters.forEach((el) => {
          if (el.closest('[data-count-driven]')) return; // owned by another module
          if (el.dataset.counted === '1') return;
          el.dataset.counted = '1';
          animateCount(el);
        });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    sections.forEach((s) => io.observe(s));
  }

  // Expose for other modules in this IIFE
  const Counter = { animate: animateCount };

  // ── hero typewriter ─────────────────────────────────────────────────────
  // Reveal the three H1 word spans in sequence with a ~800ms cadence,
  // then reveal the blinking cursor. Skipped under reduced motion (all
  // words and cursor are immediately visible).
  function runTypewriter() {
    const h1 = document.querySelector('.hero-headline');
    if (!h1) return;
    const words = h1.querySelectorAll('.hero-headline__word');
    const cursor = h1.querySelector('.hero-headline__cursor');

    if (reduceMotion) {
      words.forEach((w) => w.classList.add('is-visible'));
      if (cursor) cursor.classList.add('is-visible');
      return;
    }

    const cadence = 800;       // ms between words
    const leadIn = 200;        // ms before the first word lands

    words.forEach((word, i) => {
      setTimeout(() => word.classList.add('is-visible'), leadIn + i * cadence);
    });
    if (cursor) {
      setTimeout(
        () => cursor.classList.add('is-visible'),
        leadIn + words.length * cadence - cadence + 350
      );
    }
  }

  function boot() {
    wireScrollReveal();
    wireCounters();
    runTypewriter();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
