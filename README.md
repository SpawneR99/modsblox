# ModsBlox

Secure Node.js + Express + SQLite stack for the ModsBlox Roblox-scripts site.

- **Dynamic catalogue** &mdash; every script (title, icon, description, hubs/versions) lives in the database and is managed from the admin dashboard.
- **Pluggable offer network** &mdash; switch between **AdBlueMedia** and **OGAds** from the admin UI with a single click. API tokens are read from environment variables only.
- **Hardened admin** &mdash; bcrypt passwords, rolling session cookies (`httpOnly`, `sameSite=lax`, `secure` in production), double-submit CSRF tokens, rate-limited login, strict CSP via Helmet. No backdoors, no hard-coded credentials.
- **Coolify friendly** &mdash; single container, SQLite file + uploads persisted in one `/app/data` volume.

---

## Local development

```bash
cp .env.example .env
# edit .env and set SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH)
npm install
npm start
```

Open `http://localhost:3000`. The admin dashboard is at `http://localhost:3000/admin`.

### Generating an admin password hash

```bash
npm run hash -- 'YourStrongPassword'
# -> $2b$12$...
# copy the whole line into ADMIN_PASSWORD_HASH in .env
```

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | **yes** | &ge; 64 random characters for session signing. Rotate to invalidate all sessions. |
| `ADMIN_USERNAME` | bootstrap | Initial admin username (first boot only). |
| `ADMIN_PASSWORD_HASH` | bootstrap | Bcrypt hash of the initial password (preferred). |
| `ADMIN_PASSWORD` | bootstrap | Plain password &mdash; hashed on first boot, then forget it. |
| `ADBLUEMEDIA_USER_ID` | yes (if provider=adbluemedia) | AdBlueMedia user id. |
| `ADBLUEMEDIA_API_KEY` | yes (if provider=adbluemedia) | AdBlueMedia API key. |
| `ADBLUEMEDIA_ENDPOINT` | optional | Override the feed URL. |
| `OGAds_API_KEY` / `OGADS_API_KEY` | yes (if provider=ogads) | OGAds bearer token, e.g. `43416\|xxxx`. |
| `OGADS_ENDPOINT` | optional | Override the OGAds endpoint. |
| `DATA_DIR` | optional | Directory for SQLite DB + uploads. Default: `./data`. |
| `PORT` | optional | HTTP port (default 3000). |
| `NODE_ENV` | optional | Set to `production` for `Secure` cookies. |

After the first successful boot the admin row is in the database. You can **remove** `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` from the environment and change the password from the UI at `/admin/password`.

---

## Deploying to Coolify

1. **Create a new application** from this Git repository in Coolify. Build pack: **Dockerfile**.
2. **Persistent storage** &mdash; add a volume mount:
   - Source path: `modsblox-data`
   - Container path: `/app/data`
3. **Environment variables** &mdash; paste in everything from `.env.example` and fill the secrets in:
   - `SESSION_SECRET` (generate: `openssl rand -base64 64`)
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH` (run `npm run hash -- 'YourPassword'` locally)
   - `ADBLUEMEDIA_USER_ID` = `47937`
   - `ADBLUEMEDIA_API_KEY` = `aae3663b2d691169b7643a13f62685f5`
   - `OGADS_API_KEY` = `43416|GXVuq8tXEe0RyMb0KEhmmF0utgGKh2z9vQLdSJbld9461413`
   - `NODE_ENV` = `production`
4. Publish the container on port **3000**, point your Coolify domain at it, and deploy.
5. Browse to `https://your-domain/admin`, sign in, then:
   - Go to **Settings** to pick the offer provider (AdBlueMedia or OGAds) and the min/max offer count.
   - Go to **Scripts** to add / edit / delete games and their hub lists.
   - Go to **Password** to rotate the admin password.
6. After sign-in works, delete the `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` env vars in Coolify to reduce attack surface.

---

## Project layout

```
server.js                Entry point (security middleware, routes wiring, seed runner)
src/
  db.js                  SQLite connection, settings KV
  seed.js                Default scripts, settings and admin bootstrap on first boot
  auth.js                bcrypt + session + CSRF helpers
  offers.js              AdBlueMedia + OGAds providers with normalised output
  routes/
    public.js            / and /s/:slug pages
    api.js               /api/offers (rate-limited)
    admin.js             /admin/* secured CRUD
views/                   EJS templates
public/                  Static assets served under /static (images, admin.css)
data/                    (runtime) SQLite DB, sessions DB, uploaded icons
scripts-cli/hash-password.js   Helper: generate a bcrypt hash
```

---

## Security checklist

- [x] All secrets from env, never the DB (offer API keys, session secret).
- [x] Admin passwords hashed with bcrypt (12 rounds).
- [x] Sessions in SQLite, rotated on login to defeat fixation, `httpOnly` + `sameSite=lax`, `Secure` in production.
- [x] Double-submit CSRF token on every state-changing admin route.
- [x] `express-rate-limit` on login (10 / 15 min) and offers API (60 / min).
- [x] Helmet CSP locks down `default-src`, `frame-ancestors`, `object-src`, etc.
- [x] SQL via parameterised better-sqlite3 statements.
- [x] User uploads size-limited (2 MB) and mime-validated.
- [x] No stack traces leak to users on errors.
- [x] Session cookie rotated on password change + forced re-login.
- [x] Legacy static HTML files removed &mdash; only data-driven pages are served.
