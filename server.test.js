'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const SHEETS_TEST_URL = 'https://example.invalid/sheets-webhook';
process.env.SHEETS_WEBHOOK_URL = SHEETS_TEST_URL;
process.env.RESEND_API_KEY = '';

const { handler } = require('./server');

const sheetCalls = [];
let sheetResponse = { status: 200, body: '{"ok":true}' };

const originalFetch = global.fetch;
global.fetch = async (url, init) => {
  const urlStr = typeof url === 'string' ? url : url.toString();
  if (urlStr === SHEETS_TEST_URL) {
    sheetCalls.push({ url: urlStr, body: init && init.body });
    return new Response(sheetResponse.body, { status: sheetResponse.status });
  }
  return originalFetch(url, init);
};

function resetSheetMock() {
  sheetCalls.length = 0;
  sheetResponse = { status: 200, body: '{"ok":true}' };
}

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

test('POST /api/early-access with valid body returns 200 + posts to sheets webhook', async () => {
  resetSheetMock();
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
    assert.equal(sheetCalls.length, 1, 'expected exactly one webhook POST');
    const sent = JSON.parse(sheetCalls[0].body);
    assert.equal(sent.name, 'Ada Lovelace');
    assert.equal(sent.email, 'ada@example.com');
    assert.equal(sent.goals, 'machines');
    assert.match(sent.received_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (CET|CEST)$/, 'received_at should be human-readable YYYY-MM-DD HH:MM CET/CEST');
  } finally { server.close(); }
});

test('POST /api/early-access still returns 200 when sheets webhook returns 5xx', async () => {
  resetSheetMock();
  sheetResponse = { status: 500, body: 'boom' };
  const { server, port } = await startServer();
  try {
    const res = await fetchPath(port, '/api/early-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Grace Hopper', email: 'grace@example.com' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(sheetCalls.length, 1, 'webhook was still attempted');
  } finally { server.close(); }
});

test('POST /api/early-access without name returns 400', async () => {
  resetSheetMock();
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
    assert.equal(sheetCalls.length, 0, 'webhook should not fire on validation failure');
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
