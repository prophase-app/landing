# Landing Page Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subtle, deliberate motion to the public landing page — scroll reveal, count-up numbers, hero typewriter, sequenced activity feed, animated rate chart — without changing layout or build pipeline.

**Architecture:** One new client asset `landing-animations.js` served as a static file by the existing Node server. CSS rules added to `landing.css`. Typewriter markup, `data-count-*` attributes, and `.reveal` classes added to `landing.html`. Plays-once animations triggered via `IntersectionObserver`; respects `prefers-reduced-motion`.

**Tech Stack:** Vanilla JS (no deps), CSS animations, SVG `stroke-dasharray` for the chart line, `node:test` for tests.

**Spec:** `docs/superpowers/specs/2026-05-05-landing-animations-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server.js` | Modify | Generalize `STATIC_CSS` → `STATIC_ASSETS`; serve `/landing-animations.js` |
| `server.test.js` | Modify | Replace CSS-loop test with assets-loop test that includes the new JS asset |
| `landing-animations.js` | Create | All client animation logic in one IIFE |
| `landing.html` | Modify | Add script tag, typewriter spans, data-count attrs, reveal classes, empty feed-list |
| `landing.css` | Modify | Add reveal/fade-in/stagger CSS, hero typewriter classes, chart animation, reduced-motion overrides |
| `landing-html.test.js` | Modify | Update existing assertions for new H1 / feed markup; add tests for new structure |

The JS file stays as a single IIFE because the helpers (animateCount, runTypewriter, runActivityFeed, drawChart, observeReveal) are short and call each other. No module system, no build step.

---

## Task 1: Server — serve `landing-animations.js` as a static asset

**Files:**
- Modify: `server.js`
- Modify: `server.test.js`
- Create: `landing-animations.js` (empty stub for now)

- [ ] **Step 1: Write the failing test**

In `server.test.js`, replace the CSS-only test with one that loops over all expected static assets including the new JS:

```js
test('GET landing static assets return 200 + correct content-type', async () => {
  const { server, port } = await startServer();
  try {
    const cases = [
      { path: '/landing.css',           type: /text\/css/ },
      { path: '/landing-tokens.css',    type: /text\/css/ },
      { path: '/early-access.css',      type: /text\/css/ },
      { path: '/landing-animations.js', type: /application\/javascript/ },
    ];
    for (const { path: p, type } of cases) {
      const res = await fetchPath(port, p);
      assert.equal(res.status, 200, p + ' should be 200');
      assert.match(res.headers.get('content-type') || '', type, p + ' content-type');
    }
  } finally { server.close(); }
});
```

(Delete the old `'GET landing CSS files return 200 + text/css'` test — this one supersedes it.)

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `npm test`
Expected: the new assets-loop test fails on the `/landing-animations.js` case (404 because the route doesn't exist and the file doesn't exist).

- [ ] **Step 3: Create the empty stub for `landing-animations.js`**

Create `landing-animations.js` with placeholder content:

```js
'use strict';
// Landing-page animation runtime. Built out across subsequent tasks.
// IIFE so we don't pollute window.
(function () {
  // No-op for now.
})();
```

- [ ] **Step 4: Update `server.js` to serve the JS asset**

Replace the `STATIC_CSS` map and its handler branch:

```js
const STATIC_ASSETS = {
  '/landing.css':           { file: 'landing.css',           type: 'text/css; charset=utf-8' },
  '/landing-tokens.css':    { file: 'landing-tokens.css',    type: 'text/css; charset=utf-8' },
  '/early-access.css':      { file: 'early-access.css',      type: 'text/css; charset=utf-8' },
  '/landing-animations.js': { file: 'landing-animations.js', type: 'application/javascript; charset=utf-8' },
};
```

In the handler, change the CSS branch:

```js
if (req.method === 'GET' && STATIC_ASSETS[urlPath]) {
  const asset = STATIC_ASSETS[urlPath];
  return serveStatic(res, path.join(__dirname, asset.file), asset.type);
}
```

(Replaces the existing `STATIC_CSS[urlPath]` branch verbatim.)

- [ ] **Step 5: Run tests to verify all pass**

Run: `npm test`
Expected: all tests pass, including the new assets-loop test.

- [ ] **Step 6: Commit**

```bash
git add server.js server.test.js landing-animations.js
git commit -m "feat(landing): serve landing-animations.js as a static asset"
```

---

## Task 2: HTML — add scroll-reveal classes; empty the activity feed; add data-count attrs; typewriter spans; script tag

**Files:**
- Modify: `landing.html`
- Modify: `landing-html.test.js`

This task changes the markup in one shot so the HTML matches what the JS module will drive in subsequent tasks. We update existing tests and add new ones for the new structure.

- [ ] **Step 1: Write the failing tests**

Add these new tests to `landing-html.test.js`. Update the two tests that pin old markup as noted.

