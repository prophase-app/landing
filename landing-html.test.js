'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { renderLandingHtml, renderEarlyAccessHtml, TEMPLATE_PATH, EARLY_ACCESS_TEMPLATE_PATH } = require('./landing-html');

test('renderLandingHtml substitutes BRAND_NAME globally', () => {
  const html = renderLandingHtml({ name: 'TestBrand', tagline: 'tag' });
  assert.ok(html.includes('TestBrand'));
  assert.ok(!html.includes('{{BRAND_NAME}}'));
});

test('renderLandingHtml substitutes BRAND_TAGLINE globally', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'unique-tagline-XYZ' });
  assert.ok(html.includes('unique-tagline-XYZ'));
  assert.ok(!html.includes('{{BRAND_TAGLINE}}'));
});

test('renderLandingHtml output contains hero copy with AI-by-your-side framing', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('Don&rsquo;t') && html.includes('apply') && html.includes('alone.'),
    'expected H1 hero words present');
  assert.ok(html.includes('hero-headline__word'), 'expected new typewriter span markup');
  // Old single-line markup must NOT match
  assert.ok(!html.match(/Don&rsquo;t apply<br>alone\./), 'old H1 markup must be gone');
  assert.ok(html.includes('Three AI specialists'), 'expected AI-specialists framing in subhead');
  assert.ok(html.includes('by your side'), 'expected by-your-side framing (replaces leverage)');
  assert.ok(html.includes('Your AI in an AI-driven job market'), 'expected AI-shield context line');
  assert.ok(html.includes('get sharper every week'), 'expected better-over-time framing');
});

test('renderLandingHtml hero brand line names ProPhase as a personal AI career team', () => {
  const html = renderLandingHtml({ name: 'ProPhase', tagline: 'Y' });
  assert.ok(
    html.includes('<strong>ProPhase</strong> is your personal AI career team.'),
    'expected AI-team brand line'
  );
});

test('renderLandingHtml hero microline is the trimmed two-weeks-free line', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('Two weeks free'), 'expected two-week trial framing');
  assert.ok(html.includes('no card required'), 'expected no-card-required reassurance (lowercase)');
  assert.ok(!html.includes('Join the founding cohort'), 'extra "founding cohort" tag must be gone');
});

test('renderLandingHtml output contains the three job-forward agents', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('Job Hunter'), 'expected Job Hunter (renamed from Researcher)');
  assert.ok(html.includes('Job Strategist'), 'expected Job Strategist');
  assert.ok(html.includes('Job Applier'), 'expected Job Applier (renamed from Operator)');
  // Legacy names must not survive the rename
  assert.ok(!html.includes('Researcher'), 'Researcher must not appear (renamed to Job Hunter)');
  assert.ok(!html.includes('Operator'), 'Operator must not appear (renamed to Job Applier)');
});

test('renderLandingHtml hero contains live agent activity feed shell', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('feed-card'), 'expected feed-card container');
  assert.ok(html.includes('LIVE'), 'expected LIVE indicator');
  assert.ok(html.includes('feed-list'), 'expected feed-list ul');
  assert.ok(html.includes('Your team, working'), 'expected working-tense title');
});


test('renderLandingHtml problem section uses AI-on-your-side framing, not "leverage"', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('stat-grid'), 'expected stat-grid container');
  assert.ok(html.includes('87%'), 'expected employer stat');
  assert.ok(html.includes('&lt;10%') || html.includes('<10%'), 'expected candidate optimization stat');
  assert.ok(html.includes('300:1'), 'expected 300:1 ratio');
  // New framing: AI on your side / unlevel fight, not "leverage"
  assert.ok(!html.includes('apply without leverage'), 'wonky "leverage" framing must be gone');
  assert.ok(!html.includes('Apply with leverage'), 'wonky "leverage" tagline must be gone');
  assert.ok(html.includes('Employers bring AI to every application'), 'expected AI-asymmetry pull-quote');
  assert.ok(html.includes('knife to a gunfight'), 'expected the gunfight metaphor punchline');
});

