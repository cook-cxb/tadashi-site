# Tadashi / Archive

Static personal archive. Public pages are plain HTML. Everything private (the Learning log, `{men's-cave}`,
private entries, any region you mark private) is encrypted into `dist/vault.json` and only decrypted in the
browser after the passphrase box on Archive.

## Deploy on Vercel (private repo)
Vercel builds the site for you, so only the built `dist/` is ever served; `content/` stays in your private repo.
1. Push this folder to a **private** GitHub repo.
2. Vercel -> Add New -> Project -> import the repo. Framework preset: **Other** (`vercel.json` already sets build command `node build.mjs` and output `dist`).
3. Before deploying: Settings -> Environment Variables -> add `PASSPHRASE` = your passphrase (Production + Preview). Mark it Sensitive.
4. Deploy. Every `git push` rebuilds, so adding an entry is: edit JSON, commit, push.
5. Domain: Project -> Settings -> Domains -> add `aizaz.rgtmianwali.com`. At the DNS for `rgtmianwali.com`, add the record Vercel shows (for a subdomain it is a CNAME for `aizaz`; use the exact value Vercel displays). HTTPS is automatic.
6. To change the passphrase: edit `PASSPHRASE` in Vercel and redeploy.

## Local preview
`PASSPHRASE="four random words here" node build.mjs && npx serve dist` (must be served over http, not opened as a file).

## Edit content
- `content/entries.json` — cards on Home (`vis`: public/private)
- `content/learning.json` — sessions `{d, s (start hour), m (minutes), t (topic), title}`. Sample data for now; `node gen-learning.mjs` regenerates the sample.
- `content/site.json` — nav items, regions (features/headings), entry overrides. Easiest to produce from `{men's-cave}` → Download site.json.
- To make any part of a page toggleable, wrap it in `<!--region:my-id-->…<!--/region-->` in `src/*.html` and add it to `site.json`.

## Honest limits
- The passphrase is in no file. Anyone can download `vault.json` and guess offline, so use 4+ random words (PBKDF2 with 600k rounds slows guessing; it can't save a weak phrase).
- Public means public to everyone.
- Toggles in `{men's-cave}` change nothing until you download `site.json` and rebuild; a static site can't rewrite itself.
- The unlock lasts for the browser tab only (sessionStorage keeps the derived key, never the passphrase). "Lock again" clears it.
- Not built yet: Work, Inspiration, Entry detail, Ask (needs an AI backend), New entry/upload (static sites can't accept uploads, so add entries to the JSON for now).