```js
test('renderLandingHtml loads the animation script', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(
    html.match(/<script\s+defer\s+src="\/landing-animations\.js"><\/script>/),
    'expected deferred <script> tag for landing-animations.js'
  );
});

test('renderLandingHtml hero H1 uses typewriter spans with aria-label fallback', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // The visible text is split into three word spans, each aria-hidden, with a cursor element.
  // The H1 itself carries an aria-label so screen readers get the phrase intact.
  assert.ok(html.match(/<h1[^>]*id="hero-heading"[^>]*aria-label="Don['\u2019]t apply alone\."/),
    'H1 must carry the full phrase via aria-label');
  assert.ok(html.includes('class="hero-headline__word" data-word="0"'), 'expected word 0 span');
  assert.ok(html.includes('class="hero-headline__word" data-word="1"'), 'expected word 1 span');
  assert.ok(html.includes('class="hero-headline__word" data-word="2"'), 'expected word 2 span');
  assert.ok(html.includes('hero-headline__cursor'), 'expected cursor span');
  // The old single-line markup must be gone
  assert.ok(!html.match(/Don&rsquo;t apply<br>alone\./), 'old H1 markup must be replaced');
});

test('renderLandingHtml hero activity feed list is empty (entries injected by JS)', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // The <ul class="feed-list"> must exist but contain no <li> children in source HTML.
  // The JS module appends entries at runtime.
  const ulMatch = html.match(/<ul\s+class="feed-list"[^>]*>([\s\S]*?)<\/ul>/);
  assert.ok(ulMatch, 'expected feed-list <ul>');
  assert.ok(!ulMatch[1].includes('<li'), 'feed-list must be empty in source HTML');
  assert.ok(ulMatch[0].includes('aria-live="polite"'), 'feed-list must be aria-live="polite"');
  // Title and footer reframe to "working" tense
  assert.ok(html.includes('Your team, working'), 'expected new "working" title');
  assert.ok(html.match(/feed-card__count[^>]*>0 actions</), 'footer counter must start at 0');
  // Old hard-coded entries must be gone
  assert.ok(!html.includes('Found a strong match'), 'old hardcoded entry must be gone');
  assert.ok(!html.includes('Filtered out 14 roles'), 'old hardcoded entry must be gone');
  assert.ok(!html.includes('Submitted via Greenhouse'), 'old hardcoded entry must be gone');
  assert.ok(!html.includes('Needs your input'), 'old hardcoded entry must be gone');
  assert.ok(!html.includes('6 actions overnight'), 'old static count must be gone');
});

test('renderLandingHtml numeric tiles carry data-count-to attributes', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // Problem stats
  assert.ok(html.match(/data-count-to="87"[^>]*>87%</), '87% stat tile');
  assert.ok(html.match(/data-count-to="10"[^>]*data-count-template="&lt;\{n\}%"[^>]*>&lt;10%</),
    '<10% stat tile with template');
  assert.ok(html.match(/data-count-to="300"[^>]*data-count-template="\{n\}:1"[^>]*>300:1</),
    '300:1 stat tile with template');
  // Team card metrics
  assert.ok(html.match(/data-count-to="470"[^>]*>470</), 'Hunter metric');
  assert.ok(html.match(/data-count-to="120"[^>]*>120</), 'Strategist metric');
  assert.ok(html.match(/data-count-to="80"[^>]*>80</), 'Applier metric');
  // Chart top stats
  assert.ok(html.match(/data-count-to="840"[^>]*>840</), '840 applications');
  assert.ok(html.match(/data-count-to="45"[^>]*>45</), '45 interviews');
  assert.ok(html.match(/data-count-to="5"[^>]*data-count-template="\{n\}%"[^>]*>5%</),
    '5% conversion');
  // Offer tiles
  assert.ok(html.match(/data-count-to="2"[^>]*>2</), '2 weeks');
  assert.ok(html.match(/data-count-to="20"[^>]*data-count-template="\{n\}%"[^>]*>20%</),
    '20% off');
  // Pricing dollar amounts (wrapped in spans inside .price-card__numeral)
  assert.ok(html.match(/data-count-to="40"[^>]*data-count-template="\$\{n\}"[^>]*>\$40</),
    '$40 standard');
  assert.ok(html.match(/data-count-to="160"[^>]*data-count-template="\$\{n\}"[^>]*>\$160</),
    '$160 premium');
});

test('renderLandingHtml sections carry .reveal class for scroll-reveal', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // Each landing-section gets a reveal class so the IntersectionObserver picks it up.
  // Hero section is exempt because it's above-the-fold and shouldn't fade in.
  const sectionRegex = /<section[^>]*class="landing-section[^"]*"/g;
  const matches = html.match(sectionRegex) || [];
  assert.ok(matches.length >= 5, `expected at least 5 landing-section elements, got ${matches.length}`);
  for (const m of matches) {
    if (m.includes('hero')) continue; // hero is exempt
    assert.ok(m.includes('reveal'), `section without reveal class: ${m}`);
  }
});

test('renderLandingHtml grids carry .stagger-reveal with .reveal children', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // Each grid gets stagger-reveal; each direct child gets reveal so the
  // nth-child transition-delay rules in landing.css fire as designed.
  assert.ok(html.match(/class="stat-grid stagger-reveal"/),    'stat-grid must be stagger-reveal');
  assert.ok(html.match(/class="team-grid stagger-reveal"/),    'team-grid must be stagger-reveal');
  assert.ok(html.match(/class="pricing-grid stagger-reveal"/), 'pricing-grid must be stagger-reveal');
  assert.ok(html.match(/class="offer-grid stagger-reveal"/),   'offer-grid must be stagger-reveal');
  // Children: at least 3 stat-tiles, 3 team cards, 3 price cards, 3 offer tiles, all with reveal
  assert.ok((html.match(/class="stat-tile reveal"/g)        || []).length >= 3, 'stat tiles need reveal');
  assert.ok((html.match(/class="team-detail-card reveal"/g) || []).length >= 3, 'team cards need reveal');
  assert.ok((html.match(/class="price-card[^"]*reveal"/g)   || []).length >= 3, 'price cards need reveal');
  assert.ok((html.match(/class="offer-tile[^"]*reveal"/g)   || []).length >= 3, 'offer tiles need reveal');
});
```

