const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const {
  verifyCredentials,
  updatePassword,
  touchLogin,
  requireAdmin,
  csrfProtect,
} = require('../auth');
const { getDb, getSetting, setSetting } = require('../db');

const router = express.Router();

// ------------ Uploads ------------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
      const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)
        ? ext
        : '.png';
      const base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      cb(null, base + safeExt);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error('Only image files allowed'), ok);
  },
});

// ------------ Rate limiting ------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please wait 15 minutes.',
});

// ------------ Helpers ------------
function parseIntSafe(v, fb) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fb;
}

function normalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function renderFlash(req, res, next) {
  res.locals.flash = req.session && req.session.flash ? req.session.flash : null;
  if (req.session) req.session.flash = null;
  next();
}

function setFlash(req, type, message) {
  if (req.session) req.session.flash = { type, message };
}

router.use(renderFlash);

// ------------ Public (auth) routes ------------
router.get('/login', (req, res) => {
  if (req.admin) return res.redirect('/admin');
  res.render('admin/login', {
    title: 'Admin login',
    next: String(req.query.next || '/admin'),
    error: null,
  });
});

router.post('/login', loginLimiter, csrfProtect, async (req, res) => {
  const { username, password } = req.body;
  const nextUrl = String(req.body.next || '/admin');
  const safeNext =
    nextUrl.startsWith('/') && !nextUrl.startsWith('//') ? nextUrl : '/admin';

  const admin = await verifyCredentials(username, password);
  if (!admin) {
    return res.status(401).render('admin/login', {
      title: 'Admin login',
      next: safeNext,
      error: 'Invalid username or password.',
    });
  }
  // Rotate session to prevent fixation
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error');
    req.session.adminId = admin.id;
    touchLogin(admin.id);
    req.session.save(() => res.redirect(safeNext));
  });
});

router.post('/logout', csrfProtect, requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/admin/login');
  });
});

// ------------ Protected routes ------------
router.use(requireAdmin);

router.get('/', (req, res) => res.redirect('/admin/dashboard'));

router.get('/dashboard', (req, res) => {
  const db = getDb();
  const totalScripts = db.prepare('SELECT COUNT(*) AS c FROM scripts').get().c;
  const enabledScripts = db
    .prepare('SELECT COUNT(*) AS c FROM scripts WHERE enabled = 1')
    .get().c;
  const totalSubs = db.prepare('SELECT COUNT(*) AS c FROM sub_scripts').get().c;
  res.render('admin/dashboard', {
    title: 'Dashboard',
    totalScripts,
    enabledScripts,
    totalSubs,
    provider: getSetting('offer_provider', 'adbluemedia'),
    offerMin: getSetting('offer_min', '2'),
    offerMax: getSetting('offer_max', '4'),
  });
});

