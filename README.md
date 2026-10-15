# Tadashi / Archive

Static personal archive. Public pages are plain HTML. Everything private (the Learning log, `{men's-cave}`,
private entries, any region you mark private) is encrypted into `dist/vault.json` and only decrypted in the
browser after the passphrase box on Archive.

## Use
1. `PASSPHRASE="four random words here" node build.mjs`   (Node 18+, no dependencies)
2. Preview: `npx serve dist` (it must be served over http, not opened as a file)
3. Publish the **contents of `dist/`** to GitHub Pages (e.g. a public repo named `cook-cxb.github.io`).

## Keep two repos
- **Source repo (PRIVATE)**: this whole folder. `content/` holds your private notes and learning log in plain text.
- **Publish repo (public)**: only `dist/`. Never push `content/` to a public repo.

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
