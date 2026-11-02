# ScopeX website — ready for GitHub Pages

This package contains your finished website, prebuilt static files, editable React source, and the Supabase scanner backend. Contact address: **bdesjardins@scopex.co**.

The backend is already deployed and configured in your existing ScopeX Supabase project. You do not need to create another project or run the SQL again. The website domain has not been moved.

## Upload without building

1. Extract the ZIP.
2. Create or open your chosen GitHub repository in your **dessec** account.
3. Upload the **contents** of this extracted folder, including the `docs` folder. Do not upload only the ZIP, and do not wrap everything in another folder.
4. In the repository, open **Settings → Pages**. Select **Deploy from a branch**, branch **main**, folder **/docs**, and save.
5. Use **DOMAIN-SETUP.md** to connect **scopex.co** after the Pages deployment succeeds.

The `docs` folder already has the compiled website. No Node installation or build command is required for this upload method. For an initial github.io preview before moving the domain, remove `docs/CNAME` from that initial upload, then restore it and set the custom domain when ready.

A public repository works with GitHub Free; private Pages repositories require a supported paid plan. [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

## What the files do

| Location | Purpose |
| --- | --- |
| `docs/` | Ready-to-host static website; publish this folder |
| `src/` | Editable page, design and browser behaviour |
| `public/config.js` | Public Supabase endpoint and anonymous client key |
| `public/CNAME` | Custom domain used by future builds |
| `lib/` | Assessment and safe homepage fetching |
| `supabase/` | Backend source and schema reference |
| `BACKEND-HANDOFF.md` | Completed configuration, maintenance and verification |
| `DOMAIN-SETUP.md` | Exact Hostinger DNS changes and mail records to preserve |
| `VERIFICATION.md` | Checks completed on this package |

## Editing later

Use Node 24 LTS or a compatible supported Node release (minimum 22.13), then:

```powershell
npm ci
npm test
npm run build
```

Upload the refreshed `docs` folder to publish changes. Edit `src/App.tsx` for wording and `src/styles.css` for design. The build includes static HTML for search engines, then React adds the interactive controls.

For local preview:

```powershell
npm run preview -- --port 5190
```

If your npm version drops forwarded flags, run `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5190`. Open http://127.0.0.1:5190. That exact local origin is permitted by the scanner.

For source development use `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5190`.

## Optional GitHub Actions deployment

The included workflow is manual so it does not compete with branch publishing. If you prefer builds on GitHub, change Pages source to **GitHub Actions**, then run **Actions → Build and deploy ScopeX → Run workflow**. It installs from the lockfile, tests, builds, and deploys `docs`. Set the custom domain in Pages settings; Actions does not use CNAME to configure it.

## Email enquiries

The project form prepares an email draft. The visitor reviews and sends it through their own email app to **bdesjardins@scopex.co**. No SMTP credentials are needed or included. This version does not automatically send emails or save enquiries into a CRM.

## Public configuration

The anonymous key in `config.js` is intentionally public and restricted by database privileges. It is not a service-role secret. No account password, SMTP password, personal access token, database password, or service-role key is included.

Change the config in both `public/config.js` and `docs/config.js` if editing an already-built package without rebuilding; otherwise edit `public/config.js` and rebuild.