test('renderLandingHtml problem section uses a graphical Manually-vs-ProPhase compare', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('problem__compare'), 'expected before/after grid');
  assert.ok(html.includes('>Manually<'), 'expected "Manually" before column label');
  assert.ok(html.includes('With X'), 'expected after column with brand-template token');
  // Sharper manual pain points
  assert.ok(html.includes('Hours wasted every week'), 'expected sharper manual pain row');
  assert.ok(html.includes('Lost in the resume pile'), 'expected resume-pile pain row');
  assert.ok(html.includes('1 interview per ~300'), 'expected the 300:1 ratio echoed in compare');
  // Punchier with-ProPhase rows
  assert.ok(html.includes('Specialists working 24/7'), 'expected 24/7 specialists row');
  assert.ok(html.includes('Only roles that match your goals'), 'expected goal-fit row');
  assert.ok(html.includes('More interviews, less effort, every week'), 'expected outcome row');
  // Bridge line: short, punchy, better-over-time
  assert.ok(html.includes('Better matches. More interviews. Every week.'), 'expected the bridge line');
  assert.ok(!html.includes('not more applications. It&rsquo;s leverage'), 'old leverage bridge must be gone');
});

test('renderLandingHtml team cards use a numbered step diagram, not paragraphs, with AI-agent labels', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // AI agent labels (was just "AGENT")
  assert.ok(html.includes('AI AGENT 01'), 'expected AI AGENT 01 role label');
  assert.ok(html.includes('AI AGENT 02'), 'expected AI AGENT 02');
  assert.ok(html.includes('AI AGENT 03'), 'expected AI AGENT 03');
  // Step diagram structure
  assert.ok(html.includes('team-detail-card__steps'), 'expected steps container');
  assert.ok(html.includes('team-detail-card__step-num'), 'expected step numerals');
  assert.ok(html.includes('team-detail-card__step-text'), 'expected step text');
  // Step counts: 3 numbered steps per agent card = 9 total
  const stepCount = (html.match(/team-detail-card__step-num/g) || []).length;
  assert.ok(stepCount >= 9, `expected at least 9 step numerals (3 agents x 3 steps), got ${stepCount}`);
  // Specific punchy steps
  assert.ok(html.includes('Scans 200+ job boards'), 'expected Hunter step');
  assert.ok(html.includes('Tailors your story'), 'expected Strategist step');
  assert.ok(html.includes('Submits through the right ATS'), 'expected Applier step');
  // Function paragraphs must be gone
  assert.ok(!html.includes('team-detail-card__function'), 'wordy function paragraphs must be gone');
});

test('renderLandingHtml team headline frames the team as AI specialists', () => {
  // Now lives in the combined section 02 (Meet your team + How it works).
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('Three AI specialists. One job. Yours.'), 'expected AI specialists heading');
});

test('renderLandingHtml topbar has nav links and a primary Early Access CTA', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('topbar-nav'), 'expected topbar nav container');
  assert.ok(html.includes('href="#how-it-works"'), 'expected How it works link');
  assert.ok(html.includes('href="#pricing"'), 'expected Pricing link');
  assert.ok(html.includes('topbar-nav__cta'), 'expected Early Access CTA class in nav');
  // The anchor targets must exist in the document
  assert.ok(html.includes('id="how-it-works"'), 'expected #how-it-works section id');
  assert.ok(html.includes('id="pricing"'), 'expected #pricing section id');
});

test('renderEarlyAccessHtml renders the signup form with new identity + context structure', () => {
  const html = renderEarlyAccessHtml({ name: 'TestBrand', tagline: 'Y' });
  // Brand substitution
  assert.ok(html.includes('TestBrand'), 'expected brand name in early-access page');
  assert.ok(!html.includes('{{BRAND_NAME}}'), 'expected no surviving template tokens');
  // Identity fields
  assert.ok(html.match(/<form[^>]*id="early-access-form"/), 'expected the form element');
  assert.ok(html.match(/name="name"[^>]*required/), 'expected required name field');
  assert.ok(html.match(/name="email"[^>]*required/), 'expected required email field');
  // Role split into most-recent + currently-employed + target (NEW)
  assert.ok(html.includes('Most recent role title'), 'expected most-recent role label');
  assert.ok(html.includes('name="current_role"'), 'expected current_role input');
  assert.ok(html.includes('name="currently_employed"'), 'expected currently_employed checkbox');
  assert.ok(html.includes('Target role title'), 'expected target role label');
  assert.ok(html.includes('name="target_role"'), 'expected target_role input');
  assert.ok(html.includes('name="linkedin"'), 'expected LinkedIn field');
  // Status now binary yes/no (was 3-way)
  assert.ok(html.includes('Are you actively applying?'), 'expected new yes/no legend');
  assert.ok(html.match(/name="actively_applying"[^>]*value="yes"/), 'expected Yes radio');
  assert.ok(html.match(/name="actively_applying"[^>]*value="no"/), 'expected No radio');
  // Conditional fields (hidden by default; JS reveals on Yes)
  assert.ok(html.includes('id="conditional-current"'), 'expected conditional current-search field');
  assert.ok(html.includes('id="conditional-duration"'), 'expected conditional search-duration field');
  assert.ok(html.includes('How long have you been searching?'), 'expected duration question');
  assert.ok(html.includes('name="search_duration"'), 'expected search_duration input');
  assert.ok(html.match(/<div[^>]*signup-conditional[^>]*hidden/), 'conditional fields must default hidden');
  // Goals textarea always shown
  assert.ok(html.includes('name="goals"'), 'expected goals textarea');
  // Submission target
  assert.ok(html.includes('/api/early-access'), 'expected POST target');
  // Recap of the offer is on this page too
  assert.ok(html.includes('weeks of full access'), 'expected 2-week tile');
  assert.ok(html.includes('community membership'), 'expected community tile');
  assert.ok(html.includes('off your first year'), 'expected 20% tile');
  // Back link to home
  assert.ok(html.match(/href="\/"[^>]*class="topbar-back"/), 'expected back link');
});

