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

  // ── activity feed ───────────────────────────────────────────────────────
  // Render a simulated overnight orchestration into the hero feed-list.
  // Eight atomic activities at ~900ms cadence. The most recent line shows a
  // Braille spinner; when the next line lands, the previous spinner is
  // removed (so the previous step reads as "completed"). The footer counter
  // ticks up as each entry lands. Plays once on page load.

  const FEED_ENTRIES = [
    { time: '02:14', agent: 'hunter',     label: 'Hunter',     msg: 'Searching new job listings' },
    { time: '02:14', agent: 'hunter',     label: 'Hunter',     msg: 'Found 5 strong-fit roles' },
    { time: '02:31', agent: 'strategist', label: 'Strategist', msg: 'Picked: Senior PM at Linear' },
    { time: '02:33', agent: 'strategist', label: 'Strategist', msg: 'Reading the job post' },
    { time: '02:47', agent: 'strategist', label: 'Strategist', msg: 'Drafting a tailored cover letter' },
    { time: '03:02', agent: 'applier',    label: 'Applier',    msg: 'Filling in the application' },
    { time: '03:05', agent: 'applier',    label: 'Applier',    msg: 'Uploading resume and cover letter' },
    { time: '03:08', agent: 'applier',    label: 'Applier',    msg: 'Submitted \u2014 tracker updated' },
  ];

  const SPINNER_FRAMES = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];
  // Braille dots: ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏

  function buildFeedEntry(entry, withSpinner) {
    const li = document.createElement('li');
    li.className = 'feed-entry';
    const time = document.createElement('span');
    time.className = 'feed-entry__time';
    time.textContent = entry.time;
    const agent = document.createElement('span');
    agent.className = 'feed-entry__agent feed-entry__agent--' + entry.agent;
    agent.textContent = entry.label;
    const action = document.createElement('span');
    action.className = 'feed-entry__action';
    action.textContent = entry.msg;
    li.appendChild(time);
    li.appendChild(agent);
    li.appendChild(action);
    if (withSpinner) {
      const spin = document.createElement('span');
      spin.className = 'feed-entry__spinner';
      spin.setAttribute('aria-hidden', 'true');
      spin.textContent = SPINNER_FRAMES[0];
      action.appendChild(spin);
    }
    return li;
  }

  function spinSpinner(spinEl) {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % SPINNER_FRAMES.length;
      spinEl.textContent = SPINNER_FRAMES[i];
    }, 80);
    return id;
  }

  function runActivityFeed() {
    const list = document.querySelector('.feed-list');
    const counter = document.querySelector('[data-feed-count]');
    if (!list) return;

    if (reduceMotion) {
      FEED_ENTRIES.forEach((entry) => {
        const li = buildFeedEntry(entry, false);
        li.classList.add('is-visible');
        list.appendChild(li);
      });
      if (counter) counter.textContent = FEED_ENTRIES.length + ' actions overnight';
      return;
    }

    const cadence = 900;
    const leadIn = 600; // give the page a beat after first paint

    let prevSpinnerInterval = null;
    let prevAction = null;

    FEED_ENTRIES.forEach((entry, i) => {
      const isLast = i === FEED_ENTRIES.length - 1;
      setTimeout(() => {
        // Stop spinner on the previous entry (now "completed")
        if (prevSpinnerInterval !== null) {
          clearInterval(prevSpinnerInterval);
          prevSpinnerInterval = null;
        }
        if (prevAction) {
          const oldSpinner = prevAction.querySelector('.feed-entry__spinner');
          if (oldSpinner) oldSpinner.remove();
        }

        // Append the new entry
        const li = buildFeedEntry(entry, !isLast);
        list.appendChild(li);
        // Force-reflow trick: read offsetWidth so the browser commits the
        // initial style (opacity:0, transform:translateY(6px)) BEFORE we add
        // .is-visible. Without this read the two states coalesce into one
        // frame and the CSS transition is skipped entirely.
        // eslint-disable-next-line no-unused-expressions
        li.offsetWidth;
        li.classList.add('is-visible');

        // Wire spinner if this isn't the terminal step
        if (!isLast) {
          const spinEl = li.querySelector('.feed-entry__spinner');
          if (spinEl) prevSpinnerInterval = spinSpinner(spinEl);
          prevAction = li.querySelector('.feed-entry__action');
        }

        // Tick the footer counter
        if (counter) counter.textContent = (i + 1) + ' actions';
        if (isLast && counter) counter.textContent = FEED_ENTRIES.length + ' actions overnight';
      }, leadIn + i * cadence);
    });
  }

  function boot() {
    wireScrollReveal();
    wireCounters();
    runTypewriter();
    runActivityFeed();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