// ----- Scripts CRUD -----
router.get('/scripts', (req, res) => {
  const scripts = getDb()
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM sub_scripts WHERE script_id = s.id) AS sub_count
         FROM scripts s ORDER BY s.sort_order ASC, s.id ASC`
    )
    .all();
  res.render('admin/scripts-list', { title: 'Scripts', scripts });
});

router.get('/scripts/new', (req, res) => {
  res.render('admin/script-form', {
    title: 'New script',
    script: {
      id: null,
      slug: '',
      title: '',
      short_name: '',
      image_url: '',
      card_image_url: '',
      description: '',
      niche: '',
      vpath: '',
      badge: 'PREMIUM SCRIPT',
      intro_subtitle: 'Free Premium Script',
      hub_label: 'Select Script Hub',
      install_label: '',
      key_prefix: 'MODS',
      video_url: '',
      sort_order: 100,
      enabled: 1,
    },
    subs: [],
  });
});

router.get('/scripts/:id/edit', (req, res) => {
  const id = parseIntSafe(req.params.id, 0);
  const script = getDb().prepare('SELECT * FROM scripts WHERE id = ?').get(id);
  if (!script) return res.status(404).send('Not found');
  const subs = getDb()
    .prepare('SELECT id, name FROM sub_scripts WHERE script_id = ? ORDER BY sort_order ASC, id ASC')
    .all(id);
  res.render('admin/script-form', { title: `Edit ${script.title}`, script, subs });
});

function readScriptBody(req, iconFile) {
  const b = req.body || {};
  const image_url = iconFile ? `/uploads/${iconFile.filename}` : String(b.image_url || '').trim();
  const card_image_url =
    String(b.card_image_url || '').trim() || image_url;
  return {
    slug: normalizeSlug(b.slug) || normalizeSlug(b.short_name || b.title),
    title: String(b.title || '').trim().slice(0, 120),
    short_name: String(b.short_name || b.title || '').trim().slice(0, 60),
    image_url,
    card_image_url,
    description: String(b.description || '').trim().slice(0, 2000),
    niche: String(b.niche || '').trim().slice(0, 64),
    vpath: String(b.vpath || '').trim().slice(0, 120) || '/' + normalizeSlug(b.slug || b.title),
    badge: String(b.badge || 'PREMIUM SCRIPT').trim().slice(0, 40),
    intro_subtitle: String(b.intro_subtitle || 'Free Premium Script').trim().slice(0, 120),
    hub_label: String(b.hub_label || 'Select Script Hub').trim().slice(0, 60),
    install_label: String(b.install_label || '').trim().slice(0, 120),
    key_prefix: String(b.key_prefix || 'MODS').trim().slice(0, 16),
    video_url: String(b.video_url || '').trim().slice(0, 300),
    sort_order: parseIntSafe(b.sort_order, 100),
    enabled: b.enabled ? 1 : 0,
  };
}

function saveSubs(scriptId, body) {
  const names = Array.isArray(body.sub_names) ? body.sub_names : [body.sub_names].filter(Boolean);
  const db = getDb();
  db.prepare('DELETE FROM sub_scripts WHERE script_id = ?').run(scriptId);
  const ins = db.prepare(
    'INSERT INTO sub_scripts (script_id, name, sort_order) VALUES (?, ?, ?)'
  );
  let order = 10;
  for (const raw of names) {
    const n = String(raw || '').trim().slice(0, 80);
    if (!n) continue;
    ins.run(scriptId, n, order);
    order += 10;
  }
}

router.post(
  '/scripts/new',
  (req, res, next) => {
    upload.single('icon')(req, res, (err) => {
      if (err) {
        setFlash(req, 'error', err.message || 'Upload failed');
        return res.redirect('/admin/scripts/new');
      }
      next();
    });
  },
  csrfProtect,
  (req, res) => {
    const data = readScriptBody(req, req.file);
    if (!data.title || !data.slug || !data.image_url || !data.niche) {
      setFlash(req, 'error', 'Title, slug, image and niche are required.');
      return res.redirect('/admin/scripts/new');
    }
    try {
      const info = getDb()
        .prepare(
          `INSERT INTO scripts (slug, title, short_name, image_url, card_image_url, description,
              niche, vpath, badge, intro_subtitle, hub_label, install_label, key_prefix, video_url,
              sort_order, enabled)
           VALUES (@slug,@title,@short_name,@image_url,@card_image_url,@description,
              @niche,@vpath,@badge,@intro_subtitle,@hub_label,@install_label,@key_prefix,@video_url,
              @sort_order,@enabled)`
        )
        .run(data);
      saveSubs(info.lastInsertRowid, req.body);
      setFlash(req, 'success', 'Script created.');
      res.redirect('/admin/scripts');
    } catch (e) {
      setFlash(req, 'error', 'Could not create script: ' + e.message);
      res.redirect('/admin/scripts/new');
    }
  }
);

router.post(
  '/scripts/:id/edit',
  (req, res, next) => {
    upload.single('icon')(req, res, (err) => {
      if (err) {
        setFlash(req, 'error', err.message || 'Upload failed');
        return res.redirect(`/admin/scripts/${req.params.id}/edit`);
      }
      next();
    });
  },
  csrfProtect,
  (req, res) => {
    const id = parseIntSafe(req.params.id, 0);
    if (!id) return res.status(404).send('Not found');
    const data = readScriptBody(req, req.file);
    if (!data.title || !data.slug || !data.image_url || !data.niche) {
      setFlash(req, 'error', 'Title, slug, image and niche are required.');
      return res.redirect(`/admin/scripts/${id}/edit`);
    }
    try {
      const result = getDb()
        .prepare(
          `UPDATE scripts SET slug=@slug, title=@title, short_name=@short_name,
             image_url=@image_url, card_image_url=@card_image_url, description=@description,
             niche=@niche, vpath=@vpath, badge=@badge, intro_subtitle=@intro_subtitle,
             hub_label=@hub_label, install_label=@install_label, key_prefix=@key_prefix,
             video_url=@video_url, sort_order=@sort_order, enabled=@enabled,
             updated_at=strftime('%s','now')
           WHERE id=@id`
        )
        .run({ ...data, id });
      if (result.changes === 0) return res.status(404).send('Not found');
      saveSubs(id, req.body);
      setFlash(req, 'success', 'Script updated.');
      res.redirect('/admin/scripts');
    } catch (e) {
      setFlash(req, 'error', 'Could not update script: ' + e.message);
      res.redirect(`/admin/scripts/${id}/edit`);
    }
  }
);

router.post('/scripts/:id/delete', csrfProtect, (req, res) => {
  const id = parseIntSafe(req.params.id, 0);
  if (!id) return res.status(404).send('Not found');
  getDb().prepare('DELETE FROM scripts WHERE id = ?').run(id);
  setFlash(req, 'success', 'Script deleted.');
  res.redirect('/admin/scripts');
});

router.post('/scripts/:id/toggle', csrfProtect, (req, res) => {
  const id = parseIntSafe(req.params.id, 0);
  if (!id) return res.status(404).send('Not found');
  getDb()
    .prepare('UPDATE scripts SET enabled = 1 - enabled, updated_at=strftime(\'%s\',\'now\') WHERE id = ?')
    .run(id);
  res.redirect('/admin/scripts');
});

// ----- Settings -----
router.get('/settings', (req, res) => {
  res.render('admin/settings', {
    title: 'Settings',
    settings: {
      site_name: getSetting('site_name', 'ModsBlox'),
      offer_provider: getSetting('offer_provider', 'adbluemedia'),
      offer_max: getSetting('offer_max', '4'),
      offer_min: getSetting('offer_min', '2'),
      analytics_script_url: getSetting('analytics_script_url', ''),
      analytics_website_id: getSetting('analytics_website_id', ''),
      video_guide_url: getSetting('video_guide_url', ''),
    },
    providers: {
      adbluemedia: !!process.env.ADBLUEMEDIA_API_KEY,
      ogads: !!process.env.OGADS_API_KEY,
    },
  });
});

router.post('/settings', csrfProtect, (req, res) => {
  const b = req.body || {};
  const provider = b.offer_provider === 'ogads' ? 'ogads' : 'adbluemedia';
  setSetting('site_name', String(b.site_name || 'ModsBlox').trim().slice(0, 60));
  setSetting('offer_provider', provider);
  setSetting(
    'offer_max',
    String(Math.min(10, Math.max(1, parseIntSafe(b.offer_max, 4))))
  );
  setSetting(
    'offer_min',
    String(Math.min(10, Math.max(1, parseIntSafe(b.offer_min, 2))))
  );
  setSetting('analytics_script_url', String(b.analytics_script_url || '').trim().slice(0, 300));
  setSetting('analytics_website_id', String(b.analytics_website_id || '').trim().slice(0, 80));
  setSetting('video_guide_url', String(b.video_guide_url || '').trim().slice(0, 300));
  setFlash(req, 'success', 'Settings saved.');
  res.redirect('/admin/settings');
});

// ----- Password -----
router.get('/password', (req, res) => {
  res.render('admin/change-password', { title: 'Change password' });
});

router.post('/password', csrfProtect, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  if (!new_password || new_password.length < 10) {
    setFlash(req, 'error', 'New password must be at least 10 characters.');
    return res.redirect('/admin/password');
  }
  if (new_password !== confirm_password) {
    setFlash(req, 'error', 'Passwords do not match.');
    return res.redirect('/admin/password');
  }
  const ok = await verifyCredentials(req.admin.username, current_password);
  if (!ok) {
    setFlash(req, 'error', 'Current password is wrong.');
    return res.redirect('/admin/password');
  }
  await updatePassword(req.admin.id, new_password);
  setFlash(req, 'success', 'Password changed. Please sign in again.');
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/admin/login');
  });
});

module.exports = router;