test('renderEarlyAccessHtml throws on bad brand input (same contract as landing)', () => {
  assert.throws(() => renderEarlyAccessHtml(null));
  assert.throws(() => renderEarlyAccessHtml({ name: 'x' }));
  assert.throws(() => renderEarlyAccessHtml({ tagline: 'x' }));
});

test('early-access.html source uses template tokens (single-source-of-truth)', () => {
  const raw = fs.readFileSync(EARLY_ACCESS_TEMPLATE_PATH, 'utf8');
  assert.ok(raw.includes('{{BRAND_NAME}}'), 'early-access.html must use {{BRAND_NAME}} token');
  assert.ok(!raw.includes('Prophase'), 'early-access.html must not hardcode current brand "Prophase"');
  assert.ok(!raw.includes('ProPhase'), 'no legacy "ProPhase" capitalization allowed');
  assert.ok(!raw.includes('CareerOS'), 'no legacy brand name allowed');
});

test('renderLandingHtml how-it-works section is now combined with Meet Your Team', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // The single combined section uses the Meet-Your-Team heading
  assert.ok(html.includes('Three AI specialists. One job. Yours.'), 'expected merged team heading');
  // Subhead carries the in-concert framing
  assert.ok(html.includes('Three specialists working in concert'), 'expected concert framing');
  assert.ok(html.includes('Hunter scans'), 'expected agent-roll-call subhead');
  assert.ok(html.includes('Applier sends'), 'expected agent-roll-call subhead');
  // Pipeline intro line bridges the team cards into the pipeline visualization
  assert.ok(html.includes('how they hand off work'), 'expected pipeline intro line');
  // Both the team-grid (cards) AND the pipeline (visualization) live in the same section
  const sectionMatch = html.match(/<section[^>]*id="how-it-works"[\s\S]*?<\/section>/);
  assert.ok(sectionMatch, 'expected how-it-works section');
  assert.ok(sectionMatch[0].includes('team-grid'), 'team grid must live inside how-it-works');
  assert.ok(sectionMatch[0].includes('class="pipeline"'), 'pipeline must live inside how-it-works');
});

test('renderLandingHtml pipeline agent cards use a step-pill flow chart, not paragraphs', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('JOB HUNTER'), 'expected Job Hunter tag');
  assert.ok(html.includes('JOB STRATEGIST'), 'expected Job Strategist tag');
  assert.ok(html.includes('JOB APPLIER'), 'expected Job Applier tag');
  assert.ok(html.includes('pipeline__agent-flow'), 'expected step-pill flow container');
  assert.ok(html.includes('pipeline__step-pill'), 'expected step pills');
  // Hunter steps
  assert.ok(html.includes('Scan market'), 'expected Hunter step 1');
  assert.ok(html.includes('Filter for fit'), 'expected Hunter step 2');
  assert.ok(html.includes('Rank by match'), 'expected Hunter step 3');
  // Strategist steps
  assert.ok(html.includes('Tailor your story'), 'expected Strategist step');
  // Applier steps
  assert.ok(html.includes('Submit application'), 'expected Applier step');
  assert.ok(html.includes('Capture confirmation'), 'expected Applier step');
  // Loop card still present, framing updated
  assert.ok(html.includes('pipeline__step--loop'), 'expected closing loop');
  assert.ok(html.includes('More interviews every week'), 'expected better-over-time loop framing');
});

