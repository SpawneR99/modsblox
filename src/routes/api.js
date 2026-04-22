const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDb, getSetting } = require('../db');
const { getOffers } = require('../offers');

const router = express.Router();

const offersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/offers', offersLimiter, async (req, res) => {
  try {
    const slug = String(req.query.slug || '').trim();
    let niche = String(req.query.niche || '').trim();

    if (slug) {
      const row = getDb()
        .prepare('SELECT niche FROM scripts WHERE slug = ? AND enabled = 1')
        .get(slug);
      if (row && row.niche) niche = row.niche;
    }

    if (!niche) niche = getSetting('site_name', 'ModsBlox');

    const result = await getOffers(req, { niche });

    if (result.mode === 'button') {
      return res.json({
        success: true,
        provider: result.provider,
        mode: 'button',
        ctaUrl: result.ctaUrl,
        min: result.min,
        max: result.max,
        offers: [],
      });
    }

    if (!result.offers || result.offers.length < result.min) {
      return res.json({
        success: false,
        error: 'Not enough offers available',
        provider: result.provider,
        mode: result.mode || 'list',
        min: result.min,
        max: result.max,
        offers: [],
      });
    }
    res.json({
      success: true,
      provider: result.provider,
      mode: result.mode || 'list',
      min: result.min,
      max: result.max,
      offers: result.offers,
    });
  } catch (err) {
    console.error('[api/offers]', err.message);
    res.status(502).json({ success: false, error: 'Upstream provider error', offers: [] });
  }
});

module.exports = router;
