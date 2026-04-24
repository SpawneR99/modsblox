const { getSetting } = require('./db');

function buildOgAdsCtaUrl(niche) {
  const base = process.env.OGADS_CLICK_URL || 'https://devicechecky.com/cl/i/qn61kw';
  const sub = encodeURIComponent(String(niche || '').trim());
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}aff_sub4=${sub}`;
}

function buildAdBlueMediaCtaUrl(niche) {
  const base = process.env.ADBLUEMEDIA_CLICK_URL || 'https://devicegetty.com/128efee';
  const sub = encodeURIComponent(String(niche || '').trim());
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}s1=${sub}`;
}

async function getOffers(_req, { niche }) {
  const provider = getSetting('offer_provider', 'adbluemedia');

  if (provider === 'ogads') {
    return {
      provider,
      mode: 'button',
      max: 1,
      min: 1,
      ctaUrl: buildOgAdsCtaUrl(niche),
      offers: [],
    };
  }

  return {
    provider: 'adbluemedia',
    mode: 'button',
    max: 1,
    min: 1,
    ctaUrl: buildAdBlueMediaCtaUrl(niche),
    offers: [],
  };
}

module.exports = { getOffers };