test('renderLandingHtml interview-rate section replaces cost-per-interview', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('Your interview rate'), 'expected interview rate section label');
  assert.ok(html.includes('More applications. More interviews.'), 'expected the KPI heading');
  assert.ok(html.includes('interview conversion rate'), 'expected the KPI in subhead');
  // Cost-per-interview language must not survive the reframe
  assert.ok(!html.includes('Cost per interview'), 'cost-per-interview must not appear');
  assert.ok(!html.match(/\$\d+\s*\/\s*interview/), 'no $/interview language');
});

test('renderLandingHtml interview-rate chart is an SVG line graph with realistic 12-week scale', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('rate-chart'), 'expected chart container');
  assert.ok(html.includes('rate-chart__stats'), 'expected KPI stats row');
  // Three KPIs: realistic scale at ~10 apps/day over 12 weeks
  assert.ok(html.includes('>840<'), 'expected 840 applications stat (10/day x 84 days)');
  assert.ok(html.includes('>45<'), 'expected 45 interviews stat');
  assert.ok(html.includes('>5%<'), 'expected 5% conversion rate');
  assert.ok(html.includes('climbing from 0%'), 'expected climbing-from-0% framing');
  // SVG line graph with variance + upward trend
  assert.ok(html.includes('rate-chart__viz'), 'expected SVG container');
  assert.ok(html.match(/<svg viewBox="0 0 720 240"/), 'expected SVG line chart viewBox');
  assert.ok(html.includes('<polyline'), 'expected line graph polyline');
  // 12 data points = 12 dots (circles) on the line
  const dotCount = (html.match(/<circle\s/g) || []).length;
  assert.ok(dotCount >= 12, `expected at least 12 weekly dots, got ${dotCount}`);
  // Week labels W1, W4, W7, W10, W12 (subset to keep readable)
  assert.ok(html.includes('>W1<'), 'expected W1 axis label');
  assert.ok(html.includes('>W12<'), 'expected W12 axis label');
});

test('renderLandingHtml pricing has discount headline + tier strikethroughs + CTA below', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // Discounted prices are the prominent numerals
  assert.ok(html.includes('$40'), 'expected discounted Standard at $40');
  assert.ok(html.includes('$160'), 'expected discounted Premium at $160');
  // Originals shown ABOVE the early-access price as full-line strikethroughs
  assert.ok(html.match(/<div class="price-card__strike">\$50 \/ month<\/div>/), 'expected $50 / month strikethrough above Standard price');
  assert.ok(html.match(/<div class="price-card__strike">\$200 \/ month<\/div>/), 'expected $200 / month strikethrough above Premium price');
  assert.ok(html.includes('Early Access pricing'), 'expected "Early Access pricing" note under the discounted price');
  assert.ok(html.includes('Save 20%'), 'expected "Save 20%" framing on the price-note');
  // New pricing heading with prominent discount pill
  assert.ok(html.includes('Early access pricing'), 'expected new heading');
  // The standalone "20% off" headline pill was removed; the strikethrough on
  // each tier carries the discount signal now.
  assert.ok(!html.includes('pricing-headline__discount'), 'redundant 20% off pill must be gone');
  // CTA below the pricing grid
  assert.ok(html.includes('pricing-cta'), 'expected CTA cluster below pricing');
  const ctaCount = (html.match(/href="\/early-access"/g) || []).length;
  assert.ok(ctaCount >= 3, `expected at least 3 CTAs to /early-access, got ${ctaCount}`);
});

