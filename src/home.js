/* Home: public entries, passphrase box, glitch cascade, private reveal. */
(function () {
  const { $, $$, Vault, insertNav, removeNav, escapeHtml: h, glitch, reduced } = Core;
  const KINDS = {
    note: { label: 'Note', color: 'var(--c-note)' },
    drawing: { label: 'Drawing', color: 'var(--c-draw)' },
    concept: { label: 'Concept', color: 'var(--c-concept)' },
    source: { label: 'Source', color: 'var(--c-source)' }
  };
  const state = { pub: [], priv: [], showPriv: false, filter: 'all', q: '', topic: '' };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const thumb = (e) => {
    if (e.kind === 'note') return `<div class="paper">${h(e.excerpt || '')}</div>`;
    if (e.kind === 'drawing') return `<svg viewBox="0 0 300 150" width="100%" height="150" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Sketch preview"><path d="M40 112 C70 40, 110 40, 140 90 S210 130, 262 36" stroke="var(--ink)" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="52" y="30" width="64" height="40" fill="none" stroke="var(--ink)" stroke-width="1.6" transform="rotate(-4 84 50)"/><circle cx="214" cy="104" r="22" fill="none" stroke="var(--c-draw)" stroke-width="2"/><path d="M196 104h36M214 86v36" stroke="var(--c-draw)" stroke-width="1.2"/></svg>`;
    if (e.kind === 'concept') return `<svg viewBox="0 0 300 150" width="100%" height="150" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Concept map preview"><path d="M150 75L70 38M150 75L232 38M150 75L90 118M150 75L226 116" stroke="var(--ink)" stroke-width="1.4"/><circle cx="150" cy="75" r="17" fill="var(--c-concept)"/><circle cx="70" cy="38" r="10" fill="var(--card)" stroke="var(--ink)" stroke-width="1.6"/><circle cx="232" cy="38" r="10" fill="var(--card)" stroke="var(--ink)" stroke-width="1.6"/><circle cx="90" cy="118" r="10" fill="var(--card)" stroke="var(--ink)" stroke-width="1.6"/><circle cx="226" cy="116" r="10" fill="var(--card)" stroke="var(--ink)" stroke-width="1.6"/></svg>`;
    return `<div class="paper" style="display:flex;flex-direction:column;justify-content:center;gap:8px"><div class="mono" style="font-size:12px;color:var(--muted)">${h(e.domain || '')}</div><div style="height:8px;background:var(--line);width:90%"></div><div style="height:8px;background:var(--line);width:70%"></div><div class="mono" style="font-size:12px;color:var(--c-source)">Saved link ↗</div></div>`;
  };

  const all = () => (state.showPriv ? state.priv.concat(state.pub) : state.pub);
  const topicOf = (e) => (e.tags || '').split('·')[0].trim();

  function renderChips() {
    const list = all();
    const defs = [['all', 'All'], ['note', 'Notes'], ['drawing', 'Drawings'], ['concept', 'Concepts'], ['source', 'Sources']];
    $('#chips').innerHTML = defs.map(([k, label]) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${state.filter === k}">${label} <span>${k === 'all' ? list.length : list.filter((e) => e.kind === k).length}</span></button>`).join('');
  }
  function renderTopics() {
    const box = $('#topics-list');
    if (!box) return;
    const counts = {};
    all().forEach((e) => { const t = topicOf(e); if (t) counts[t] = (counts[t] || 0) + 1; });
    box.innerHTML = Object.keys(counts).map((t) => `<a data-t="${h(t)}"${state.topic === t ? ' style="font-weight:700"' : ''}><span>${h(t)}</span><span>${counts[t]}</span></a>`).join('');
  }
  function renderCards(reveal) {
    const q = state.q.trim().toLowerCase();
    const shown = all().filter((e) => (state.filter === 'all' || e.kind === state.filter) && (!state.topic || topicOf(e) === state.topic) && (!q || (e.title + ' ' + (e.tags || '')).toLowerCase().includes(q)));
    $('#cards').innerHTML = shown.length ? shown.map((e) => `<a class="card${e.priv ? ' priv' : ''}${e.priv && reveal ? ' rv' : ''}" href="${h(e.href || '#')}"><div class="thumb">${thumb(e)}${e.priv ? '<div class="ptag"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="1.5" y="5.5" width="9" height="6" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 5.5V3.5a2.5 2.5 0 015 0v2" stroke="currentColor" stroke-width="1.4"/></svg>Private</div>' : ''}</div><div class="cbody"><div class="cmeta"><span style="color:${KINDS[e.kind].color};font-weight:500">${KINDS[e.kind].label}</span><span class="date">${h(e.date || '')}</span></div><div class="ctitle">${h(e.title)}</div><div class="ctags">${h(e.tags || '')}</div></div></a>`).join('') : '<div class="empty">Nothing matches that yet.</div>';
  }
  const renderAll = (reveal) => { renderChips(); renderTopics(); renderCards(reveal); };

  /* ---- private reveal ---- */
  function fillSlots(data) {
    $$('[data-slot]').forEach((s) => { if (data.regions[s.dataset.slot]) s.outerHTML = data.regions[s.dataset.slot]; });
    bindSearch();
  }
  function showPrivate(data, animate) {
    state.priv = data.entries.map((e) => Object.assign({}, e, { priv: true }));
    state.showPriv = true;
    insertNav(data.nav, animate);
    fillSlots(data);
    $('#banner').hidden = false;
    renderAll(animate);
  }
  function hidePrivate() {
    state.showPriv = false; state.priv = []; state.filter = 'all'; state.topic = '';
    removeNav();
    $('#banner').hidden = true;
    location.reload(); // private regions were swapped in place; a reload restores the public page exactly
  }

  async function cascade(data) {
    const veil = $('#veil'), mac = $('#mac');
    if (reduced()) { veil.hidden = true; showPrivate(data, false); return; }
    glitch(mac);                                                   // 1 text box glitches
    await wait(750); veil.hidden = true;                           // ...and disappears
    insertNav(data.nav, true); glitch($('header.top'));            // 2 navbar
    $('#banner').hidden = false;
    await wait(750); glitch($('#hero'));                           // 3 head
    await wait(750);                                               // 4 next section, with private cards
    state.priv = data.entries.map((e) => Object.assign({}, e, { priv: true })); state.showPriv = true;
    fillSlots(data); renderAll(true); glitch($('#grid'));
    $('#entries').scrollIntoView({ behavior: 'smooth', block: 'start' });
    await wait(900); glitch($('footer.foot'));                     // 5 and so on
    $('footer.foot').scrollIntoView({ behavior: 'smooth', block: 'end' });
    await wait(750); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---- passphrase box ---- */
  let busy = false;
  function openBox() {
    if (state.showPriv) return;
    $('#veil').hidden = false; $('#err').textContent = ''; const p = $('#pass'); p.value = ''; p.focus();
  }
  function closeBox() { $('#veil').hidden = true; $('#pass').value = ''; $('#err').textContent = ''; }

  function bindSearch() { const q = $('#q'); if (q && !q.dataset.b) { q.dataset.b = 1; q.addEventListener('input', () => { state.q = q.value; renderCards(false); }); } }

  async function init() {
    const bt = $$('[data-archive]');
    bt.forEach((b) => b.addEventListener('click', openBox));
    $('#cancel').addEventListener('click', closeBox);
    $('#veil').addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBox(); });
    $('#lock-again').addEventListener('click', () => { Vault.lock(); document.getElementById('all').classList.add('g-on'); setTimeout(hidePrivate, 450); });
    $('#chips').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { state.filter = b.dataset.k; renderChips(); renderCards(false); } });
    $('#grid').addEventListener('click', (e) => { const a = e.target.closest('[data-t]'); if (a) { state.topic = state.topic === a.dataset.t ? '' : a.dataset.t; renderTopics(); renderCards(false); } });
    bindSearch();

    $('#mac').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      const pass = $('#pass').value;
      if (!pass) return;
      busy = true; $('#err').textContent = 'Checking…';
      const data = await Vault.unlock(pass);
      busy = false;
      if (!data) {
        $('#err').textContent = 'Incorrect password.';
        const f = $('#field'); f.classList.remove('shk'); void f.offsetWidth; f.classList.add('shk');
        return;
      }
      $('#err').textContent = '';
      cascade(data);
    });

    try {
      const r = await fetch('entries.json', { cache: 'no-cache' });
      state.pub = await r.json();
    } catch (e) { state.pub = []; }
    renderAll(false);

    // already unlocked earlier in this tab: restore quietly, no cascade
    const data = await Vault.resume().catch(() => null);
    if (data) showPrivate(data, false);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
