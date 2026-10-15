/* Learning log (private). Overview calendar -> click a day / range -> focus view:
   big back arrow, timeline in the centre (hours along the bottom for a day, days for a range), chart top-right. */
document.addEventListener('vault', (ev) => {
  const { $, escapeHtml: h } = Core;
  const data = ev.detail;
  const app = $('#app');
  if (!data) { $('#locked').innerHTML = 'This page is private. Open <a href="index.html">Archive</a> and enter the passphrase.'; return; }

  const S = data.learning;                       // [{d,s,m,t,title}]
  const TOPICS = ['AI', 'Android', 'Linux', 'Design', 'Software'];
  const col = (t) => `var(--t${Math.max(0, TOPICS.indexOf(t)) + 1})`;
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
  const byDay = {}; S.forEach((x) => (byDay[x.d] = byDay[x.d] || []).push(x));
  const mins = (arr) => arr.reduce((a, x) => a + x.m, 0);
  const fmt = (m) => (m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60 ? (m % 60) + 'm' : '') : m + 'm').trim();
  const last = S.length ? S[S.length - 1].d : iso(new Date());

  const st = { mode: 'day', month: last.slice(0, 7), n: 10, focus: null, chart: 'bar' };

  const range = (f) => {
    const days = []; const a = f.start, b = f.end;
    for (let d = a; d <= b; d = addDays(d, 1)) days.push(d);
    return days;
  };

  function overview() {
    const [Y, M] = st.month.split('-').map(Number);
    const first = new Date(Date.UTC(Y, M - 1, 1)), dim = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7;
    const tot = {}; for (let d = 1; d <= dim; d++) tot[d] = mins(byDay[`${st.month}-${String(d).padStart(2, '0')}`] || []);
    const max = Math.max(60, ...Object.values(tot));
    const cells = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((x) => `<div class="dow">${x}</div>`).join('') +
      '<div class="day off"></div>'.repeat(lead) +
      Array.from({ length: dim }, (_, i) => { const d = i + 1, m = tot[d], key = `${st.month}-${String(d).padStart(2, '0')}`;
        return `<button class="day" data-d="${key}" aria-label="${key}, ${fmt(m) || 'no sessions'}"><i style="opacity:${m ? (0.12 + 0.7 * m / max).toFixed(2) : 0}"></i><span>${d}</span></button>`; }).join('');
    const label = first.toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const tabs = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['custom', 'Custom']]
      .map(([k, l]) => `<button class="chip" data-mode="${k}" aria-pressed="${st.mode === k}">${l}</button>`).join('');
    const hint = { day: 'Click a day to open its timeline.', week: 'Click any day to open that week.', month: 'Click any day to open that month.', year: 'Click any day to open the whole year.', custom: 'Pick the number of days, then click the day it starts on.' }[st.mode];
    app.innerHTML = `<div class="eyebrow" style="margin-bottom:16px">Private page · every session, day by day</div><h1>Learning <em>log</em></h1>
      <div class="tabs" style="margin-top:32px">${tabs}${st.mode === 'custom' ? `<label class="mono" style="display:flex;align-items:center;gap:8px;font-size:13px;margin-left:8px">Days <input id="n" type="number" min="2" max="366" value="${st.n}" style="width:80px;min-height:44px;border:1px solid var(--ink);background:var(--card);color:var(--ink);padding:0 10px;font-size:16px"></label>` : ''}</div>
      <p class="mono" style="font-size:13px;color:var(--muted);margin:16px 0 0">${hint}</p>
      <div class="calhead"><button class="btn" data-m="-1" aria-label="Previous month">←</button><h2>${label}</h2><button class="btn" data-m="1" aria-label="Next month">→</button></div>
      <div class="cal">${cells}</div>`;
  }

  function focusOf(day) {
    const m = st.mode;
    if (m === 'day') return { kind: 'day', start: day, end: day, title: new Date(day + 'T00:00:00Z').toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) };
    if (m === 'week') { const dow = (new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7, s = addDays(day, -dow); return { kind: 'range', start: s, end: addDays(s, 6), title: 'Week of ' + s }; }
    if (m === 'month') { const ym = day.slice(0, 7), e = iso(new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5), 0))); return { kind: 'range', start: ym + '-01', end: e, title: new Date(ym + '-01T00:00:00Z').toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }; }
    if (m === 'year') { const y = day.slice(0, 4); return { kind: 'year', start: y + '-01-01', end: y + '-12-31', title: y }; }
    return { kind: 'range', start: day, end: addDays(day, st.n - 1), title: `${st.n} days from ${day}` };
  }

  function timelineDay(f) {
    const ss = byDay[f.start] || [];
    const W = 1000, H = 220, px = (hr) => 30 + (hr / 24) * (W - 60);
    const ticks = Array.from({ length: 25 }, (_, i) => `<line x1="${px(i)}" y1="20" x2="${px(i)}" y2="170" stroke="var(--line2)"/>${i % 2 === 0 ? `<text x="${px(i)}" y="196" text-anchor="middle" font-size="13" font-family="IBM Plex Mono,monospace" fill="var(--muted)">${String(i).padStart(2, '0')}:00</text>` : ''}`).join('');
    const blocks = ss.map((x, i) => `<g><rect x="${px(x.s)}" y="${40 + (i % 3) * 42}" width="${Math.max(6, (x.m / 60 / 24) * (W - 60))}" height="34" fill="${col(x.t)}"/><text x="${px(x.s) + 6}" y="${62 + (i % 3) * 42}" font-size="13" font-family="IBM Plex Mono,monospace" fill="#fff" style="paint-order:stroke;stroke:rgba(0,0,0,.45);stroke-width:3px">${h(x.title)} · ${fmt(x.m)}</text></g>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Timeline of sessions">${ticks}${blocks}${ss.length ? '' : '<text x="500" y="100" text-anchor="middle" font-size="16" fill="var(--muted)">No sessions logged</text>'}</svg>`;
  }
  function timelineRange(f) {
    const days = f.kind === 'year' ? null : range(f);
    const buckets = days
      ? days.map((d) => ({ label: d.slice(8), tip: d, items: byDay[d] || [] }))
      : Array.from({ length: 12 }, (_, i) => { const p = `${f.start.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`; return { label: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i], tip: p, items: S.filter((x) => x.d.startsWith(p)) }; });
    const max = Math.max(60, ...buckets.map((b) => mins(b.items)));
    const W = 1000, bw = (W - 60) / buckets.length;
    const bars = buckets.map((b, i) => { let y = 170; const x = 30 + i * bw;
      const segs = TOPICS.map((t) => { const m = mins(b.items.filter((s) => s.t === t)); if (!m) return ''; const hh = (m / max) * 140; y -= hh; return `<rect x="${x + 2}" y="${y}" width="${Math.max(2, bw - 4)}" height="${hh}" fill="${col(t)}"><title>${b.tip} · ${t} ${fmt(m)}</title></rect>`; }).join('');
      return segs + `<text x="${x + bw / 2}" y="192" text-anchor="middle" font-size="${buckets.length > 40 ? 8 : 12}" font-family="IBM Plex Mono,monospace" fill="var(--muted)">${buckets.length > 40 && i % 5 ? '' : b.label}</text>`; }).join('');
    return `<svg viewBox="0 0 1000 210" width="100%" role="img" aria-label="Minutes per ${days ? 'day' : 'month'}"><line x1="30" y1="170" x2="970" y2="170" stroke="var(--ink)"/>${bars}</svg>`;
  }

  function chartHtml(items) {
    const tot = TOPICS.map((t) => ({ t, m: mins(items.filter((x) => x.t === t)) })).filter((x) => x.m);
    const all = tot.reduce((a, x) => a + x.m, 0) || 1;
    let body = '';
    if (st.chart === 'bar') {
      const mx = Math.max(...tot.map((x) => x.m), 1);
      body = `<svg viewBox="0 0 300 ${tot.length * 34 + 6}" width="100%">${tot.map((x, i) => `<rect x="70" y="${i * 34 + 4}" width="${(x.m / mx) * 170}" height="24" fill="${col(x.t)}"/><text x="64" y="${i * 34 + 21}" text-anchor="end" font-size="12" font-family="IBM Plex Mono,monospace" fill="var(--ink)">${x.t}</text><text x="${76 + (x.m / mx) * 170}" y="${i * 34 + 21}" font-size="12" font-family="IBM Plex Mono,monospace" fill="var(--ink)">${fmt(x.m)}</text>`).join('')}</svg>`;
    } else if (st.chart === 'pie') {
      let acc = 0; const stops = tot.map((x) => { const a = acc / all * 360; acc += x.m; return `${col(x.t)} ${a}deg ${acc / all * 360}deg`; }).join(',');
      body = `<div class="pie" style="background:conic-gradient(${stops || 'var(--line) 0 360deg'})" role="img" aria-label="Share of time by topic"></div>`;
    } else {
      const f = st.focus, days = f.kind === 'year' ? null : range(f);
      const pts = (days ? days.map((d) => mins(byDay[d] || [])) : Array.from({ length: 12 }, (_, i) => mins(S.filter((x) => x.d.startsWith(`${f.start.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`)))));
      const mx = Math.max(...pts, 1), n = Math.max(pts.length - 1, 1);
      body = `<svg viewBox="0 0 300 130" width="100%"><polyline fill="none" stroke="var(--t1)" stroke-width="2.5" points="${pts.map((v, i) => `${10 + (i / n) * 280},${120 - (v / mx) * 105}`).join(' ')}"/><line x1="10" y1="120" x2="290" y2="120" stroke="var(--ink)"/></svg>`;
    }
    const kinds = [['bar', 'Bar'], ['pie', 'Pie'], ['line', 'Line']].map(([k, l]) => `<button class="chip" data-chart="${k}" aria-pressed="${st.chart === k}" style="min-height:36px;padding:0 12px">${l}</button>`).join('');
    return `<div class="chips" style="margin-bottom:12px">${kinds}</div>${body}<table class="tbl">${tot.map((x) => `<tr><td><span class="sw" style="background:${col(x.t)}"></span>${x.t}</td><td>${fmt(x.m)}</td><td>${Math.round(x.m / all * 100)}%</td></tr>`).join('')}<tr><td><b>Total</b></td><td colspan="2"><b>${fmt(all === 1 && !tot.length ? 0 : all)}</b></td></tr></table>`;
  }

  function focusView() {
    const f = st.focus, items = S.filter((x) => x.d >= f.start && x.d <= f.end);
    app.innerHTML = `<div class="focus">
      <button class="back" id="back" aria-label="Back to calendar"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M33 20H8M17 10L7 20l10 10" stroke="currentColor" stroke-width="3"/></svg></button>
      <div class="ftitle"><div class="eyebrow">${f.kind === 'day' ? 'Day' : f.kind === 'year' ? 'Year' : 'Range'} · ${fmt(mins(items)) || '0m'} across ${new Set(items.map((x) => x.d)).size} days</div><h2>${h(f.title)}</h2></div>
      <div class="chartbox">${chartHtml(items)}</div>
      <div class="timeline">${f.kind === 'day' ? timelineDay(f) : timelineRange(f)}
        <div class="legend">${TOPICS.map((t) => `<span><span class="sw" style="background:${col(t)}"></span>${t}</span>`).join('')}</div></div></div>`;
  }

  app.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.mode) { st.mode = t.dataset.mode; overview(); }
    else if (t.dataset.m) { const [Y, M] = st.month.split('-').map(Number); const d = new Date(Date.UTC(Y, M - 1 + +t.dataset.m, 1)); st.month = iso(d).slice(0, 7); overview(); }
    else if (t.dataset.d) { st.focus = focusOf(t.dataset.d); focusView(); window.scrollTo({ top: 0 }); }
    else if (t.dataset.chart) { st.chart = t.dataset.chart; focusView(); }
    else if (t.id === 'back') overview();
  });
  app.addEventListener('input', (e) => { if (e.target.id === 'n') st.n = Math.min(366, Math.max(2, +e.target.value || 2)); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.focus && $('#back')) overview(); });
  Core.glitch(app);
  overview();
});
