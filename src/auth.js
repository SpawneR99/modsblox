const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getDb } = require('./db');

function findAdminByUsername(username) {
  return getDb()
    .prepare('SELECT id, username, password_hash FROM admins WHERE username = ?')
    .get(username);
}

function findAdminById(id) {
  return getDb()
    .prepare('SELECT id, username FROM admins WHERE id = ?')
    .get(id);
}

async function verifyCredentials(username, password) {
  const row = findAdminByUsername(String(username || '').trim());
  // Always run bcrypt.compare to avoid timing attacks even when user missing.
  const hash = row ? row.password_hash : '$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const ok = await bcrypt.compare(String(password || ''), hash);
  return ok && row ? row : null;
}

async function updatePassword(adminId, newPassword) {
  const hash = await bcrypt.hash(String(newPassword), 12);
  getDb().prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, adminId);
}

function touchLogin(adminId) {
  getDb()
    .prepare("UPDATE admins SET last_login = strftime('%s','now') WHERE id = ?")
    .run(adminId);
}

function attachUser(req, res, next) {
  if (req.session && req.session.adminId) {
    const admin = findAdminById(req.session.adminId);
    if (admin) req.admin = admin;
    else req.session.adminId = null;
  }
  res.locals.admin = req.admin || null;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.admin) {
    if (req.method === 'GET') {
      const next = encodeURIComponent(req.originalUrl);
      return res.redirect(`/admin/login?next=${next}`);
    }
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// Double-submit cookie CSRF (session-bound token).
function ensureCsrfToken(req) {
  if (!req.session) return null;
  if (!req.session.csrf) {
    req.session.csrf = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrf;
}

function attachCsrf(req, res, next) {
  const token = ensureCsrfToken(req);
  res.locals.csrfToken = token;
  next();
}

function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = req.session && req.session.csrf;
  const given = (req.body && req.body._csrf) || req.get('x-csrf-token') || '';
  if (!expected || !given || !safeEqual(String(expected), String(given))) {
    return res.status(403).send('Invalid CSRF token');
  }
  next();
}

function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

module.exports = {
  verifyCredentials,
  updatePassword,
  touchLogin,
  attachUser,
  requireAdmin,
  attachCsrf,
  csrfProtect,
};
