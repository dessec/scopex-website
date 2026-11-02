# ScopeX package verification

Verified November 1, 2026 (Toronto), November 2 UTC.

| Check | Result |
| --- | --- |
| Standalone TypeScript check | Passed |
| Vite production build and HTML pre-render | Passed |
| Automated regression cases | 27 passed, 0 failed |
| Public homepage through live Supabase | HTTP 200; lumn.ca, 8/12 signals, score 67 |
| Standalone browser → live Supabase report | Displayed successfully |
| Local example report | 10/12 signals, score 83; explicitly illustrative |
| Browser warning/error console | Empty during standalone report verification |
| CORS preflight from scopex.co | HTTP 204, correct origin |
| Missing JWT | HTTP 401 |
| Unapproved origin | HTTP 403 |
| Private IP URL | HTTP 422; no page fetch |
| Request larger than 2KB | HTTP 413 |
| Anonymous table read/write | Denied by privileges |
| Anonymous limiter RPC | Denied by privileges |
| Service-role limiter RPC | Permitted |
| RLS on limiter table | Enabled |
| Limiter transaction test | Six of nine attempts accepted; test transaction rolled back |
| Security advisor | No scanner-schema notices; pre-existing Auth password warning documented |
| Hostinger DNS | Read and recorded; unchanged |
| Email | Public recipient configured; no email sent; delivery not tested |
| GitHub/domain launch | Pending user's ZIP upload and DNS cutover |

Automated tests cover HTML scoring, noindex, inert links, forms, URL restrictions, private DNS, redirects, bot challenges, body bounds, pinned-IP transport and bounded HTTP parsing.

Reproduce local tests with `npm ci`, `npm test`, and `npm run build`. Run live checks manually with `node scripts/verify-live.mjs`; these consume a scanner attempt. The live check is deliberately excluded from the normal unit-test glob.

The actual target website may change, so its score is an observed result at verification time, not a fixed expected performance score. GitHub's domain validation, HTTPS certificate and real email delivery require separate checks after launch.
