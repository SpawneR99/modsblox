const bcrypt = require('bcrypt');
const { getDb, setSetting, getSetting } = require('./db');

const DEFAULT_HUBS = [
  'ModsBlox', 'Soluna', 'Overflow', 'Nicuse', 'Unfair Hub', 'Forge Hub',
  'Oblivion V1', 'Bean Hub', 'Mango Hub', 'Stingray', 'PEELY HUB', 'XIBA HUB',
  'Soggyware', 'BT Project', 'Project M', 'Sub Hub v3', 'BANANA S', 'CHIBB HUB',
  'PS99', 'SystemB', 'Versus', 'UC Hub',
];

const DELTA_VERSIONS = [
  'Delta v2.713', 'Delta v2.712', 'Delta v2.711', 'Delta Lite', 'Delta Pro',
];

const DEFAULT_SCRIPTS = [
  {
    slug: 'delta-executor',
    title: 'Delta Executor',
    short_name: 'Delta Executor',
    image_url: 'https://deltaaxecutor.com/wp-content/uploads/2025/10/Delta-Executor-9.webp',
    card_image_url: 'https://deltaaxecutor.com/wp-content/uploads/2025/10/Delta-Executor-9.webp',
    description: 'The most powerful and reliable Roblox executor. Supports all scripts, auto-updates, and features a built-in script hub with 500+ scripts.',
    niche: 'ModsBloxDelta',
    vpath: '/delta-executor',
    badge: 'PREMIUM EXECUTOR',
    intro_subtitle: 'Premium Roblox Script Executor',
    hub_label: 'Select Version',
    install_label: 'Install Delta Executor',
    key_prefix: 'DELTA',
    sort_order: 10,
    hubs: DELTA_VERSIONS,
  },
  {
    slug: 'arise',
    title: 'Arise Crossover',
    short_name: 'Arise',
    image_url: '/static/scripts/arise/blox.png',
    card_image_url: '/static/scripts/arise/blox.png',
    description: 'Dominate Arise Crossover with powerful auto-farm, auto-quest, and combat scripts. Updated for the latest version.',
    niche: 'ModsBloxArise',
    vpath: '/arise',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Arise Crossover Script',
    key_prefix: 'MODS',
    sort_order: 20,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'blox-fruits',
    title: 'Blox Fruits',
    short_name: 'Blox Fruits',
    image_url: 'https://assets.gam3s.gg/Blox_Fruits_Cover_5a642274db.webp',
    card_image_url: 'https://assets.gam3s.gg/Blox_Fruits_Cover_5a642274db.webp',
    description: 'Auto-farm, devil fruit spawner, and combat enhancers for Blox Fruits. Stay ahead of every update.',
    niche: 'ModsBloxFruits',
    vpath: '/blox-fruits',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Blox Fruits Script',
    key_prefix: 'MODS',
    sort_order: 30,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'steal-a-brainrot',
    title: 'Steal a Brainrot',
    short_name: 'Steal a Brainrot',
    image_url: 'https://m.media-amazon.com/images/I/816-hYE6KfL.jpg',
    card_image_url: 'https://m.media-amazon.com/images/I/816-hYE6KfL.jpg',
    description: 'Auto-steal, auto-collect and anti-detect for Steal a Brainrot. Built for the latest patch.',
    niche: 'ModsBloxBrainrot',
    vpath: '/steal-a-brainrot',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Steal a Brainrot Script',
    key_prefix: 'MODS',
    sort_order: 40,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'brookhaven',
    title: 'Brookhaven',
    short_name: 'Brookhaven',
    image_url: '/static/scripts/brookhaven/blox.png',
    card_image_url: '/static/scripts/brookhaven/blox.png',
    description: 'RP enhancers, animation unlockers, and admin commands for Brookhaven RP.',
    niche: 'ModsBloxBrookhaven',
    vpath: '/brookhaven',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Brookhaven Script',
    key_prefix: 'MODS',
    sort_order: 50,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'dead-rails',
    title: 'Dead Rails',
    short_name: 'Dead Rails',
    image_url: 'https://i1.sndcdn.com/artworks-accKzF8Xbp7LwB91-Tj58RA-t1080x1080.jpg',
    card_image_url: 'https://i1.sndcdn.com/artworks-accKzF8Xbp7LwB91-Tj58RA-t1080x1080.jpg',
    description: 'Auto-survive, infinite ammo and ESP for Dead Rails. Dominate every run.',
    niche: 'ModsBloxDeadRails',
    vpath: '/dead-rails',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Dead Rails Script',
    key_prefix: 'MODS',
    sort_order: 60,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'fisch',
    title: 'Fisch',
    short_name: 'Fisch',
    image_url: 'https://assetsio.gnwcdn.com/fisch-0.webp?width=1200&height=1200&fit=crop&quality=100&format=png&enable=upscale&auto=webp',
    card_image_url: 'https://assetsio.gnwcdn.com/fisch-0.webp?width=1200&height=1200&fit=crop&quality=100&format=png&enable=upscale&auto=webp',
    description: 'Auto-fish, auto-sell and rare spawn for Fisch. Reel in every legendary catch.',
    niche: 'ModsBloxFisch',
    vpath: '/fisch',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Fisch Script',
    key_prefix: 'MODS',
    sort_order: 70,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'fish-it',
    title: 'Fish It',
    short_name: 'Fish It',
    image_url: '/static/scripts/fishit/blox.png',
    card_image_url: '/static/scripts/fishit/blox.png',
    description: 'Instant reel, XP boost and bait spawner for Fish It.',
    niche: 'ModsBloxFishIt',
    vpath: '/fish-it',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Fish It Script',
    key_prefix: 'MODS',
    sort_order: 80,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'forest',
    title: '99 Nights Forest',
    short_name: 'Forest',
    image_url: '/static/scripts/forest/blox.png',
    card_image_url: '/static/scripts/forest/blox.png',
    description: 'Auto-survival, infinite resources and monster ESP for 99 Nights in the Forest.',
    niche: 'ModsBloxForest',
    vpath: '/forest',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install 99 Nights Forest Script',
    key_prefix: 'MODS',
    sort_order: 90,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'forsaken',
    title: 'Forsaken',
    short_name: 'Forsaken',
    image_url: '/static/scripts/forsaken/blox.png',
    card_image_url: '/static/scripts/forsaken/blox.png',
    description: 'Killer ESP, speed-boost and auto-generator for Forsaken.',
    niche: 'ModsBloxForsaken',
    vpath: '/forsaken',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Forsaken Script',
    key_prefix: 'MODS',
    sort_order: 100,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'grow-a-garden',
    title: 'Grow a Garden',
    short_name: 'Grow a Garden',
    image_url: 'https://www.spectator.com.au/wp-content/uploads/2025/07/5Julygamer.png',
    card_image_url: 'https://www.spectator.com.au/wp-content/uploads/2025/07/5Julygamer.png',
    description: 'Auto-plant, instant-grow and seed duper for Grow a Garden.',
    niche: 'ModsBloxGarden',
    vpath: '/grow-a-garden',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Grow a Garden Script',
    key_prefix: 'MODS',
    sort_order: 110,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'build-an-island',
    title: 'Build An Island',
    short_name: 'Island',
    image_url: '/static/scripts/island/blox.png',
    card_image_url: '/static/scripts/island/blox.png',
    description: 'Auto-build, free gems and item spawner for Build An Island.',
    niche: 'ModsBloxIsland',
    vpath: '/island',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Build An Island Script',
    key_prefix: 'MODS',
    sort_order: 120,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'plants-vs-brainrots',
    title: 'Plants vs Brainrots',
    short_name: 'Plants Brainrots',
    image_url: '/static/scripts/plantsbrainrots/blox.png',
    card_image_url: '/static/scripts/plantsbrainrots/blox.png',
    description: 'Auto-defend, seed spawner and damage boost for Plants vs Brainrots.',
    niche: 'ModsBloxPlantsBrainrots',
    vpath: '/plants-brainrots',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Plants vs Brainrots Script',
    key_prefix: 'MODS',
    sort_order: 130,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'rivals',
    title: 'Rivals',
    short_name: 'Rivals',
    image_url: '/static/scripts/rivals/blox.png',
    card_image_url: '/static/scripts/rivals/blox.png',
    description: 'Silent aim, wallbang and ESP for Rivals FPS.',
    niche: 'ModsBloxRivals',
    vpath: '/rivals',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Rivals Script',
    key_prefix: 'MODS',
    sort_order: 140,
    hubs: DEFAULT_HUBS,
  },
  {
    slug: 'volleyball-legends',
    title: 'Volleyball Legends',
    short_name: 'Volleyball',
    image_url: '/static/scripts/volleyball/blox.png',
    card_image_url: '/static/scripts/volleyball/blox.png',
    description: 'Auto-spike, perfect-receive and server hop for Volleyball Legends.',
    niche: 'ModsBloxVolleyball',
    vpath: '/volleyball',
    badge: 'PREMIUM SCRIPT',
    intro_subtitle: 'Free Premium Script',
    hub_label: 'Select Script Hub',
    install_label: 'Install Volleyball Legends Script',
    key_prefix: 'MODS',
    sort_order: 150,
    hubs: DEFAULT_HUBS,
  },
];

