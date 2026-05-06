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
| `SHEETS_WEBHOOK_URL` | _(unset)_ | Google Apps Script web-app URL. On each signup the server POSTs the JSON payload here, which appends a row to a Google Sheet. Skipped (logged only) if unset. See "Sign-ups tracking" below. |

## Tests

```sh
node --test
```

The suite verifies template substitution, route allowlist (anything not in the allowlist returns 404), and the signup pipeline end-to-end.

## Sign-ups tracking

Every successful POST to `/api/early-access` is fanned out to two destinations:

1. **Email** via Resend (`RESEND_TO`) — immediate notification.
2. **Google Sheet** via a bound Apps Script web app (`SHEETS_WEBHOOK_URL`) — durable, sortable, exportable record of every signup.

Both writes are fire-and-forget — failure of either logs an error but never blocks the user's success response.

To set up the sheet:

1. Create a Google Sheet, rename tab 1 to `Sign-ups`, and add this header row:
   ```
   received_at | name | email | current_role | currently_employed | target_role | linkedin | actively_applying | current | search_duration | goals | user_agent
   ```
2. Extensions → Apps Script. Replace `Code.gs` with:
   ```javascript
   const SHEET_NAME = 'Sign-ups';
   function doPost(e) {
     try {
       const d = JSON.parse(e.postData.contents);
       const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
       sheet.appendRow([
         d.received_at || new Date().toISOString(),
         d.name || '', d.email || '', d.current_role || '',
         d.currently_employed || '', d.target_role || '', d.linkedin || '',
         d.actively_applying || '', d.current || '', d.search_duration || '',
         d.goals || '', d.user_agent || ''
       ]);
       return ContentService.createTextOutput(JSON.stringify({ ok: true }))
         .setMimeType(ContentService.MimeType.JSON);
     } catch (err) {
       return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
         .setMimeType(ContentService.MimeType.JSON);
     }
   }
   ```
3. Deploy → New deployment → Type: **Web app**, Execute as: **Me**, Who has access: **Anyone**. Copy the `https://script.google.com/macros/s/.../exec` URL.
4. In Render → service → Environment, set `SHEETS_WEBHOOK_URL` to that URL. Treat it as a secret (anyone with the URL can append rows).

## Deploy

Configured for [Render](https://render.com) via `render.yaml`. Connect the repo to Render, set the secret env vars (`RESEND_API_KEY`, `RESEND_TO`, `SHEETS_WEBHOOK_URL`) in the service dashboard, and Render handles the rest. The free tier is sufficient — there is no persistent disk; the Google Sheet is the durable signup record.

DNS: at the registrar, point `prophase.app` (apex, via A-records to Render's load balancers) and `www.prophase.app` (CNAME) at the Render service.

## Related

The full Prophase codebase (dashboard, agent pipeline) lives in a separate repo under the same `prophase-app` organization (link to be added once that repo is published). This repo is the public surface only — by design, it does not contain dashboard code, so a deploy of this repo cannot accidentally expose it.
