# Landing page animation pass — design

**Goal:** make the public landing page feel alive without changing its layout, copy hierarchy, or build pipeline. Subtle, deliberate motion that delights without distracting.

## Architecture

Single new client asset: `landing-animations.js`, served as a static file from the existing Node server. Animation rules live in `landing.css` alongside the existing styles. No build step, no dependencies. The script is loaded with `defer` from `landing.html`.

Server change: `server.js` currently has a `STATIC_CSS` map for serving CSS. Generalize it to a `STATIC_ASSETS` map keyed by URL path with `{ file, contentType }` entries so JS can be served the same way. The existing CSS routes keep working.

The whole module is one IIFE that:

1. Reads `prefers-reduced-motion`. If set, every animation short-circuits to its final state — no typewriter, no count-up, no line draw, no stagger. The page renders as it does today.
2. Wires an `IntersectionObserver` for scroll-reveal classes (`.reveal`, `.fade-in`, `.stagger-reveal` children).
3. Wires a second observer for "fire-once" effects (counters, chart draw, team-card stagger, hero typewriter, activity feed) — each effect is keyed off its container entering the viewport and runs once.
4. Provides small helpers: `animateCount(el, to, opts)`, `drawLine(svg)`, `runActivityFeed(list)`, `runTypewriter(h1)`.

## Animation modules

### 1. Scroll reveal

Port the portfolio's pattern verbatim. CSS:

```css
.reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
.reveal.is-visible { opacity: 1; transform: translateY(0); }
.fade-in { opacity: 0; transition: opacity .8s cubic-bezier(.16,1,.3,1); }
.fade-in.is-visible { opacity: 1; }
.stagger-reveal > .reveal:nth-child(1) { transition-delay: 0s; }
.stagger-reveal > .reveal:nth-child(2) { transition-delay: .08s; }
/* …through nth-child(6) */
```

Note: portfolio uses `.visible`. We use `.is-visible` to avoid colliding with any utility class names elsewhere on the page.

Apply `.reveal` to each `<section class="landing-section">`. Apply `.stagger-reveal` to:

- `.stat-grid` (3 stat tiles)
- `.team-grid` (3 team cards)
- `.pricing-grid` (3 price cards)
- `.offer-grid` (3 offer tiles)
- `.problem__compare` (before/arrow/after — 3 children)

For each, mark the direct children `.reveal` so the stagger nth-child rules apply.

Threshold + rootMargin: `{ threshold: 0.08, rootMargin: '0px 0px -40px 0px' }` — same as portfolio.

Above-the-fold sections (hero) get `.is-visible` added on `DOMContentLoaded` so they don't wait for a scroll event that never comes.

### 2. Hero typewriter

Mark up the H1 as three word spans with a trailing cursor:

```html
<h1 id="hero-heading" class="hero-headline" aria-label="Don't apply alone.">
  <span class="hero-headline__word" data-word="0" aria-hidden="true">Don&rsquo;t</span>
  <span class="hero-headline__word" data-word="1" aria-hidden="true">apply</span>
  <br aria-hidden="true">
  <span class="hero-headline__word" data-word="2" aria-hidden="true">alone.</span>
  <span class="hero-headline__cursor" aria-hidden="true"></span>
</h1>
```

The `aria-label` carries the full phrase for screen readers; the visual word spans are aria-hidden so AT users get one clean reading.

CSS: each word starts at `opacity: 0; transform: translateY(8px)`. A `.is-visible` modifier transitions it to `opacity: 1; transform: none` over 350ms. Cursor is a 2px-wide block that blinks via a CSS keyframe (`opacity: 0/1`, 1.1s loop) and is hidden until word 3 lands.

JS on `DOMContentLoaded`:

- `t = 200ms`: word 0 visible
- `t = 1000ms`: word 1 visible (≈800ms cadence)
- `t = 1800ms`: word 2 visible
- `t = 2150ms`: cursor visible (it then blinks indefinitely via CSS)

A small lead-in delay (200ms) lets the page paint before the first word appears, avoiding a flash of mid-state on slow first paint.

`prefers-reduced-motion`: all words start visible, cursor visible, no animation.

### 3. Activity feed

Replace the current 6-entry list with a sequence of 8 atomic activities representing one full overnight orchestration. Each line is one small thing the system did, in plain language. The current "While you slept" + "6 actions overnight" footer becomes "Your team, working" + a live counter that ticks up as entries land.

**Sequence (timestamp · agent · message):**

