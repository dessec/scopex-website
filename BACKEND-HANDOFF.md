# ScopeX backend handoff

Prepared November 1, 2026 (America/Toronto).

## Status

The existing **ScopeX** Supabase project was restored and the homepage scanner was deployed successfully. The static frontend is configured to use it. The user chose to upload the GitHub ZIP themselves. No GitHub repository was created, and Hostinger DNS was not changed.

| Component | Configuration |
| --- | --- |
| Frontend | Static React/Vite build, pre-rendered HTML, `docs/` |
| Intended domain | scopex.co; www.scopex.co redirects through GitHub Pages |
| GitHub account | dessec |
| Supabase project | ScopeX |
| Project reference | soynpcyoskmeshpolhzi |
| Region | us-east-1 |
| Project dashboard | https://supabase.com/dashboard/project/soynpcyoskmeshpolhzi |
| API URL | https://soynpcyoskmeshpolhzi.supabase.co |
| Edge Function | scopex-assess |
| Endpoint | https://soynpcyoskmeshpolhzi.supabase.co/functions/v1/scopex-assess |
| JWT verification | Enabled |
| Public contact | bdesjardins@scopex.co |

## Request flow

Browser → Supabase Edge Function → public homepage → HTML signal analysis → browser report.

The sample report is generated locally in the browser. A live check posts JSON `{"url":"https://business.example"}` with a public anonymous JWT in both the apikey and Authorization headers. The URL is normalized to the homepage. The scanner does not execute the target site's JavaScript.

The report covers 12 observable HTML signals across page basics, search foundations, enquiry path, and trust signals. Scores measure detected signals, **not actual conversion rates, revenue, accessibility compliance or a full performance audit**. Bot-protected or unsupported pages get an explanation instead of a fabricated result.

## Public credentials and runtime secrets

`public/config.js` and the compiled `docs/config.js` contain the project URL and **legacy anonymous key**. This public key is used for compatibility with the function gateway's enabled JWT check. A new `sb_publishable_...` key is not a JWT and cannot simply replace it in this configuration. [Supabase function authentication](https://supabase.com/docs/guides/functions/auth)

The public key is not a login or protection against deliberate API abuse. CORS constrains browser access; the shared database rate limit remains the cost guard for scripted callers.

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` inside the function runtime. The function uses the latter only for its own rate-limit RPC. It is never forwarded to scanned websites, sent to the browser, or included in this package. No custom SMTP or third-party service secret is needed. [Supabase function secrets](https://supabase.com/docs/guides/functions/secrets)

## Database changes

Only these new scanner-specific objects were added:

- `public.scopex_scan_limits`: bucket, window_start, used.
- `public.scopex_take_scan_slot(text, integer)`: atomic counter function, SECURITY INVOKER, fixed empty search path.
- Index on window_start and an explicit service_role-only RLS policy.

RLS is enabled. PUBLIC, anon and authenticated have no table access and no RPC execution privileges. Only service_role can use the limiter. Existing profiles, settings, vault, prompt-history and crawl tables were left intact.

Applied migrations:
1. `add_scopex_homepage_scan_limits`
2. `document_scanner_service_role_policy`

`supabase/setup.sql` is the combined, reviewable schema reference for a **fresh** project. It has already been applied to this project; do not run it again blindly.

No enquiry, email address, raw IP, website URL, fetched HTML, or report is written to the scanner table. It stores daily HMAC IP pseudonyms and a global counter. Entries older than two minutes are removed on subsequent scan requests; without another request, expired rows can remain until the next request. Supabase operational logs have their own provider retention.

## Limits and network handling

- Maximum request body: 2,048 bytes; bounded body read.
- Maximum HTML: 1,500,000 bytes.
- Homepage request time budget: 18 seconds.
- Maximum four redirects; each destination revalidated.
- Fixed-window limit: six attempts per IP-derived bucket per minute, 120 attempts globally per minute.
- Database failure fails closed with HTTP 503.
- A rejected limit returns HTTP 429 and Retry-After: 60.
- The client address uses the last x-forwarded-for entry supplied to the Edge Function. Treat per-client attribution as best effort; the global limit does not depend on that header.
- Only public HTTP(S) domain names; no IP literals, credentials, custom ports or private destinations.
- DNS answers are checked. Outbound connections are pinned to a verified public address; TLS validates the original domain. DNS rebinding cannot replace the already-selected connection address.
- Raw HTTP framing and body sizes are bounded. Compressed responses that ignore the identity request are rejected for manual review.
- No scanned-page HTML is rendered in the application.

Permitted browser origins:
`https://scopex.co`, `https://www.scopex.co`, `https://dessec.github.io`, `http://127.0.0.1:5190`.

The local origin supports the included preview instructions. Remove it from the function's allowlist if local live-scanner testing is no longer needed. Add any future staging origins explicitly and redeploy.

## Deploying updates

Frontend-only changes: edit source, run tests and build, upload the refreshed docs folder.

Backend changes: edit the Edge Function and `lib` modules, review, deploy, then run `node scripts/verify-live.mjs`. Supabase CLI users should consult the installed CLI's `--help` before using its commands. Typical workflow from this package root:

```powershell
supabase --version
supabase functions deploy --help
supabase login
supabase link --project-ref soynpcyoskmeshpolhzi
supabase functions deploy scopex-assess --project-ref soynpcyoskmeshpolhzi
```

Keep verify_jwt enabled in `supabase/config.toml`. Deployment includes relative dependencies from `lib/`. The function was deployed through the connected Supabase plugin; the CLI workflow itself was not run on this machine. [Supabase deployment guide](https://supabase.com/docs/guides/functions/deploy)

## Verification completed

See VERIFICATION.md for reproducible evidence. A real request to lumn.ca returned HTTP 200 and 8/12 detected signals. The browser-loaded standalone package showed the same report and no console errors. Database tests confirmed only six of nine attempts in a transaction were accepted, then rolled back.

A security-advisor check found no remaining scanner-table notices. The existing project has **Leaked Password Protection Disabled** for Supabase Auth. This website has no Supabase user-login feature, and account authentication settings were not changed. Review that existing setting before adding user accounts: [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## What is intentionally separate

The project-enquiry form prepares a mailto draft; the visitor sends it with their email client. There is no automatic outbound mail, lead table, CRM, login, file storage, or admin portal in this release. Hostinger mailbox access is not needed for this flow. A future automatic form should add server validation, spam controls, explicit data retention and a server-held mail-provider credential.

GitHub upload, Pages activation, domain cutover and certificate issuance remain for the user's upload workflow. DOMAIN-SETUP.md contains the inspected DNS state and exact changes.

## Operations and rollback

Monitor Edge Function errors, invocation counts and project availability in the Supabase dashboard. A paused project or exceeded platform quota can make the live scanner unavailable; the site and local sample still work, and manual enquiries remain available.

If a function update fails, redeploy the previous reviewed function sources. Disable the scanner gracefully by blanking assessmentApiUrl in public/config.js and rebuilding; the UI then explains that a manual review is available. Do not delete existing project data to roll back this feature. Retain the previous frontend build until the new build is verified.