function seedScripts() {
  const db = getDb();
  const hasAny = db.prepare('SELECT COUNT(*) AS c FROM scripts').get().c;
  if (hasAny > 0) return;

  const insertScript = db.prepare(`
    INSERT INTO scripts (slug, title, short_name, image_url, card_image_url, description,
      niche, vpath, badge, intro_subtitle, hub_label, install_label, key_prefix, sort_order, enabled)
    VALUES (@slug, @title, @short_name, @image_url, @card_image_url, @description,
      @niche, @vpath, @badge, @intro_subtitle, @hub_label, @install_label, @key_prefix, @sort_order, 1)
  `);
  const insertSub = db.prepare(
    'INSERT INTO sub_scripts (script_id, name, sort_order) VALUES (?, ?, ?)'
  );

  const tx = db.transaction(() => {
    for (const s of DEFAULT_SCRIPTS) {
      const info = insertScript.run(s);
      s.hubs.forEach((h, i) => insertSub.run(info.lastInsertRowid, h, (i + 1) * 10));
    }
  });
  tx();
}

function seedSettings() {
  if (getSetting('offer_provider') === null) setSetting('offer_provider', 'adbluemedia');
  if (getSetting('offer_max') === null) setSetting('offer_max', '4');
  if (getSetting('offer_min') === null) setSetting('offer_min', '2');
  if (getSetting('site_name') === null) setSetting('site_name', 'ModsBlox');
  if (getSetting('analytics_script_url') === null)
    setSetting('analytics_script_url', 'https://analytics.ufomedia.xyz/script.js');
  if (getSetting('analytics_website_id') === null)
    setSetting('analytics_website_id', 'fd7569ee-8869-4c8a-8fe6-cf4675d7a0fd');
  if (getSetting('video_guide_url') === null)
    setSetting('video_guide_url', 'https://www.youtube.com/shorts/IpdH7vYS0oY');
}

async function seedAdmin() {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
  if (existing > 0) return;

  const username = (process.env.ADMIN_USERNAME || '').trim();
  const hashEnv = (process.env.ADMIN_PASSWORD_HASH || '').trim();
  const plainEnv = process.env.ADMIN_PASSWORD || '';

  if (!username) {
    console.warn(
      '[seed] No admin exists and ADMIN_USERNAME is not set. Skipping admin bootstrap.\n' +
        '       Set ADMIN_USERNAME + ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD) then restart.'
    );
    return;
  }

  let hash = hashEnv;
  if (!hash) {
    if (!plainEnv || plainEnv.length < 10) {
      console.warn(
        '[seed] ADMIN_PASSWORD missing or too short (<10 chars). Skipping admin bootstrap.'
      );
      return;
    }
    hash = await bcrypt.hash(plainEnv, 12);
  }

  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`[seed] Created admin user "${username}".`);
}

async function runSeeds() {
  seedScripts();
  seedSettings();
  await seedAdmin();
}

module.exports = { runSeeds };