1. `02:14 · Hunter · Searching new job listings` *(in-progress, spinner)*
2. `02:14 · Hunter · Found 5 strong-fit roles`
3. `02:31 · Strategist · Picked: Senior PM at Linear`
4. `02:33 · Strategist · Reading the job post`
5. `02:47 · Strategist · Drafting a tailored cover letter`
6. `03:02 · Applier · Filling in the application`
7. `03:05 · Applier · Uploading resume and cover letter`
8. `03:08 · Applier · Submitted — tracker updated`

Cadence: ~900ms between entries. Total runtime ≈7s.

**Spinner behaviour:** the most recently appended entry shows a Braille spinner (`⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏`) cycling at 80ms in a `<span class="feed-entry__spinner">` after the message. When the next entry appends, the previous entry's spinner is removed (so it reads as "completed"). The very last entry never shows a spinner — its action ("Submitted — tracker updated") is itself terminal.

**Footer counter:** starts at `0 actions` and increments with each entry, ending at `8 actions overnight`. Counts up via the same `animateCount` helper, with each tick fired in lockstep with each entry's arrival rather than a smooth ramp (it should feel like a tally, not a counter).

**Markup approach:** the `<ul class="feed-list">` is rendered empty in the HTML. The entries live as a JS data array in `landing-animations.js`. Each entry is rendered into a `<li>` template clone and appended. This keeps the markup file small and centralizes the cadence.

**Trigger:** plays once when the hero section enters view (effectively page load — hero is always visible on first paint).

**Plays once, no replay** — if the user revisits the section, the final state stays.

`prefers-reduced-motion`: all 8 entries render at once, footer reads `8 actions overnight`.

### 4. Counters

Numeric tiles get a `data-count-to` attribute and a `data-count-template` whose `{n}` placeholder is replaced with the current animated value. Examples:

```html
<!-- Problem stats -->
<div class="stat-tile__num" data-count-to="87" data-count-template="{n}%">87%</div>
<div class="stat-tile__num" data-count-to="10" data-count-template="&lt;{n}%">&lt;10%</div>
<div class="stat-tile__num" data-count-to="300" data-count-template="{n}:1">300:1</div>

<!-- Team card metrics -->
<div class="team-detail-card__metric-value" data-count-to="470">470</div>
<div class="team-detail-card__metric-value" data-count-to="120">120</div>
<div class="team-detail-card__metric-value" data-count-to="80">80</div>

<!-- Chart top stats -->
<span class="rate-chart__stat-value" data-count-to="840">840</span>
<span class="rate-chart__stat-value" data-count-to="45">45</span>
<span class="rate-chart__stat-value" data-count-to="5" data-count-template="{n}%">5%</span>

<!-- Offer tiles -->
<div class="offer-tile__num" data-count-to="2">2</div>
<div class="offer-tile__num">∞</div>  <!-- skip: not numeric -->
<div class="offer-tile__num" data-count-to="20" data-count-template="{n}%">20%</div>

<!-- Pricing: wrap the dollar amount in a span so suffix is untouched -->
<div class="price-card__numeral"><span data-count-to="50" data-count-template="${n}">$50</span></div>
```

`animateCount(el, to, { duration = 1200, template = '{n}' })`:

- `requestAnimationFrame` loop, eased with `easeOutCubic` (`1 - (1 - t)^3`).
- On each frame, sets `el.textContent = template.replace('{n}', Math.round(value))`.
- Final frame snaps to the exact target.

**Trigger:** by default, when the counter's nearest reveal-able ancestor (its `.landing-section`) enters view, fire all counters inside it. Two exceptions:

- Counters inside the chart section (`840`, `45`, `5%`) are driven by the chart module's timeline (300–1500ms offset from section reveal) so they finish in lockstep with the line draw.
- Counters inside team cards (`470`, `120`, `80`) fire when their card lands, not when the section enters view, so each card's metric counts up just after the card finishes its stagger-in.

Counters in the hero (none today, but future-proof) would trigger on page load.

**Retrigger:** never. Once animated, the observer unwires.

### 5. Team cards

The 3 team cards (`.team-grid > .team-detail-card`) animate in left-to-right when the section enters view. Each card uses `.reveal` plus a per-card `transition-delay`:

- card 1: 0ms
- card 2: 180ms
- card 3: 360ms

Slightly slower than the generic stagger (which is 80ms) because each card carries enough content to deserve its own beat. The metric numbers inside (`470`, `120`, `80`) are counters that fire when the card lands.

