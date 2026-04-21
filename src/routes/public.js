const express = require('express');
const { getDb, getSetting } = require('../db');

const router = express.Router();

function listEnabledScripts() {
  return getDb()
    .prepare(
      `SELECT id, slug, title, short_name, image_url, card_image_url, description
         FROM scripts
        WHERE enabled = 1
        ORDER BY sort_order ASC, id ASC`
    )
    .all();
}

function getScriptBySlug(slug) {
  const script = getDb()
    .prepare('SELECT * FROM scripts WHERE slug = ? AND enabled = 1')
    .get(slug);
  if (!script) return null;
  script.subs = getDb()
    .prepare('SELECT name FROM sub_scripts WHERE script_id = ? ORDER BY sort_order ASC, id ASC')
    .all(script.id)
    .map((r) => r.name);
  return script;
}

function commonLocals() {
  return {
    siteName: getSetting('site_name', 'ModsBlox'),
    analyticsScript: getSetting('analytics_script_url', ''),
    analyticsId: getSetting('analytics_website_id', ''),
    offerMin: parseInt(getSetting('offer_min', '2'), 10) || 2,
    videoGuide: getSetting('video_guide_url', ''),
  };
}

const ROBUX_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000, 100000];

router.get('/', (req, res) => {
  const scripts = listEnabledScripts();
  res.render('home', { ...commonLocals(), scripts });
});

router.get('/s/:slug', (req, res) => {
  const script = getScriptBySlug(req.params.slug);
  if (!script) return res.status(404).render('not-found', commonLocals());
  res.render('script', { ...commonLocals(), script });
});

router.get('/s/:slug/locker', (req, res) => {
  const script = getScriptBySlug(req.params.slug);
  if (!script) return res.status(404).render('not-found', commonLocals());
  res.render('locker', { ...commonLocals(), script });
});

router.get('/robux', (req, res) => {
  res.render('robux', { ...commonLocals(), amounts: ROBUX_AMOUNTS });
});

router.get('/robux/locker', (req, res) => {
  res.render('robux-locker', { ...commonLocals(), amounts: ROBUX_AMOUNTS });
});

// Legacy path redirects (keeps old external links alive).
router.get('/scripts/:slug/index.html', (req, res) =>
  res.redirect(301, `/s/${req.params.slug}`)
);
router.get('/scripts/:slug/locker.html', (req, res) =>
  res.redirect(301, `/s/${req.params.slug}/locker`)
);
router.get('/scripts/:slug/', (req, res) => res.redirect(301, `/s/${req.params.slug}`));
router.get('/scripts/:slug', (req, res) => res.redirect(301, `/s/${req.params.slug}`));
router.get('/script/index.html', (req, res) => res.redirect(301, '/s/delta-executor'));
router.get('/script/locker.html', (req, res) =>
  res.redirect(301, '/s/delta-executor/locker')
);

module.exports = router;
