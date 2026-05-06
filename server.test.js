'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP_SIGNUPS = path.join(os.tmpdir(), 'prophase-test-signups-' + Date.now() + '.jsonl');
process.env.SIGNUPS_PATH = TMP_SIGNUPS;
process.env.RESEND_API_KEY = '';

const { handler } = require('./server');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function fetchPath(port, urlPath, init = {}) {
  const url = 'http://127.0.0.1:' + port + urlPath;
  return await fetch(url, init);
}

test('GET / returns 200 + landing HTML', async () => {
  const { server, port } = await startServer();
  try {
    const res = await fetchPath(port, '/');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
    const body = await res.text();
    assert.ok(body.includes('Prophase'), 'expected default brand name in body');
    assert.ok(!body.includes('{{BRAND_NAME}}'), 'expected template tokens to be substituted');
  } finally { server.close(); }
});

test('GET /early-access returns 200 + form HTML', async () => {
  const { server, port } = await startServer();
  try {
    const res = await fetchPath(port, '/early-access');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes('<form'), 'expected a form in early-access');
  } finally { server.close(); }
});

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

test('GET /robots.txt returns 200 + permissive content', async () => {
  const { server, port } = await startServer();
  try {
    const res = await fetchPath(port, '/robots.txt');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /User-agent: \*/);
    assert.match(body, /Allow: \//);
  } finally { server.close(); }
});

test('GET /favicon.ico returns 204', async () => {
  const { server, port } = await startServer();
  try {
    const res = await fetchPath(port, '/favicon.ico');
    assert.equal(res.status, 204);
  } finally { server.close(); }
});

test('dashboard, admin, and arbitrary paths return 404', async () => {
  const { server, port } = await startServer();
  try {
    for (const p of ['/dashboard', '/admin', '/api/runs', '/home', '/preferences', '/zzz']) {
      const res = await fetchPath(port, p);
      assert.equal(res.status, 404, p + ' should 404');
    }
  } finally { server.close(); }
});

test('POST /api/early-access with valid body returns 200 + appends to JSONL', async () => {
  if (fs.existsSync(TMP_SIGNUPS)) fs.unlinkSync(TMP_SIGNUPS);
  const { server, port } = await startServer();
  try {
    const res = await fetchPath(port, '/api/early-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ada Lovelace', email: 'ada@example.com', goals: 'machines' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(fs.existsSync(TMP_SIGNUPS), 'expected JSONL file to be created');
    const line = fs.readFileSync(TMP_SIGNUPS, 'utf8').trim();
    const row = JSON.parse(line);
    assert.equal(row.name, 'Ada Lovelace');
    assert.equal(row.email, 'ada@example.com');
    assert.equal(row.goals, 'machines');
    assert.ok(row.receivedAt, 'expected receivedAt timestamp');
  } finally { server.close(); }
});

test('POST /api/early-access without name returns 400', async () => {
  const { server, port } = await startServer();
  try {
    const res = await fetchPath(port, '/api/early-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'no-name@example.com' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.ok, false);
  } finally { server.close(); }
});

test('POST /api/early-access without email returns 400', async () => {
  const { server, port } = await startServer();
  try {
    const res = await fetchPath(port, '/api/early-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Email' }),
    });
    assert.equal(res.status, 400);
  } finally { server.close(); }
});

test('POST /api/early-access with invalid JSON returns 400', async () => {
  const { server, port } = await startServer();
  try {
    const res = await fetchPath(port, '/api/early-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json{{{',
    });
    assert.equal(res.status, 400);
  } finally { server.close(); }
});

test('cleanup tmp signups file', () => {
  if (fs.existsSync(TMP_SIGNUPS)) fs.unlinkSync(TMP_SIGNUPS);
});
