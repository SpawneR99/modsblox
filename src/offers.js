const { getSetting } = require('./db');

function getClientIp(req) {
  const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  let ip = fwd || req.headers['x-real-ip'] || req.ip || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1' || ip === '127.0.0.1') ip = '';
  return ip;
}

function sanitizeText(t) {
  if (!t) return '';
  return String(t)
    .replace(/\\r\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '') // strip html tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchAdBlueMedia({ niche, ip, userAgent, max }) {
  const endpoint =
    process.env.ADBLUEMEDIA_ENDPOINT ||
    'https://d5b3uz3fo8hn3.cloudfront.net/public/offers/feed.php';
  const userId = process.env.ADBLUEMEDIA_USER_ID;
  const apiKey = process.env.ADBLUEMEDIA_API_KEY;
  if (!userId || !apiKey) throw new Error('AdBlueMedia credentials not configured');

  const params = new URLSearchParams({ user_id: userId, api_key: apiKey, s1: niche || '' });
  if (ip) params.append('ip', ip);
  if (userAgent) params.append('user_agent', userAgent);

  const res = await fetch(`${endpoint}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`AdBlueMedia HTTP ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map((o, i) => ({
    id: String(o.campid || o.offer_id || i),
    title: sanitizeText(o.anchor || o.name || 'Complete Task'),
    description: sanitizeText(o.conversion || o.description || ''),
    url: o.url || '#',
    icon: o.network_icon || o.icon || null,
    payout: o.payout ? `$${Number(o.payout).toFixed(2)}` : null,
    country: o.country || null,
    provider: 'adbluemedia',
  }));
}

async function fetchOgAds({ niche, ip, userAgent, max, min }) {
  const endpoint = process.env.OGADS_ENDPOINT || 'https://checkmyapp.space/api/v2';
  const apiKey = process.env.OGADS_API_KEY;
  if (!apiKey) throw new Error('OGAds credentials not configured');
  if (!ip || !userAgent) throw new Error('OGAds requires client IP and user-agent');

  const params = new URLSearchParams({ ip, user_agent: userAgent });
  if (niche) params.append('aff_sub4', niche);
  if (Number.isFinite(max)) params.append('max', String(max));
  if (Number.isFinite(min)) params.append('min', String(min));

  const res = await fetch(`${endpoint}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`OGAds HTTP ${res.status}`);
  const body = await res.json();
  if (!body || !body.success || !Array.isArray(body.offers)) {
    throw new Error(body && body.error ? String(body.error) : 'OGAds returned no offers');
  }
  return body.offers.slice(0, max).map((o) => ({
    id: String(o.offerid),
    title: sanitizeText(o.name_short || o.name || 'Complete Task'),
    description: sanitizeText(o.adcopy || o.description || ''),
    url: o.link,
    icon: o.picture || null,
    payout: o.payout ? `$${Number(o.payout).toFixed(2)}` : null,
    country: o.country || null,
    provider: 'ogads',
  }));
}

async function getOffers(req, { niche }) {
  const provider = getSetting('offer_provider', 'adbluemedia');
  const max = parseInt(getSetting('offer_max', '4'), 10) || 4;
  const min = parseInt(getSetting('offer_min', '2'), 10) || 2;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  if (provider === 'ogads') {
    return {
      provider,
      max,
      min,
      offers: await fetchOgAds({ niche, ip, userAgent, max, min }),
    };
  }
  return {
    provider: 'adbluemedia',
    max,
    min,
    offers: await fetchAdBlueMedia({ niche, ip, userAgent, max }),
  };
}

module.exports = { getOffers };
