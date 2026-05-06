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

  // ── hero typewriter ─────────────────────────────────────────────────────
  // Type each H1 word letter-by-letter with the cursor following the active
  // word. Pause between words for a deliberate cadence. Returns the total
  // duration in ms so the activity feed can wait for the typewriter to land
  // before it starts. Skipped under reduced motion (all words and cursor
  // become visible immediately and the function returns 0).
  function runTypewriter() {
    const h1 = document.querySelector('.hero-headline');
    if (!h1) return 0;
    const words = h1.querySelectorAll('.hero-headline__word');
    const cursor = h1.querySelector('.hero-headline__cursor');

    if (reduceMotion) {
      words.forEach((w) => w.classList.add('is-visible'));
      if (cursor) cursor.classList.add('is-visible');
      return 0;
    }

    // Replace each word's text with an empty text node so we can append
    // characters without disturbing the cursor element. The cursor moves
    // into whichever word is currently being typed.
    const targets = Array.from(words).map((w) => w.textContent);
    const textNodes = Array.from(words).map((w) => {
      w.textContent = '';
      const tn = document.createTextNode('');
      w.appendChild(tn);
      w.classList.add('is-visible');
      return tn;
    });
    if (cursor) {
      cursor.classList.add('is-visible');
      words[0].appendChild(cursor);
    }

    const charDelay = 55;       // ms per character
    const wordPause = 280;      // ms pause between words
    const leadIn = 200;         // ms before the first character lands

    let t = leadIn;
    targets.forEach((target, wi) => {
      setTimeout(() => { if (cursor) words[wi].appendChild(cursor); }, t);
      for (let ci = 0; ci < target.length; ci++) {
        const slice = target.slice(0, ci + 1);
        setTimeout(() => { textNodes[wi].data = slice; }, t);
        t += charDelay;
      }
      t += wordPause;
    });
    return t;
  }

  // ── hero demo (button → click → loading → panel → entries → success) ───
  // Choreographed sequence in the upper-right hero slot. Plays once, after
  // the typewriter completes. Each entry runs its own spinner before
  // transitioning to a green-check Done state. After the final entry, a
  // success badge fades in below the panel.

  const FEED_ENTRIES = [
    { agent: 'hunter',     label: 'Hunter',     msg: 'Searching new job listings' },
    { agent: 'hunter',     label: 'Hunter',     msg: 'Ranking 5 strong-fit roles' },
    { agent: 'strategist', label: 'Strategist', msg: 'Selecting Senior PM at Linear' },
    { agent: 'strategist', label: 'Strategist', msg: 'Reading the job post' },
    { agent: 'strategist', label: 'Strategist', msg: 'Tailoring your cover letter' },
    { agent: 'applier',    label: 'Applier',    msg: 'Filling in the application' },
    { agent: 'applier',    label: 'Applier',    msg: 'Uploading resume and cover letter' },
    { agent: 'applier',    label: 'Applier',    msg: 'Submitting application' },
  ];

  const SPINNER_FRAMES = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];
  // Braille dots: ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏

  function buildFeedEntry(entry, finalState) {
    const li = document.createElement('li');
    li.className = 'feed-entry';
    const agent = document.createElement('span');
    agent.className = 'feed-entry__agent feed-entry__agent--' + entry.agent;
    agent.textContent = entry.label;
    const action = document.createElement('span');
    action.className = 'feed-entry__action';
    action.textContent = entry.msg;
    const status = document.createElement('span');
    if (finalState) {
      status.className = 'feed-entry__status feed-entry__status--done';
      status.innerHTML = '<span class="feed-entry__check" aria-hidden="true">\u2713</span><span>Done</span>';
    } else {
      status.className = 'feed-entry__status feed-entry__status--spinning';
      status.setAttribute('aria-hidden', 'true');
      status.textContent = SPINNER_FRAMES[0];
    }
    li.appendChild(agent);
    li.appendChild(action);
    li.appendChild(status);
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

  function setEntryDone(li) {
    const status = li.querySelector('.feed-entry__status');
    if (!status) return;
    status.className = 'feed-entry__status feed-entry__status--done';
    status.removeAttribute('aria-hidden');
    status.innerHTML = '<span class="feed-entry__check" aria-hidden="true">\u2713</span><span>Done</span>';
  }

  function runActivityFeed(externalLeadIn) {
    // Drives the upper-right hero slot end to end:
    //  1. button visible (initial state — present in markup)
    //  2. typewriter completes → +1s pause
    //  3. button click animation → loading state ("Deploying your AI career team")
    //  4. button vanishes; feed-card spawns
    //  5. each entry: appears with spinner → ~850ms later transitions to ✓ Done
    //  6. success badge fades in below the panel
    const button = document.querySelector('[data-hero-demo]');
    const buttonLabel = button && button.querySelector('[data-hero-demo-label]');
    const buttonSpinner = button && button.querySelector('[data-hero-demo-spinner]');
    const panel = document.querySelector('[data-feed-panel]');
    const list = document.querySelector('.feed-list');
    const success = document.querySelector('[data-hero-success]');
    if (!list) return;

    if (reduceMotion) {
      // Snap straight to the final state: no button, panel + entries + success.
      if (button) button.setAttribute('hidden', '');
      if (panel) panel.removeAttribute('hidden');
      FEED_ENTRIES.forEach((entry) => {
        const li = buildFeedEntry(entry, /*finalState*/ true);
        li.classList.add('is-visible');
        list.appendChild(li);
      });
      if (success) {
        success.removeAttribute('hidden');
        success.classList.add('is-visible');
      }
      return;
    }

    const baseLead = (typeof externalLeadIn === 'number' && externalLeadIn > 0)
      ? externalLeadIn
      : 600;
    const POST_TYPE_PAUSE   = 1000;  // beat after H1 lands before button "clicks"
    const CLICK_ANIM_MS     = 320;
    const LOADING_MS        = 1800;  // "Deploying your AI career team" lingers
    const VANISH_MS         = 280;
    const SPAWN_MS          = 380;
    const SPINNER_DUR       = 1350;  // each entry spinner runs this long
    const ENTRY_GAP         = 280;   // gap between one entry's "Done" and the next entry appearing
    const SUCCESS_DELAY     = 500;   // delay after last entry's Done before success badge

    const t0 = baseLead + POST_TYPE_PAUSE;

    // 1. Click animation
    setTimeout(() => {
      if (button) button.classList.add('is-clicked');
    }, t0);

    // 2. After click animation finishes: enter loading state, swap text, spin
    let buttonSpinId = null;
    setTimeout(() => {
      if (!button) return;
      button.classList.remove('is-clicked');
      button.classList.add('is-loading');
      if (buttonLabel) buttonLabel.textContent = 'Deploying your AI career team';
      if (buttonSpinner) {
        buttonSpinner.textContent = SPINNER_FRAMES[0];
        buttonSpinId = spinSpinner(buttonSpinner);
      }
    }, t0 + CLICK_ANIM_MS);

    // 3. After loading: vanish the button
    const vanishAt = t0 + CLICK_ANIM_MS + LOADING_MS;
    setTimeout(() => {
      if (button) button.classList.add('is-vanishing');
    }, vanishAt);

    // 4. After vanish: spawn the panel
    const spawnAt = vanishAt + VANISH_MS;
    setTimeout(() => {
      if (buttonSpinId !== null) clearInterval(buttonSpinId);
      if (button) button.setAttribute('hidden', '');
      if (!panel) return;
      panel.removeAttribute('hidden');
      panel.classList.add('is-spawning');
      // eslint-disable-next-line no-unused-expressions
      panel.offsetWidth; // force reflow so the spawn transition fires
      panel.classList.add('is-spawned');
    }, spawnAt);

    // 5. Cascade entries, each running its own spinner → Done cycle
    const perEntry = SPINNER_DUR + ENTRY_GAP;
    const entriesStart = spawnAt + SPAWN_MS;
    FEED_ENTRIES.forEach((entry, i) => {
      const entryAppearAt = entriesStart + i * perEntry;
      setTimeout(() => {
        const li = buildFeedEntry(entry, false);
        list.appendChild(li);
        // eslint-disable-next-line no-unused-expressions
        li.offsetWidth;
        li.classList.add('is-visible');
        const status = li.querySelector('.feed-entry__status');
        const spinId = status ? spinSpinner(status) : null;
        setTimeout(() => {
          if (spinId !== null) clearInterval(spinId);
          setEntryDone(li);
        }, SPINNER_DUR);
      }, entryAppearAt);
    });

    // 6. Success badge after the last entry's Done state lands
    const lastEntryDoneAt = entriesStart + (FEED_ENTRIES.length - 1) * perEntry + SPINNER_DUR;
    setTimeout(() => {
      if (!success) return;
      success.removeAttribute('hidden');
      // eslint-disable-next-line no-unused-expressions
      success.offsetWidth;
      success.classList.add('is-visible');
    }, lastEntryDoneAt + SUCCESS_DELAY);
  }

  // ── rate chart ──────────────────────────────────────────────────────────
  // When the chart section enters view: fire counters in the stats row,
  // measure the polyline length, then add .is-drawing to the viz to trigger
  // the CSS-driven line draw + dot pop-in + fill fade.
  function runChart() {
    const viz = document.querySelector('.rate-chart__viz');
    if (!viz) return;
    const line = viz.querySelector('.chart-line');
    const stats = document.querySelector('.rate-chart__stats[data-count-driven]');

    function play() {
      // Measure the polyline length once and pass it to CSS via a custom prop
      if (line && typeof line.getTotalLength === 'function') {
        const len = line.getTotalLength();
        viz.style.setProperty('--chart-line-length', String(len));
        // Force a reflow so the dasharray/offset apply before .is-drawing
        // eslint-disable-next-line no-unused-expressions
        viz.offsetWidth;
      }
      viz.classList.add('is-drawing');
      // Fire the three top-stat counters in lockstep with the line draw
      if (stats) {
        const counters = stats.querySelectorAll('[data-count-to]');
        counters.forEach((el) => {
          if (el.dataset.counted === '1') return;
          el.dataset.counted = '1';
          // 1500ms matches the line-draw duration
          animateCount(el, { duration: 1500 });
        });
      }
    }

    if (reduceMotion) {
      // Skip the line draw, just snap to final state
      viz.classList.add('is-drawing');
      if (stats) {
        stats.querySelectorAll('[data-count-to]').forEach((el) => {
          el.dataset.counted = '1';
          animateCount(el, { duration: 0 });
        });
      }
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        play();
      });
    }, { threshold: 0.25 });
    io.observe(viz);
  }

  // ── team cards (driven counters) ────────────────────────────────────────
  // The team-grid stagger reveal is CSS-driven (transition-delay per card).
  // When the section enters view, fire each card's metric counter offset by
  // its stagger delay so the count-up lands just after the card finishes
  // sliding in.
  function runTeamCardCounters() {
    const grid = document.querySelector('.team-grid');
    if (!grid) return;
    const metrics = grid.querySelectorAll('.team-detail-card__metric[data-count-driven] [data-count-to]');
    if (!metrics.length) return;

    function fire() {
      const delays = [0, 180, 360]; // matches CSS team-grid stagger
      metrics.forEach((el, i) => {
        if (el.dataset.counted === '1') return;
        el.dataset.counted = '1';
        const delay = delays[i] || 0;
        if (reduceMotion) {
          animateCount(el, { duration: 0 });
        } else {
          setTimeout(() => animateCount(el), delay + 250);
        }
      });
    }

    if (reduceMotion) { fire(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        fire();
      });
    }, { threshold: 0.15 });
    io.observe(grid);
  }

  function boot() {
    wireScrollReveal();
    wireCounters();
    // Sequence: typewriter first, then the activity feed picks up where
    // the H1 lands. +200ms breath after the typewriter completes.
    const typewriterDur = runTypewriter() || 0;
    runActivityFeed(typewriterDur + 200);
    runChart();
    runTeamCardCounters();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