test('renderLandingHtml pricing tiers carry the new outcome-focused taglines and features', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // Taglines (outcome-focused)
  assert.ok(html.includes('Organize your job search.'), 'expected Free tier tagline');
  assert.ok(html.includes('AI-assisted applications.'), 'expected Standard tier tagline');
  assert.ok(html.includes('Fully autonomous interview generation.'), 'expected Premium tier tagline');
  // Free features
  assert.ok(html.includes('Job tracking dashboard'), 'expected Free feature');
  assert.ok(html.includes('Resume analysis'), 'expected Free feature');
  assert.ok(html.includes('AI credits'), 'expected Free feature');
  assert.ok(html.includes('Community access'), 'expected Free feature');
  // Standard features
  assert.ok(html.includes('Automated job search'), 'expected Standard feature');
  assert.ok(html.includes('Personalized resumes, cover letters'), 'expected Standard feature');
  assert.ok(html.includes('Autonomous job application'), 'expected Standard feature');
  // Premium features
  assert.ok(html.includes('Scheduled overnight runs'), 'expected Premium feature');
  assert.ok(html.includes('Strategy optimization loop'), 'expected Premium feature');
  assert.ok(html.includes('Direct line to the founders'), 'expected Premium feature');
  // Old taglines must be gone
  assert.ok(!html.includes('Start the conversation'), 'old Free tagline must be gone');
  assert.ok(!html.includes('Run your search on autopilot'), 'old Premium tagline must be gone');
});

test('renderLandingHtml output contains all five section labels in order', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('01 The market shifted'));
  assert.ok(html.includes('02 Meet your team'));
  assert.ok(html.includes('03 Your interview rate'));
  assert.ok(html.includes('04 Pricing'));
  assert.ok(html.includes('05 The early-access offer'));
  // Old "How it works" + "Meet your team" split must be gone
  assert.ok(!html.includes('02 How it works'), 'old separate How it works section must be gone');
  assert.ok(!html.includes('03 Meet your team'), 'old separate Meet your team section must be gone');
});

test('renderLandingHtml CTAs route to /early-access (the signup form), not the welcome gate', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('href="/early-access"'), 'primary CTA must route to /early-access');
  assert.ok(!html.includes('href="/sign-in"'), 'CTAs no longer go to the welcome gate');
  assert.ok(!html.includes('href="/"'), 'must not loop the user back to landing');
});

test('renderLandingHtml hero has only one CTA (Analyze My Resume hidden until ready)', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  // Secondary CTA button is hidden for now; should not appear.
  assert.ok(!html.includes('Analyze My Resume'), 'secondary CTA must be hidden');
  assert.ok(!html.includes('btn-secondary'), 'secondary CTA class must not appear');
});

test('renderLandingHtml does not link to /analyzer', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(!html.includes('href="/analyzer"'), 'no analyzer route exists');
});

test('renderLandingHtml does NOT contain em dashes in rendered output', () => {
  // User directive: no em dashes anywhere. En dashes (\u2013) are allowed
  // for typographically appropriate ranges like "1-3%".
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(!html.includes('\u2014'), 'em dash (\u2014) must not appear in landing copy');
  assert.ok(!html.includes('&mdash;'), '&mdash; entity must not appear');
});

test('renderLandingHtml founding-cohort section is a 3-tile graphic, not prose', () => {
  const html = renderLandingHtml({ name: 'X', tagline: 'Y' });
  assert.ok(html.includes('Try X free for two weeks'), 'expected the early-access offer heading with brand');
  assert.ok(html.includes('offer-grid'), 'expected the 3-tile graphic container');
  assert.ok(html.includes('weeks of full access'), 'expected tile 1 label (2 weeks)');
  assert.ok(html.includes('community membership'), 'expected tile 2 label');
  assert.ok(html.includes('off your first year'), 'expected tile 3 label (20% off)');
  assert.ok(html.includes('honest feedback'), 'expected the feedback ask in subhead');
  assert.ok(html.includes('Job Hunters'), 'expected the community framing');
});

test('renderLandingHtml throws on bad brand input', () => {
  assert.throws(() => renderLandingHtml(null));
  assert.throws(() => renderLandingHtml({ name: 'x' }));
  assert.throws(() => renderLandingHtml({ tagline: 'x' }));
  assert.throws(() => renderLandingHtml({ name: 1, tagline: 'x' }));
});

test('landing.html source contains template tokens (single-source-of-truth)', () => {
  const raw = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  assert.ok(raw.includes('{{BRAND_NAME}}'), 'landing.html must use {{BRAND_NAME}} token');
  assert.ok(raw.includes('{{BRAND_TAGLINE}}'), 'landing.html must use {{BRAND_TAGLINE}} token');
  assert.ok(!raw.includes('Prophase'), 'landing.html must not hardcode current brand "Prophase"');
  assert.ok(!raw.includes('ProPhase'), 'landing.html must not hardcode legacy "ProPhase" capitalization');
  assert.ok(!raw.includes('CareerOS'), 'landing.html must not hardcode legacy "CareerOS"');
});

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
