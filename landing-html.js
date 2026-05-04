'use strict';

// Renders public-surface HTML templates (landing.html, early-access.html)
// with brand substitution. Single-source-of-truth for brand naming on the
// public surfaces: the BRAND object (passed in) is the only place the
// wordmark string lives.
//
// Template files contain {{BRAND_NAME}} and {{BRAND_TAGLINE}} tokens; this
// module substitutes them. Tests in landing-html.test.js pin the invariant
// that no literal {{...}} tokens survive in the rendered output.

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, 'landing.html');
const EARLY_ACCESS_TEMPLATE_PATH = path.join(__dirname, 'early-access.html');

function _validate(brand) {
  if (!brand || typeof brand.name !== 'string' || typeof brand.tagline !== 'string') {
    throw new Error('renderer: brand must have string {name, tagline}');
  }
}

function _substitute(template, brand) {
  return template
    .replace(/\{\{BRAND_NAME\}\}/g, brand.name)
    .replace(/\{\{BRAND_TAGLINE\}\}/g, brand.tagline);
}

function renderLandingHtml(brand) {
  _validate(brand);
  return _substitute(fs.readFileSync(TEMPLATE_PATH, 'utf8'), brand);
}

function renderEarlyAccessHtml(brand) {
  _validate(brand);
  return _substitute(fs.readFileSync(EARLY_ACCESS_TEMPLATE_PATH, 'utf8'), brand);
}

module.exports = {
  renderLandingHtml,
  renderEarlyAccessHtml,
  TEMPLATE_PATH,
  EARLY_ACCESS_TEMPLATE_PATH,
};
