/* Runs on every non-home page: if this tab is unlocked, bring back the private nav items,
   private regions, and the "Lock again" banner. Learning / cave pages listen for 'vault' too. */
(async function () {
  const { Vault, insertNav, $, $$ } = Core;
  const banner = $('#banner'), lockBtn = $('#lock-again');
  if (lockBtn) lockBtn.addEventListener('click', () => { Vault.lock(); location.href = 'index.html'; });
  let data = null;
  try { data = await Vault.resume(); } catch (e) {}
  window.__vault = data;
  if (data) {
    insertNav(data.nav, false);
    $$('[data-slot]').forEach((s) => { if (data.regions[s.dataset.slot]) { s.outerHTML = data.regions[s.dataset.slot]; } });
    if (banner) banner.hidden = false;
  }
  document.dispatchEvent(new CustomEvent('vault', { detail: data }));
})();
