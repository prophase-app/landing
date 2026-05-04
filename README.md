# Prophase landing

Public-facing landing page for [Prophase](https://prophase.app). Marketing copy + early-access signup form. Designed to be deployable as a tiny standalone Node service with zero runtime dependencies.

## Run locally

```sh
node server.js
# open http://localhost:3000
```

Override the port with `PORT=4000 node server.js`.

## Routes

| Method | Path | What |
|---|---|---|
| GET | `/` | Landing page |
| GET | `/early-access` | Signup form |
| GET | `/landing.css`, `/landing-tokens.css`, `/early-access.css` | Page styles |
| POST | `/api/early-access` | Signup submission (JSON body) |
| GET | `/robots.txt` | Permissive |
| GET | `/favicon.ico` | 204 placeholder |
| any | anything else | 404 |

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `BRAND_NAME` | `Prophase` | Wordmark substituted into HTML |
| `BRAND_TAGLINE` | `Your career team.` | Tagline substituted into HTML |
| `RESEND_API_KEY` | _(unset)_ | Resend API key. Email is skipped (logged only) if unset. |
| `RESEND_FROM` | `Prophase <noreply@prophase.app>` | Email sender |
| `RESEND_TO` | _(unset)_ | Email recipient (where signup notifications go) |
| `SIGNUPS_PATH` | `./data/signups.jsonl` | Where to append signup rows |

## Tests

```sh
node --test
```

The suite verifies template substitution, route allowlist (anything not in the allowlist returns 404), and the signup pipeline end-to-end.

## Deploy

Configured for [Render](https://render.com) via `render.yaml`. Connect the repo to Render, paste `RESEND_API_KEY` and `RESEND_TO` as secret env vars, and Render handles the rest. The persistent disk at `/opt/render/project/src/data` keeps signups across deploys.

DNS: at the registrar, point `prophase.app` (apex, via A-records to Render's load balancers) and `www.prophase.app` (CNAME) at the Render service.

## Related

The full Prophase codebase (dashboard, agent pipeline) lives in a separate repo under the same `prophase-app` organization (link to be added once that repo is published). This repo is the public surface only — by design, it does not contain dashboard code, so a deploy of this repo cannot accidentally expose it.
