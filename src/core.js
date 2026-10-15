/* Shared: theme, vault (decrypt), nav helpers. No dependencies. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const b64 = {
    enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))),
    dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
  };
  const KEY = 'tdsh-key';

  /* ---- theme ---- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('tdsh-theme', t); } catch (e) {}
    $$('[data-theme-toggle]').forEach((b) => { b.textContent = t === 'dark' ? 'Light' : 'Dark'; b.setAttribute('aria-pressed', t === 'dark'); });
  }
  function initTheme() {
    let t = 'light';
    try { t = localStorage.getItem('tdsh-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) {}
    setTheme(t);
    $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')));
  }

  /* ---- vault: AES-GCM, key from PBKDF2(passphrase) ---- */
  const Vault = {
    cache: null,
    async load() {
      if (this.cache) return this.cache;
      const r = await fetch('vault.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('vault.json missing');
      return (this.cache = await r.json());
    },
    async deriveKey(pass, v) {
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.normalize('NFKC').trim()), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64.dec(v.salt), iterations: v.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    },
    async open(key, v) {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(v.iv) }, key, b64.dec(v.ct));
      return JSON.parse(new TextDecoder().decode(plain));
    },
    /* Try a passphrase. Resolves with the decrypted data, or null if it is wrong. */
    async unlock(pass) {
      const v = await this.load();
      try {
        const key = await this.deriveKey(pass, v);
        const data = await this.open(key, v);
        const raw = await crypto.subtle.exportKey('raw', key);
        try { sessionStorage.setItem(KEY, b64.enc(raw)); } catch (e) {}
        return data;
      } catch (e) { return null; }
    },
    /* Reuse the unlock from this tab (key lives in sessionStorage only, never the passphrase). */
    async resume() {
      let raw = null;
      try { raw = sessionStorage.getItem(KEY); } catch (e) {}
      if (!raw) return null;
      try {
        const v = await this.load();
        const key = await crypto.subtle.importKey('raw', b64.dec(raw), 'AES-GCM', false, ['decrypt']);
        return await this.open(key, v);
      } catch (e) { this.lock(); return null; }
    },
    lock() { try { sessionStorage.removeItem(KEY); } catch (e) {} }
  };

  /* ---- nav: private items are inserted at their original position ---- */
  function insertNav(items, animate) {
    const nav = $('nav.main');
    if (!nav) return;
    items.forEach((it) => {
      if ($(`[data-nav="${it.id}"]`, nav)) return;
      const a = document.createElement('a');
      a.href = it.href; a.textContent = it.label; a.dataset.nav = it.id; a.dataset.pos = it.pos;
      if (location.pathname.endsWith(it.href) || (it.href === 'index.html' && /\/$/.test(location.pathname))) a.setAttribute('aria-current', 'page');
      a.className = animate ? 'priv rv' : 'priv';
      const next = $$('[data-pos]', nav).find((n) => +n.dataset.pos > it.pos);
      nav.insertBefore(a, next || $('[data-theme-toggle]', nav));
    });
  }
  function removeNav() { $$('nav.main [data-nav].priv').forEach((n) => n.remove()); }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const glitch = (el) => { if (!el || reduced()) return; el.classList.remove('g-on'); void el.offsetWidth; el.classList.add('g-on'); setTimeout(() => el.classList.remove('g-on'), 800); };

  window.Core = { $, $$, reduced, Vault, insertNav, removeNav, escapeHtml, glitch, initTheme, setTheme };
  document.addEventListener('DOMContentLoaded', initTheme);
})();
