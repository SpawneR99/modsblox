const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db = null;

function initDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'app.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      last_login INTEGER
    );

    CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      short_name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      card_image_url TEXT,
      description TEXT NOT NULL DEFAULT '',
      niche TEXT NOT NULL,
      vpath TEXT NOT NULL,
      badge TEXT NOT NULL DEFAULT 'PREMIUM SCRIPT',
      intro_subtitle TEXT NOT NULL DEFAULT 'Free Premium Script',
      hub_label TEXT NOT NULL DEFAULT 'Select Script Hub',
      install_label TEXT,
      key_prefix TEXT NOT NULL DEFAULT 'MODS',
      video_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 100,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS sub_scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      script_id INTEGER NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 100
    );
    CREATE INDEX IF NOT EXISTS idx_sub_scripts_script_id ON sub_scripts(script_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialised; call initDb() first');
  return db;
}

function getSetting(key, fallback = null) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, String(value));
}

function getAllSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

module.exports = { initDb, getDb, getSetting, setSetting, getAllSettings };
