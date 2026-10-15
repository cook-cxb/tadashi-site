/* Runs on every non-home page. Gets the page data from data.json (everything public),
   or, if some content is private, from the encrypted vault once this tab is unlocked.
   Learning / cave pages listen for the 'vault' event. */
(async function () {
  const { Vault, insertNav, $, $$ } = Core;
  const banner = $('#banner'), lockBtn = $('#lock-again');
  if (lockBtn) lockBtn.addEventListener('click', () => { Vault.lock(); location.href = 'index.html'; });
  let data = null, priv = false;
  try {
    const r = await fetch('data.json', { cache: 'no-cache' });
    if (r.ok) data = await r.json();
  } catch (e) {}
  if (!data) {
    try { data = await Vault.resume(); priv = !!data; } catch (e) {}
  }
  window.__vault = data;
  if (data && priv) {
    insertNav(data.nav, false);
    $$('[data-slot]').forEach((s) => { if (data.regions[s.dataset.slot]) { s.outerHTML = data.regions[s.dataset.slot]; } });
    if (banner) banner.hidden = false;
  }
  document.dispatchEvent(new CustomEvent('vault', { detail: data }));
})();
