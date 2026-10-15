/* {men's-cave}: decide what is public or private. Edits are made here, then exported as site.json and rebuilt. */
document.addEventListener('vault', (ev) => {
  const { $, escapeHtml: h } = Core;
  const data = ev.detail, app = $('#app');
  if (!data) { $('#locked').innerHTML = 'This page is private. Open <a href="index.html">Archive</a> and enter the passphrase.'; return; }

  const items = [].concat(data.cfg.nav, data.cfg.regions, data.cfg.entries).map((x) => ({ ...x, orig: x.vis }));
  const st = { tab: 'all' };
  const tabs = [['all', 'All'], ['page', 'Pages'], ['feature', 'Features'], ['heading', 'Headings'], ['entry', 'Entries']];
  const KIND = { page: 'Page', feature: 'Feature', heading: 'Heading', entry: 'Entry' };

  function render() {
    const shown = items.filter((x) => st.tab === 'all' || x.kind === st.tab);
    const pubs = items.filter((x) => x.vis === 'public'), prs = items.filter((x) => x.vis === 'private');
    const changed = items.filter((x) => x.vis !== x.orig).length;
    app.innerHTML = `<div class="eyebrow" style="margin-bottom:16px">Only appears after the passphrase</div><h1>{men's-<em>cave</em>}</h1>
      <p style="margin-top:24px">Choose what visitors see and what stays behind the passphrase. Private items are encrypted into <code>vault.json</code> when you rebuild.</p>
      <div class="cave"><div class="list"><div class="chips" style="margin-bottom:12px">${tabs.map(([k, l]) => `<button class="chip" data-tab="${k}" aria-pressed="${st.tab === k}">${l}</button>`).join('')}</div>
      ${shown.map((x) => { const i = items.indexOf(x); return `<div class="crow"><div><b>${h(x.label)}</b><span class="k">${KIND[x.kind]}</span>${x.locked ? '<span class="k">Always private</span>' : ''}</div>
        <div class="seg" role="group" aria-label="Visibility of ${h(x.label)}"><button data-i="${i}" data-v="public" aria-pressed="${x.vis === 'public'}"${x.locked ? ' disabled' : ''}>Public</button><button data-i="${i}" data-v="private" aria-pressed="${x.vis === 'private'}"${x.locked ? ' disabled' : ''}>Private</button></div></div>`; }).join('')}</div>
      <div class="side">
        <div class="panel"><h3>At a glance</h3><p><b>${pubs.length}</b> public · <b>${prs.length}</b> private</p></div>
        <div class="panel"><h3>A visitor sees</h3>${pubs.map((x) => `<span class="pill">${h(x.label)}</span>`).join('') || '—'}<h3 style="margin-top:14px">After the passphrase</h3>${prs.map((x) => `<span class="pill priv">${h(x.label)}</span>`).join('') || '—'}</div>
        <div class="panel"><h3>Apply your changes</h3><ol><li>Press “Download site.json”.</li><li>Replace <code>content/site.json</code> with it.</li><li>Run <code>PASSPHRASE="…" node build.mjs</code> and publish <code>dist/</code>.</li></ol>
          <p style="margin-top:12px">To change the passphrase, rebuild with a new <code>PASSPHRASE</code>.</p>
          <button class="btn solid" id="dl" style="width:100%;margin-top:8px">Download site.json${changed ? ` (${changed} changed)` : ''}</button></div>
      </div></div>`;
  }

  function exportJson() {
    const out = {
      footerNote: 'Sample entries shown — replace with your own',
      nav: data.cfg.nav.map((n) => { const it = items.find((x) => x.id === n.id && x.kind === 'page'); return { id: n.id, label: n.label, href: n.href, vis: it.vis, ...(n.locked ? { locked: true } : {}) }; }),
      regions: data.cfg.regions.map((r) => ({ id: r.id, label: r.label, kind: r.kind, vis: items.find((x) => x.id === r.id && x.kind === r.kind).vis })),
      entryVis: Object.fromEntries(items.filter((x) => x.kind === 'entry').map((x) => [x.id, x.vis]))
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    a.download = 'site.json'; a.click(); URL.revokeObjectURL(a.href);
  }

  app.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { st.tab = b.dataset.tab; render(); }
    else if (b.dataset.i) { items[+b.dataset.i].vis = b.dataset.v; render(); }
    else if (b.id === 'dl') exportJson();
  });
  Core.glitch(app);
  render();
});
