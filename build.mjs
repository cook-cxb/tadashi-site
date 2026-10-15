// Build the site. Usage:  PASSPHRASE="your long passphrase" node build.mjs
// - Reads content/site.json, content/entries.json, content/learning.json (all PRIVATE source: keep this repo private)
// - Writes dist/  (publish ONLY dist/ — it holds public pages + one encrypted vault.json)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const pass = process.env.PASSPHRASE;
if (!pass) { console.error('Set PASSPHRASE, e.g.  PASSPHRASE="four random words here" node build.mjs'); process.exit(1); }
if (pass.trim().split(/\s+/).length < 4 && pass.length < 20) console.warn('Warning: short passphrase. Anyone can try guesses offline against vault.json, so use 4+ random words.');

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const site = read('content/site.json');
const entries = read('content/entries.json');
const learning = read('content/learning.json');
const ITER = 600000;

const vis = (x) => (x.vis === 'private' ? 'private' : 'public');
const b64 = (u8) => Buffer.from(u8).toString('base64');

// ---- effective visibility (site.json entryVis overrides entries.json) ----
const effEntries = entries.map((e) => ({ ...e, vis: site.entryVis?.[e.id] ?? e.vis ?? 'public' }));
const pubEntries = effEntries.filter((e) => e.vis === 'public').map(({ vis, ...e }) => e);
const privEntries = effEntries.filter((e) => e.vis === 'private').map(({ vis, ...e }) => e);

// ---- nav ----
const navAll = site.nav.map((n, i) => ({ ...n, pos: i }));
const navPublic = navAll.filter((n) => vis(n) === 'public');
const navPrivate = navAll.filter((n) => vis(n) === 'private').map(({ id, label, href, pos }) => ({ id, label, href, pos }));
const svg = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="1" y="1" width="26" height="26" stroke="currentColor" stroke-width="2"/><path d="M1 10h26M1 19h26M10 1v26M19 1v26" stroke="currentColor" stroke-width="1" opacity=".35"/><rect x="10" y="10" width="9" height="9" fill="var(--accent)"/></svg>';
const header = (page) => `<header class="wrap top"><a class="brand" href="index.html">${svg}<span>Tadashi / Archive</span></a><nav class="main">${
  navPublic.map((n) => {
    const here = n.href === page ? ' aria-current="page"' : '';
    if (n.id === 'archive' && page === 'index.html') return `<button type="button" class="navlink" data-nav="archive" data-pos="${n.pos}" data-archive${here}>${n.label}</button>`;
    return `<a href="${n.href}" data-nav="${n.id}" data-pos="${n.pos}"${here}>${n.label}</a>`;
  }).join('')
}<button type="button" class="btn" data-theme-toggle>Dark</button></nav></header>`;
const footer = `<footer class="wrap foot"><div><span>Tadashi · Personal archive</span><span>${site.footerNote ?? ''}</span></div></footer>`;

// ---- regions: <!--region:id-->…<!--/region--> ; private ones leave only an empty slot ----
const regionVis = Object.fromEntries(site.regions.map((r) => [r.id, vis(r)]));
const vaultRegions = {};
function applyRegions(html, page) {
  return html.replace(/<!--region:([\w-]+)-->([\s\S]*?)<!--\/region-->/g, (m, id, inner) => {
    if (!(id in regionVis)) { console.warn(`region "${id}" in ${page} is not listed in site.json; treated as public`); return inner; }
    if (regionVis[id] === 'public') return inner;
    vaultRegions[id] = inner.trim();
    return `<div data-slot="${id}" hidden></div>`;
  });
}

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
for (const f of readdirSync('src')) {
  if (f.endsWith('.html')) {
    let html = readFileSync(`src/${f}`, 'utf8');
    html = applyRegions(html, f).replace('<!--HEADER-->', header(f)).replace('<!--FOOTER-->', footer);
    writeFileSync(`dist/${f}`, html);
  } else cpSync(`src/${f}`, `dist/${f}`);
}
writeFileSync('dist/entries.json', JSON.stringify(pubEntries));

// ---- the vault: everything private, one AES-256-GCM blob, key = PBKDF2-SHA256(passphrase) ----
const cfg = {
  nav: site.nav.map((n) => ({ id: n.id, label: n.label, kind: 'page', href: n.href, vis: vis(n), locked: !!n.locked })),
  regions: site.regions.map((r) => ({ id: r.id, label: r.label, kind: r.kind, vis: vis(r) })),
  entries: effEntries.map((e) => ({ id: e.id, label: e.title, kind: 'entry', vis: e.vis }))
};
const payload = { nav: navPrivate, regions: vaultRegions, entries: privEntries, learning, cfg };

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.normalize('NFKC').trim()), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
writeFileSync('dist/vault.json', JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }));

console.log(`Built dist/: ${pubEntries.length} public entries, ${privEntries.length} private (encrypted), ${navPrivate.length} private nav items, ${Object.keys(vaultRegions).length} private regions.`);
