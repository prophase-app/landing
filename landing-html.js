'use strict';

// Renders public-surface HTML templates (landing.html, early-access.html).
// Templates contain {{BRAND_NAME}}, {{BRAND_TAGLINE}}, {{POSTHOG_KEY}}, and
// {{POSTHOG_HOST}} tokens; this module substitutes them via a tokens map.
// Tests in landing-html.test.js pin the invariant that no literal {{...}}
// tokens survive in the rendered output.

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, 'landing.html');
const EARLY_ACCESS_TEMPLATE_PATH = path.join(__dirname, 'early-access.html');

function _validate(brand) {
  if (!brand || typeof brand.name !== 'string' || typeof brand.tagline !== 'string') {
    throw new Error('renderer: brand must have string {name, tagline}');
  }
}

function _substitute(template, tokens) {
  return Object.keys(tokens).reduce(
    (s, k) => s.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), tokens[k] == null ? '' : String(tokens[k])),
    template
  );
}

function _buildTokens(brand, posthog) {
  return {
    BRAND_NAME: brand.name,
    BRAND_TAGLINE: brand.tagline,
    POSTHOG_KEY: posthog.key || '',
    POSTHOG_HOST: posthog.host || 'https://us.i.posthog.com',
  };
}

function renderLandingHtml(brand, posthog = {}) {
  _validate(brand);
  return _substitute(fs.readFileSync(TEMPLATE_PATH, 'utf8'), _buildTokens(brand, posthog));
}

function renderEarlyAccessHtml(brand, posthog = {}) {
  _validate(brand);
  return _substitute(fs.readFileSync(EARLY_ACCESS_TEMPLATE_PATH, 'utf8'), _buildTokens(brand, posthog));
}

module.exports = {
  renderLandingHtml,
  renderEarlyAccessHtml,
  TEMPLATE_PATH,
  EARLY_ACCESS_TEMPLATE_PATH,
};