### 6. Chart line draw

The chart SVG (`<svg viewBox="0 0 720 240">`) becomes a 4-step animation when its section enters view:

1. **t=0**: axes, gridlines, axis labels are visible immediately (they're decorative scaffolding — drawing them feels gimmicky).
2. **t=0–1500ms**: the polyline draws. Implementation: compute `polyline.getTotalLength()` once on first observe, set `stroke-dasharray = length`, set `stroke-dashoffset = length`, then transition `stroke-dashoffset` to 0 over 1500ms with `ease-out`. The fill area underneath stays at 0 opacity during this phase.
3. **t=0–1500ms (parallel)**: the 12 data-point circles pop in (`transform: scale(0) → scale(1)` with a small overshoot). Each circle gets a CSS class with a calculated `animation-delay` proportional to its x position so they appear in time with the line drawing past them. We compute these delays in JS rather than hardcoding so the chart can be edited without resyncing.
4. **t=1500–1900ms**: fill area fades in (`fill-opacity 0 → 0.10` over 400ms). The "9" annotation at the rightmost point fades in at the end.
5. **t=300–1500ms (parallel)**: the three top stats (`840`, `45`, `5%`) count up via the standard counter helper, finishing in lockstep with the line.

`prefers-reduced-motion`: chart renders in its final state — line drawn, dots placed, fill visible, stats at final values.

### 7. Section reveal map

| Section | Effect |
|---|---|
| Hero (`.hero`) | Visible on load. Typewriter on H1. Activity feed runs on hero reveal. |
| Problem (`.landing-section` 01) | `.reveal` on section. `.stagger-reveal` on `.stat-grid` and `.problem__compare`. Counters fire when section enters view. |
| Team (`#how-it-works`) | `.reveal` on section. Team cards stagger 0/180/360ms. Card metric counters fire as cards land. Pipeline below cards reveals normally. |
| Rate chart | `.reveal` on section. Chart draws when section enters view. Top stats count up. |
| Pricing | `.reveal` on section. `.stagger-reveal` on `.pricing-grid`. Dollar counters fire when section enters view. |
| Trust / offer | `.reveal` on section. `.stagger-reveal` on `.offer-grid`. Counters fire when section enters view. |

## Accessibility

- `prefers-reduced-motion: reduce` short-circuits every effect to its final state.
- Hero H1 carries `aria-label="Don't apply alone."` so screen readers get the phrase intact regardless of word reveal state.
- Activity feed `<ul>` is rendered with `aria-live="polite"` so AT users hear new entries land. The Braille spinner is wrapped in `aria-hidden="true"` so it doesn't get announced as gibberish.
- All visual-only spinner / cursor / decorative arrows are `aria-hidden="true"`.
- No animation removes content from the DOM after it lands — every animated element ends in a stable, readable final state.

## Server change

`server.js`:

- Rename `STATIC_CSS` → `STATIC_ASSETS`. Each entry becomes `{ file: <relative path>, type: <content-type> }`.
- Add `/landing-animations.js` → `{ file: 'landing-animations.js', type: 'application/javascript; charset=utf-8' }`.
- Update the static-asset branch in `handler` to read the entry's `type`.
- Existing CSS routes keep working (file paths unchanged).

`server.test.js`: add a test that `GET /landing-animations.js` returns 200 with the right content-type. The other static asset tests don't change.

`landing.html`: add `<script defer src="/landing-animations.js"></script>` at the end of `<head>`. Replace the H1 markup with the typewriter spans. Empty the activity feed `<ul>`. Add `data-count-to` / `data-count-template` to numeric elements as listed above. Add `.reveal` / `.stagger-reveal` classes per the section reveal map.

## What we are NOT doing

- No animation library, no GSAP, no Framer Motion. Vanilla.
- No new build step.
- No layout changes — the page composition stays exactly as it is.
- No copy changes outside the activity-feed entries.
- No retrigger on scroll up. Each effect plays once.
- No replay button on the activity feed.
- No animation on the LIVE pulsing dot beyond what's already in CSS today.
- No section-reveal animation on the topbar or footer (they're chrome, not content).

## Out of scope / follow-ups

- The early-access page (`early-access.html`) is untouched in this pass. If we want consistent feel, that's a separate spec.
- Mobile-specific animation tuning — the existing mobile media-query work stays as-is. We rely on `prefers-reduced-motion` and short transition durations to keep the page light on weak hardware.