**Update existing tests** that pin old markup:

- The test `'renderLandingHtml output contains hero copy with AI-by-your-side framing'` asserts `html.match(/Don&rsquo;t apply<br>alone\./)` — change that single line to assert the typewriter structure exists instead, and keep the rest:

  ```js
  assert.ok(html.includes('Don&rsquo;t') && html.includes('apply') && html.includes('alone.'),
    'expected H1 hero words present');
  assert.ok(html.includes('hero-headline__word'), 'expected new typewriter span markup');
  // Old single-line markup must NOT match
  assert.ok(!html.match(/Don&rsquo;t apply<br>alone\./), 'old H1 markup must be gone');
  ```

- The test `'renderLandingHtml hero contains live agent activity feed (value-forward)'` asserts on the old hardcoded entries (`Found a strong match`, `Filtered out`, etc.). Replace its body with assertions about the new structure (the feed-card container exists, LIVE indicator exists, the new "Your team, working" title is present, the feed-list `<ul>` exists). Move the old hardcoded-entry assertions into the new "feed list is empty" test as negative assertions (already covered above).

  Replace the test body with:

  ```js
  test('renderLandingHtml hero contains live agent activity feed shell', () => {
    const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
    assert.ok(html.includes('feed-card'), 'expected feed-card container');
    assert.ok(html.includes('LIVE'), 'expected LIVE indicator');
    assert.ok(html.includes('feed-list'), 'expected feed-list ul');
    assert.ok(html.includes('Your team, working'), 'expected working-tense title');
  });
  ```

- The test `'renderLandingHtml activity feed uses short agent names without "Job" prefix'` references hardcoded feedHtml content. Since the entries are now JS-driven, this test is checking the wrong thing. Delete the test — the agent-name framing is now enforced in `landing-animations.js` and a separate test in Task 5 will cover it.

- [ ] **Step 2: Run tests to confirm new + updated tests fail**

Run: `npm test`
Expected: the new structural tests fail because the markup hasn't been updated yet. Update the existing tests so they fail loudly until step 3.

- [ ] **Step 3: Update `landing.html`**

Make these specific changes:

(a) Add the script tag at the end of `<head>`, right after the existing PostHog `<script>`:

```html
<script defer src="/landing-animations.js"></script>
```

(b) Replace the H1 markup. Find:

```html
<h1 id="hero-heading">Don&rsquo;t apply<br>alone.</h1>
```

Replace with:

```html
<h1 id="hero-heading" class="hero-headline" aria-label="Don&rsquo;t apply alone.">
  <span class="hero-headline__word" data-word="0" aria-hidden="true">Don&rsquo;t</span>
  <span class="hero-headline__word" data-word="1" aria-hidden="true">apply</span>
  <br aria-hidden="true">
  <span class="hero-headline__word" data-word="2" aria-hidden="true">alone.</span>
  <span class="hero-headline__cursor" aria-hidden="true"></span>
</h1>
```

(c) Replace the activity feed contents. Find the entire `<div class="feed-card">` block (lines 84–128 in the current file) and replace with:

