'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const { renderLandingHtml, renderEarlyAccessHtml } = require('./landing-html');

const PORT = parseInt(process.env.PORT || '3000', 10);
const BRAND = {
  name: process.env.BRAND_NAME || 'Prophase',
  tagline: process.env.BRAND_TAGLINE || 'Your career team.',
};
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'Prophase <noreply@prophase.app>';
const RESEND_TO = process.env.RESEND_TO || '';

const SIGNUPS_PATH = process.env.SIGNUPS_PATH || path.join(__dirname, 'data', 'signups.jsonl');

const ROBOTS_TXT = 'User-agent: *\nAllow: /\n';

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, body) => {
    if (err) return send(res, 404, 'Not Found');
    send(res, 200, body, contentType);
  });
}

function readJsonBody(req, callback) {
  let raw = '';
  let aborted = false;
  req.on('data', (chunk) => {
    raw += chunk.toString('utf8');
    if (raw.length > 16 * 1024) { aborted = true; req.destroy(); }
  });
  req.on('end', () => {
    if (aborted) return callback(new Error('payload too large'));
    try { callback(null, JSON.parse(raw)); }
    catch (_) { callback(new Error('invalid JSON')); }
  });
  req.on('error', (err) => callback(err));
}

function sendEmail({ subject, text }) {
  if (!RESEND_API_KEY || !RESEND_TO) {
    console.log('[email] would have sent: ' + subject);
    return;
  }
  const payload = JSON.stringify({ from: RESEND_FROM, to: RESEND_TO, subject, text });
  const req = https.request({
    method: 'POST',
    hostname: 'api.resend.com',
    path: '/emails',
    headers: {
      'Authorization': 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, (resp) => {
    if (resp.statusCode >= 400) console.error('[email] Resend error: HTTP ' + resp.statusCode);
    resp.resume();
  });
  req.on('error', (err) => console.error('[email] Resend transport error:', err.message));
  req.write(payload);
  req.end();
}

function buildEmailBody(safe) {
  const lines = [
    'New ' + BRAND.name + ' Early Access signup:',
    '',
    'Name:               ' + safe.name,
    'Email:              ' + safe.email,
    'Most recent role:   ' + (safe.current_role || '(not provided)'),
    'Currently employed: ' + (safe.currently_employed === 'yes' ? 'yes' : 'no'),
    'Target role:        ' + (safe.target_role || '(not provided)'),
    'LinkedIn:           ' + (safe.linkedin || '(not provided)'),
    'Actively applying:  ' + (safe.actively_applying || '(not provided)'),
  ];
  if (safe.actively_applying === 'yes') {
    lines.push('Searching for:      ' + (safe.search_duration || '(not provided)'));
    lines.push('');
    lines.push('Current job search:');
    lines.push(safe.current || '(not provided)');
  }
  lines.push('');
  lines.push('Hopes for ' + BRAND.name + ':');
  lines.push(safe.goals || '(not provided)');
  lines.push('');
  lines.push('---');
  lines.push('Received: ' + safe.receivedAt);
  lines.push('UA:       ' + safe.userAgent);
  return lines.join('\n');
}

function handleEarlyAccessSubmit(req, res) {
  readJsonBody(req, (err, data) => {
    if (err) return send(res, 400, JSON.stringify({ ok: false, error: err.message }), 'application/json');
    const safe = {
      name:               String(data.name               || '').trim().slice(0, 200),
      email:              String(data.email              || '').trim().slice(0, 200),
      current_role:       String(data.current_role       || '').trim().slice(0, 200),
      currently_employed: String(data.currently_employed || '').trim().slice(0, 8),
      target_role:        String(data.target_role        || '').trim().slice(0, 200),
      linkedin:           String(data.linkedin           || '').trim().slice(0, 300),
      actively_applying:  String(data.actively_applying  || '').trim().slice(0, 8),
      current:            String(data.current            || '').trim().slice(0, 1000),
      search_duration:    String(data.search_duration    || '').trim().slice(0, 100),
      goals:              String(data.goals              || '').trim().slice(0, 1000),
      receivedAt: new Date().toISOString(),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    };
    if (!safe.name || !safe.email) {
      return send(res, 400, JSON.stringify({ ok: false, error: 'name and email are required' }), 'application/json');
    }
    try {
      fs.mkdirSync(path.dirname(SIGNUPS_PATH), { recursive: true });
      fs.appendFileSync(SIGNUPS_PATH, JSON.stringify(safe) + '\n');
    } catch (e) {
      console.error('[early-access] failed to write signup log:', e.message);
      return send(res, 500, JSON.stringify({ ok: false, error: 'log write failed' }), 'application/json');
    }
    sendEmail({
      subject: '[' + BRAND.name + '] Early Access signup: ' + safe.name,
      text: buildEmailBody(safe),
    });
    console.log('[early-access] signup received:', safe.email, '(' + safe.name + ')');
    send(res, 200, JSON.stringify({ ok: true }), 'application/json');
  });
}

const STATIC_CSS = {
  '/landing.css':        'landing.css',
  '/landing-tokens.css': 'landing-tokens.css',
  '/early-access.css':   'early-access.css',
};

function handler(req, res) {
  let urlPath;
  try { urlPath = new URL(req.url, 'http://localhost').pathname; }
  catch (_) { return send(res, 400, 'Bad Request'); }

  if (req.method === 'GET' && urlPath === '/') {
    return send(res, 200, renderLandingHtml(BRAND), 'text/html; charset=utf-8');
  }
  if (req.method === 'GET' && urlPath === '/early-access') {
    return send(res, 200, renderEarlyAccessHtml(BRAND), 'text/html; charset=utf-8');
  }
  if (req.method === 'GET' && STATIC_CSS[urlPath]) {
    return serveStatic(res, path.join(__dirname, STATIC_CSS[urlPath]), 'text/css; charset=utf-8');
  }
  if (req.method === 'POST' && urlPath === '/api/early-access') {
    return handleEarlyAccessSubmit(req, res);
  }
  if (req.method === 'GET' && urlPath === '/robots.txt') {
    return send(res, 200, ROBOTS_TXT);
  }
  if (req.method === 'GET' && urlPath === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }
  send(res, 404, 'Not Found');
}

if (require.main === module) {
  http.createServer(handler).listen(PORT, () => {
    console.log('[server] prophase-landing listening on :' + PORT);
  });
}

module.exports = { handler, BRAND };
