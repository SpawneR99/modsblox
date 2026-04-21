require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');

const { initDb } = require('./src/db');
const { runSeeds } = require('./src/seed');
const { attachUser, attachCsrf } = require('./src/auth');

const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');
const apiRoutes = require('./src/routes/api');

function requireEnv(name) {
  const v = (process.env[name] || '').trim();
  if (!v) {
    console.error(`FATAL: missing env var ${name}`);
    process.exit(1);
  }
  return v;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
process.env.DATA_DIR = DATA_DIR;

const SESSION_SECRET = requireEnv('SESSION_SECRET');
if (SESSION_SECRET.length < 32) {
  console.error('FATAL: SESSION_SECRET must be at least 32 characters');
  process.exit(1);
}

initDb(DATA_DIR);

// Session store uses its own DB file so it can be rotated independently.
const sessionDb = new Database(path.join(DATA_DIR, 'sessions.db'));

const app = express();

// Behind Coolify / Traefik
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---- Security headers ----
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          'https://analytics.ufomedia.xyz',
          'https://ajax.googleapis.com',
        ],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'connect-src': ["'self'", 'https:'],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Static
app.use(
  '/static',
  express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    fallthrough: true,
    index: false,
  })
);
app.use(
  '/uploads',
  express.static(path.join(DATA_DIR, 'uploads'), {
    maxAge: '7d',
    fallthrough: true,
    index: false,
  })
);

// Sessions
app.use(
  session({
    store: new SqliteStore({ client: sessionDb, expired: { clear: true, intervalMs: 900000 } }),
    secret: SESSION_SECRET,
    name: 'sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24, // 24h
    },
  })
);

app.use(attachUser);
app.use(attachCsrf);

// Favicon
app.get('/favicon.ico', (_req, res) => res.redirect(301, '/static/logo.png'));

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// 404
app.use((_req, res) => {
  res.status(404).render('not-found', { siteName: 'ModsBlox' });
});

// Error handler (never leak stack traces)
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  res.status(500).render('error', { siteName: 'ModsBlox' });
});

runSeeds()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`ModsBlox running on :${PORT}  (env=${NODE_ENV})  data=${DATA_DIR}`);
    });
  })
  .catch((err) => {
    console.error('Seed failed', err);
    process.exit(1);
  });

function shutdown() {
  try {
    sessionDb.close();
  } catch (_) {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