```html
<div class="feed-card">
  <div class="feed-card__header">
    <span class="live-indicator">
      <span class="live-dot" aria-hidden="true"></span>
      LIVE
    </span>
    <span class="feed-card__title">Your team, working</span>
  </div>
  <ul class="feed-list" aria-live="polite" aria-relevant="additions"></ul>
  <div class="feed-card__footer">
    <span>While you slept, your team worked.</span>
    <span class="feed-card__count" data-feed-count>0 actions</span>
  </div>
</div>
```

(d) Add `data-count-to` and `data-count-template` to numeric elements:

- Stat tiles (`<div class="stat-tile__num">`):
  - `87%` → `<div class="stat-tile__num" data-count-to="87" data-count-template="{n}%">87%</div>`
  - `<10%` → `<div class="stat-tile__num" data-count-to="10" data-count-template="<{n}%">&lt;10%</div>`
  - `300:1` → `<div class="stat-tile__num" data-count-to="300" data-count-template="{n}:1">300:1</div>`

- Team card metrics (`<div class="team-detail-card__metric-value">`):
  - `470` → add `data-count-to="470"`
  - `120` → add `data-count-to="120"`
  - `80`  → add `data-count-to="80"`

- Chart top stats (`<span class="rate-chart__stat-value">`):
  - `840` → add `data-count-to="840"`
  - `45`  → add `data-count-to="45"`
  - `5%`  → add `data-count-to="5"` and `data-count-template="{n}%"`

- Offer tiles (`<div class="offer-tile__num">`):
  - `2`   → add `data-count-to="2"`
  - `∞`   → leave alone (skip)
  - `20%` → add `data-count-to="20"` and `data-count-template="{n}%"`

