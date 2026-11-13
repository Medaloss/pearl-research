const UPSTREAM = 'https://pool.kryptex.com/api/v2/daily-revenue/PRL?hashrate=1000000000000000';
const HOUR_MS = 60 * 60 * 1000;

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/pearl-revenue') return env.ASSETS.fetch(request);
    if (request.method !== 'GET') {
      return new Response(null, { status: 405, headers: { Allow: 'GET' } });
    }

    const cache = caches.default;
    const cacheKey = new Request(new URL(url.pathname, url.origin));
    const cached = await cache.match(cacheKey);
    if (cached) return publicResponse(cached.body);

    try {
      const upstream = await fetch(UPSTREAM, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!upstream.ok) throw new Error('Kryptex indisponible');
      const entries = await upstream.json();
      const usdPerDay = Array.isArray(entries) ? entries.find(entry => entry?.coin === 'PRL')?.usd : null;
      if (!Number.isFinite(usdPerDay) || usdPerDay <= 0) throw new Error('Revenu invalide');

      const checkedAt = Date.now();
      const expiresAt = (Math.floor(checkedAt / HOUR_MS) + 1) * HOUR_MS;
      const body = JSON.stringify({ usdPerDay, checkedAt, expiresAt });
      const maxAge = Math.max(1, Math.floor((expiresAt - checkedAt) / 1000));
      context.waitUntil(cache.put(cacheKey, new Response(body, {
        headers: { 'Cache-Control': 'public, max-age=' + maxAge },
      })).catch(() => {}));
      return publicResponse(body);
    } catch {
      return publicResponse(JSON.stringify({ error: 'Kryptex indisponible' }), 502);
    }
  },
};

function publicResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
