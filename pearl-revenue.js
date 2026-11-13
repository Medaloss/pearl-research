const revenue = document.querySelector('.pearl-revenue');
if (revenue) {
  const status = revenue.querySelector('[data-revenue-status]');
  const time = revenue.querySelector('time');
  const amounts = [...revenue.querySelectorAll('[data-days]')];
  const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' });
  const paris = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  let nextRefresh = 0;
  let refreshTimer;
  let loading = false;

  async function refreshRevenue() {
    if (document.hidden || loading || Date.now() < nextRefresh) return;
    loading = true;
    clearTimeout(refreshTimer);
    try {
      const response = await fetch('/api/pearl-revenue', { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Relevé indisponible');
      const { usdPerDay, checkedAt, expiresAt } = await response.json();
      if (!Number.isFinite(usdPerDay) || usdPerDay <= 0 ||
          !Number.isFinite(checkedAt) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new Error('Relevé invalide');
      }
      for (const amount of amounts) amount.textContent = currency.format(usdPerDay * Number(amount.dataset.days));
      time.dateTime = new Date(checkedAt).toISOString();
      time.textContent = paris.format(checkedAt) + ' (Paris)';
      status.textContent = 'Relevé du ';
      nextRefresh = expiresAt + 1000;
    } catch {
      status.textContent = time.dateTime ? 'Actualisation indisponible · dernier relevé du ' : 'Relevé Kryptex indisponible';
      nextRefresh = Date.now() + 60000;
    } finally {
      loading = false;
      refreshTimer = setTimeout(refreshRevenue, Math.max(0, nextRefresh - Date.now()));
    }
  }

  document.addEventListener('visibilitychange', refreshRevenue);
  refreshRevenue();
}