- Pricing numerals — wrap the dollar amount in a span:
  - `<div class="price-card__numeral">$40<span class="price-card__suffix">/ month</span></div>` becomes:
    `<div class="price-card__numeral"><span data-count-to="40" data-count-template="${n}">$40</span><span class="price-card__suffix">/ month</span></div>`
  - Same for `$160`.
  - Free tier and the `$50` / `$200` strikethroughs stay untouched (they're decorative; counting strikethroughs would feel weird).

(e) Add `.reveal` class to each non-hero `<section class="landing-section">`:

- `<section class="landing-section">` (problem) → `<section class="landing-section reveal">`
- `<section id="how-it-works" class="landing-section">` → `<section id="how-it-works" class="landing-section reveal">`
- `<section class="landing-section">` (rate chart) → `<section class="landing-section reveal">`
- `<section id="pricing" class="landing-section">` → `<section id="pricing" class="landing-section reveal">`
- `<section class="landing-section trust">` → `<section class="landing-section trust reveal">`

The hero section keeps its current class — no reveal needed.

(f) Add `.stagger-reveal` to grids and `.reveal` to each direct child so the CSS stagger rules from Task 3 take effect:

- `<div class="stat-grid" role="list">` → `<div class="stat-grid stagger-reveal" role="list">` and add `reveal` to each `.stat-tile` (`<div class="stat-tile reveal" role="listitem">`).
- `<div class="team-grid">` → `<div class="team-grid stagger-reveal">` and add `reveal` to each `.team-detail-card`.
- `<div class="pricing-grid">` → `<div class="pricing-grid stagger-reveal">` and add `reveal` to each `.price-card`.
- `<div class="offer-grid" role="list">` → `<div class="offer-grid stagger-reveal" role="list">` and add `reveal` to each `.offer-tile`.

(The `.problem__compare` block has 3 children — leave it alone for now; the section's own reveal is enough for that piece.)

- [ ] **Step 4: Run tests to verify all HTML tests pass**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add landing.html landing-html.test.js
git commit -m "refactor(landing): mark up reveal targets, typewriter spans, count attrs"
```

---

## Task 3: CSS — reveal/fade-in/stagger, hero typewriter, reduced-motion overrides

**Files:**
- Modify: `landing.css`

CSS additions are appended to the end of `landing.css` so they're easy to locate and don't disturb existing rules.

- [ ] **Step 1: Append the animation CSS block**

Append this block to the end of `landing.css`:

```css
/* ─────────────────────────────────────────────────────────────────────────
   Animation: scroll reveal, hero typewriter, counters, chart line draw
   Added 2026-05-05. Driven by /landing-animations.js.
   prefers-reduced-motion overrides at the bottom collapse all of this
   to its final state.
   ───────────────────────────────────────────────────────────────────────── */

/* Scroll reveal */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.fade-in {
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-in.is-visible { opacity: 1; }

/* Stagger reveal: each child gets a small additional delay */
.stagger-reveal > .reveal:nth-child(1) { transition-delay: 0s; }
.stagger-reveal > .reveal:nth-child(2) { transition-delay: 0.08s; }
.stagger-reveal > .reveal:nth-child(3) { transition-delay: 0.16s; }
.stagger-reveal > .reveal:nth-child(4) { transition-delay: 0.24s; }
.stagger-reveal > .reveal:nth-child(5) { transition-delay: 0.32s; }
.stagger-reveal > .reveal:nth-child(6) { transition-delay: 0.40s; }

/* Team cards use a slightly slower stagger because each card carries weight */
.team-grid.stagger-reveal > .reveal:nth-child(1) { transition-delay: 0s; }
.team-grid.stagger-reveal > .reveal:nth-child(2) { transition-delay: 0.18s; }
.team-grid.stagger-reveal > .reveal:nth-child(3) { transition-delay: 0.36s; }

/* Hero typewriter: each word slides in by opacity + 8px lift */
.hero-headline__word {
  display: inline-block;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.35s ease-out,
    transform 0.35s ease-out;
}
.hero-headline__word.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.hero-headline__cursor {
  display: inline-block;
  width: 0.08em;
  height: 0.85em;
  margin-left: 0.06em;
  vertical-align: -0.06em;
  background: currentColor;
  opacity: 0;
  animation: hero-cursor-blink 1.1s steps(1, end) infinite;
}
.hero-headline__cursor.is-visible { opacity: 1; }
@keyframes hero-cursor-blink {
  0%, 49%   { opacity: 1; }
  50%, 100% { opacity: 0; }
}

/* Activity feed: per-entry fade + slide; spinner */
.feed-entry {
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity 0.4s ease-out,
    transform 0.4s ease-out;
}
.feed-entry.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.feed-entry__spinner {
  display: inline-block;
  margin-left: 0.4em;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-fg-muted, #6a7488);
}

/* Rate chart: line draws via stroke-dashoffset; dots pop in; fill fades */
.rate-chart__viz svg .chart-line {
  stroke-dasharray: var(--chart-line-length, 1000);
  stroke-dashoffset: var(--chart-line-length, 1000);
  transition: stroke-dashoffset 1.5s ease-out;
}
.rate-chart__viz.is-drawing svg .chart-line {
  stroke-dashoffset: 0;
}
.rate-chart__viz svg .chart-fill {
  opacity: 0;
  transition: opacity 0.4s ease-out 1.5s;
}
.rate-chart__viz.is-drawing svg .chart-fill {
  opacity: 1;
}
.rate-chart__viz svg .chart-dot {
  transform: scale(0);
  transform-origin: center;
  transform-box: fill-box;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rate-chart__viz.is-drawing svg .chart-dot {
  transform: scale(1);
}
.rate-chart__viz svg .chart-annotation {
  opacity: 0;
  transition: opacity 0.4s ease-out 1.5s;
}
.rate-chart__viz.is-drawing svg .chart-annotation {
  opacity: 1;
}

/* Reduced motion: every animation collapses to final state */
@media (prefers-reduced-motion: reduce) {
  .reveal,
  .fade-in,
  .hero-headline__word,
  .feed-entry,
  .rate-chart__viz svg .chart-line,
  .rate-chart__viz svg .chart-fill,
  .rate-chart__viz svg .chart-dot,
  .rate-chart__viz svg .chart-annotation {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    stroke-dashoffset: 0 !important;
  }
  .hero-headline__cursor {
    opacity: 1 !important;
    animation: none !important;
  }
}
```

- [ ] **Step 2: Run tests to ensure nothing broke**

Run: `npm test`
Expected: all tests pass (CSS changes don't affect HTML structure tests).

- [ ] **Step 3: Commit**

```bash
git add landing.css
git commit -m "feat(landing): animation CSS for reveal, typewriter, chart, reduced-motion"
```

---

## Task 4: JS module — scroll reveal observer + helper exports

**Files:**
- Modify: `landing-animations.js`

This task wires up the always-on scroll-reveal pattern. After this commit, the page reveals sections on scroll. Subsequent tasks layer on counters, typewriter, feed, and chart.

- [ ] **Step 1: Replace the stub with the reveal-only runtime**

Replace the body of `landing-animations.js`:

```js
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
```

- [ ] **Step 2: Add a smoke test for the new file content**

Append to `landing-html.test.js`:

```js
test('landing-animations.js IIFE exists and wires reveal observer', () => {
  const path = require('path');
  const raw = fs.readFileSync(path.join(__dirname, 'landing-animations.js'), 'utf8');
  assert.ok(raw.startsWith("'use strict'"), 'must be strict mode');
  assert.ok(raw.includes('IntersectionObserver'), 'must use IntersectionObserver for reveal');
  assert.ok(raw.includes('prefers-reduced-motion'), 'must check prefers-reduced-motion');
  assert.ok(raw.includes("classList.add('is-visible')"), 'must add is-visible class');
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all tests pass, including the new smoke test.

- [ ] **Step 4: Commit**

```bash
git add landing-animations.js landing-html.test.js
git commit -m "feat(landing): scroll reveal observer in landing-animations.js"
```

---

## Task 5: JS — count-up helper and counter observer

**Files:**
- Modify: `landing-animations.js`
- Modify: `landing-html.test.js`

- [ ] **Step 1: Add the counter machinery to the IIFE**

Insert this block inside the IIFE in `landing-animations.js`, between the `wireScrollReveal` function and the boot code:

```js
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
```

Then update the boot code to call both:

```js
  function boot() {
    wireScrollReveal();
    wireCounters();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
```

(Replace the previous `DOMContentLoaded` / direct call lines with this.)

- [ ] **Step 2: Mark the chart section and team cards as driven so generic counter doesn't double-fire**

In `landing.html`:

(a) Add `data-count-driven` to the chart's stats container:

```html
<div class="rate-chart__stats" data-count-driven>
```

(b) Add `data-count-driven` to each team-card metric block (the one wrapping the metric-value), so all three Hunter/Strategist/Applier cards have it:

```html
<div class="team-detail-card__metric" data-count-driven>
```

These markers tell the generic `wireCounters` to skip those tiles — they'll be fired by Task 8 (chart) and Task 4-supplement (team cards). For now they remain at their static values until those tasks implement the driven firing.

- [ ] **Step 3: Add tests**

Append to `landing-html.test.js`:

```js
test('landing-animations.js exposes counter helpers and wires generic observer', () => {
  const path = require('path');
  const raw = fs.readFileSync(path.join(__dirname, 'landing-animations.js'), 'utf8');
  assert.ok(raw.includes('animateCount'), 'must define animateCount');
  assert.ok(raw.includes('easeOutCubic'), 'must define easeOutCubic');
  assert.ok(raw.includes('data-count-to'), 'must read data-count-to');
  assert.ok(raw.includes('data-count-template'), 'must read data-count-template');
  assert.ok(raw.includes('data-count-driven'), 'must skip driven counters');
});

test('renderLandingHtml chart and team-card metrics opt out of generic counter', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.match(/<div\s+class="rate-chart__stats"\s+data-count-driven>/),
    'chart stats must opt out');
  const drivenMetrics = (html.match(/team-detail-card__metric"\s+data-count-driven/g) || []).length;
  assert.equal(drivenMetrics, 3, 'expected all 3 team-card metric blocks to be driven');
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add landing-animations.js landing.html landing-html.test.js
git commit -m "feat(landing): count-up helper and generic counter observer"
```

---

## Task 6: JS — hero typewriter scheduler

**Files:**
- Modify: `landing-animations.js`
- Modify: `landing-html.test.js`

- [ ] **Step 1: Add the typewriter module to the IIFE**

Insert this block in `landing-animations.js`, after the counter machinery, before `boot`:

```js
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
```

Add `runTypewriter()` to the `boot` function:

```js
  function boot() {
    wireScrollReveal();
    wireCounters();
    runTypewriter();
  }
```

- [ ] **Step 2: Add a smoke test**

Append to `landing-html.test.js`:

```js
test('landing-animations.js wires the hero typewriter', () => {
  const path = require('path');
  const raw = fs.readFileSync(path.join(__dirname, 'landing-animations.js'), 'utf8');
  assert.ok(raw.includes('runTypewriter'), 'must define runTypewriter');
  assert.ok(raw.includes('hero-headline'), 'must target the hero-headline class');
  assert.ok(raw.includes('hero-headline__word'), 'must reveal word spans');
  assert.ok(raw.includes('hero-headline__cursor'), 'must reveal cursor');
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add landing-animations.js landing-html.test.js
git commit -m "feat(landing): hero H1 typewriter — Don't / apply / alone with blinking cursor"
```

---

## Task 7: JS — activity feed sequencer

**Files:**
- Modify: `landing-animations.js`
- Modify: `landing-html.test.js`

- [ ] **Step 1: Add the activity feed module to the IIFE**

Insert this block in `landing-animations.js`, after the typewriter module, before `boot`:

```js
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
    { time: '03:08', agent: 'applier',    label: 'Applier',    msg: 'Submitted — tracker updated' },
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
        // Force reflow so the transition kicks in
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
```

Add `runActivityFeed()` to `boot`:

```js
  function boot() {
    wireScrollReveal();
    wireCounters();
    runTypewriter();
    runActivityFeed();
  }
```

- [ ] **Step 2: Add tests**

Append to `landing-html.test.js`:

```js
test('landing-animations.js seeds the activity feed with 8 atomic entries', () => {
  const path = require('path');
  const raw = fs.readFileSync(path.join(__dirname, 'landing-animations.js'), 'utf8');
  assert.ok(raw.includes('FEED_ENTRIES'), 'must define a FEED_ENTRIES array');
  assert.ok(raw.includes("'Hunter'"),     'feed must have a Hunter entry');
  assert.ok(raw.includes("'Strategist'"), 'feed must have a Strategist entry');
  assert.ok(raw.includes("'Applier'"),    'feed must have an Applier entry');
  // Atomic, accessible language — every line is a single small action
  assert.ok(raw.includes('Searching new job listings'),  'Hunter step 1');
  assert.ok(raw.includes('Found 5 strong-fit roles'),    'Hunter step 2');
  assert.ok(raw.includes('Picked: Senior PM at Linear'), 'Strategist step 1');
  assert.ok(raw.includes('Reading the job post'),        'Strategist step 2');
  assert.ok(raw.includes('Drafting a tailored cover letter'), 'Strategist step 3');
  assert.ok(raw.includes('Filling in the application'),  'Applier step 1');
  assert.ok(raw.includes('Uploading resume and cover letter'), 'Applier step 2');
  assert.ok(raw.includes('Submitted'),                   'Applier step 3 (terminal)');
  // The footer counter is updated by the JS, not the HTML
  assert.ok(raw.includes('data-feed-count'),             'must update footer counter');
  // Spinner frames present
  assert.ok(raw.includes('SPINNER_FRAMES'),              'must define spinner frames');
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add landing-animations.js landing-html.test.js
git commit -m "feat(landing): activity feed sequencer with 8 atomic stages and spinner"
```

---

## Task 8: JS — chart line draw + driven counters + team-card driven counters

**Files:**
- Modify: `landing-animations.js`
- Modify: `landing.html`
- Modify: `landing.css` (small additions for chart class hooks)
- Modify: `landing-html.test.js`

- [ ] **Step 1: Add classes to chart SVG so CSS can target it**

In `landing.html`, find the chart SVG block and add classes to its parts so the CSS rules in Task 3 take effect. Specifically:

(a) Add `class="chart-fill"` to the filled-area `<path>`:

```html
<path class="chart-fill" d="M 56,200 L 114,185 ...
```

(b) Add `class="chart-line"` to the polyline:

```html
<polyline class="chart-line" points="56,200 114,185 ...
```

(c) Wrap the 12 `<circle>` data dots with `class="chart-dot"`:

```html
<circle class="chart-dot" cx="56"  cy="200" r="4" ... />
```

(Apply to all 12 — small mechanical edit.)

(d) Add `class="chart-annotation"` to the final `9` text label:

```html
<text class="chart-annotation" x="696" y="48" ...>9</text>
```

- [ ] **Step 2: Add the chart module to the IIFE**

Insert in `landing-animations.js`, after the activity feed, before `boot`:

```js
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
```

- [ ] **Step 3: Add the team-card driven counters**

Insert this small module in `landing-animations.js`, after `runChart`, before `boot`:

```js
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
```

Add both to `boot`:

```js
  function boot() {
    wireScrollReveal();
    wireCounters();
    runTypewriter();
    runActivityFeed();
    runChart();
    runTeamCardCounters();
  }
```

- [ ] **Step 4: Add tests**

Append to `landing-html.test.js`:

```js
test('landing.html chart SVG has class hooks for animation', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('class="chart-fill"'),       'expected chart-fill class on filled area');
  assert.ok(html.includes('class="chart-line"'),       'expected chart-line class on polyline');
  assert.ok(html.includes('class="chart-annotation"'), 'expected chart-annotation class on final label');
  const dotCount = (html.match(/class="chart-dot"/g) || []).length;
  assert.ok(dotCount >= 12, `expected at least 12 chart-dot circles, got ${dotCount}`);
});

test('landing-animations.js wires chart line draw and driven counters', () => {
  const path = require('path');
  const raw = fs.readFileSync(path.join(__dirname, 'landing-animations.js'), 'utf8');
  assert.ok(raw.includes('runChart'),              'must define runChart');
  assert.ok(raw.includes('getTotalLength'),        'must measure polyline length');
  assert.ok(raw.includes('--chart-line-length'),   'must set CSS custom prop for line length');
  assert.ok(raw.includes("classList.add('is-drawing')"), 'must add is-drawing class');
  assert.ok(raw.includes('runTeamCardCounters'),   'must define team-card counter driver');
});
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add landing-animations.js landing.html landing.css landing-html.test.js
git commit -m "feat(landing): rate-chart line draw + dot pop-in + driven team-card counters"
```

---

## Task 9: Browser smoke test

**Files:** None modified.

This task verifies the animations work end-to-end in a real browser. No code change.

- [ ] **Step 1: Start the dev server**

Run: `npm start`
The server listens on port 3000 by default.

- [ ] **Step 2: Open the page in a Chromium-based browser via Playwright**

Use the playwright-cli skill helper, or run a one-liner Playwright script. Example one-liner script (place in `/tmp/landing-smoke.js`):

```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://127.0.0.1:3000/');

  // Hero typewriter: word 0 visible at ~250ms, word 2 at ~1850ms, cursor at ~2200ms
  await page.waitForTimeout(2300);
  const w0 = await page.locator('.hero-headline__word[data-word="0"]').evaluate((el) => el.classList.contains('is-visible'));
  const w2 = await page.locator('.hero-headline__word[data-word="2"]').evaluate((el) => el.classList.contains('is-visible'));
  const cur = await page.locator('.hero-headline__cursor').evaluate((el) => el.classList.contains('is-visible'));
  console.log({ w0, w2, cur });

  // Activity feed: by ~8s, all 8 entries should be in the DOM
  await page.waitForTimeout(8000);
  const entries = await page.locator('.feed-entry').count();
  const counter = await page.locator('[data-feed-count]').textContent();
  console.log({ entries, counter });

  // Scroll to chart, verify line draws (after 1.5s, dashoffset should be 0)
  await page.locator('.rate-chart').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  const isDrawing = await page.locator('.rate-chart__viz').evaluate((el) => el.classList.contains('is-drawing'));
  const stat840 = await page.locator('.rate-chart__stat-value[data-count-to="840"]').textContent();
  console.log({ isDrawing, stat840 });

  // Take a screenshot for visual review
  await page.screenshot({ path: '/tmp/landing-final.png', fullPage: true });
  await browser.close();
})();
```

Run: `node /tmp/landing-smoke.js`

Expected console output:
- `{ w0: true, w2: true, cur: true }` — typewriter completed
- `{ entries: 8, counter: '8 actions overnight' }` — feed completed
- `{ isDrawing: true, stat840: '840' }` — chart drew, stat counted up

- [ ] **Step 3: Open the screenshot for visual review**

Visually verify:
- Each section faded in as it scrolled into view (the screenshot is fullPage so all should be visible at final state).
- The hero H1 reads "Don't apply alone." with a blinking cursor element next to "alone."
- The activity feed has 8 entries, no spinner on the last entry, footer reads "8 actions overnight".
- The chart has a complete line, all dots filled, fill area visible, "9" label visible.
- All counters at their final values (87%, <10%, 300:1, 470, 120, 80, 840, 45, 5%, 2, 20%, $40, $160).

- [ ] **Step 4: Spot-check `prefers-reduced-motion`**

Re-run the script with reduced motion forced:

```js
// Replace the page = await browser.newPage(...) line with:
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
```

Expected: page loads in final state immediately. Console: typewriter+feed+chart are all in their final positions on first frame.

- [ ] **Step 5: No commit needed**

This task is verification only. If anything failed, return to the relevant prior task to fix.

---

## Self-Review Notes

**Spec coverage check (against `2026-05-05-landing-animations-design.md`):**

- §Architecture (single new asset, IIFE, observer-driven) → Task 1, 4
- §1 Scroll reveal → Task 3 (CSS), Task 4 (JS)
- §2 Hero typewriter → Task 2 (HTML), Task 3 (CSS), Task 6 (JS)
- §3 Activity feed (8 entries, ~900ms cadence, spinner, footer counter) → Task 2 (HTML shell), Task 7 (JS)
- §4 Counters (data-count-to/template, easeOutCubic, retrigger=never) → Task 2 (HTML attrs), Task 5 (JS)
- §5 Team cards (staggered, driven counters) → Task 2 (CSS hook via .stagger-reveal), Task 8 (driven counters)
- §6 Chart (axes instant, polyline draw, dot pop-in, fill fade, top stats in lockstep) → Task 3 (CSS), Task 8 (JS)
- §7 Reveal map → Task 2 (.reveal classes), Task 5 (data-count-driven exemptions)
- §Accessibility (reduced-motion, aria-label, aria-live, aria-hidden) → Task 2 (markup), Task 3 (reduced-motion CSS), Task 4–8 (JS short-circuits)
- §Server change → Task 1
- "What we are NOT doing" — confirmed: no library, no build, no layout changes, no replay, no scroll-up retrigger.

**Type/name consistency check:**

- `animateCount(el, opts)` signature consistent across Tasks 5, 8.
- `data-count-driven` marker introduced in Task 5, consumed in Tasks 5/8.
- `data-counted="1"` flag used uniformly in Tasks 5/8 to prevent re-firing.
- CSS class `.is-visible` used uniformly across reveal/typewriter/feed/cursor.
- CSS class `.is-drawing` used only on `.rate-chart__viz` (Task 3 + 8).
- Spinner frames defined as Braille `\u280B`-`\u280F` — present in CSS as `.feed-entry__spinner` styling and JS as `SPINNER_FRAMES`.

**No placeholders found.** All steps have explicit code or commands.

---

## Out of scope

- The early-access page (`early-access.html`) — separate spec when desired.
- Mobile-specific animation tuning beyond reduced-motion.
- Any analytics events for animation completion (could be added later if useful).
