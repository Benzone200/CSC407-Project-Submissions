# Newsroom — Publishing Management System

A complete publishing platform: a public news website, an admin dashboard for editors, and a REST API, backed by SQLite (libSQL / Turso).

| | |
|---|---|
| **Name** | West Tamuno-Dein Emmanuel |
| **Matric No.** | 23/SCI01/159 |
| **Live site** | https://the-chronicles-kappa.vercel.app/ |

## Run it locally

Requires Node.js 18 or newer. Nothing to configure: a database file is created in `data/` and uploads go to `uploads/`.

```bash
npm install
npm run seed     # optional: sample articles and demo accounts
npm start        # http://localhost:3000
```

- Public site: `http://localhost:3000`
- Admin dashboard: `http://localhost:3000/admin/` (or the **Staff sign in** button in the site header)

Demo accounts created by `npm run seed` (local only):

| Role   | Email                   | Password       |
|--------|-------------------------|----------------|
| Admin  | admin@newsroom.local    | ChangeMe123!   |
| Editor | editor@newsroom.local   | Editor123!     |

`npm test` runs an automated end-to-end check (23 assertions).

## Deploy to Vercel (free, permanent storage)

Vercel has no permanent disk, so the app uses two free services for data: **Turso** (database) and **Vercel Blob** (images).

**1. Database (Turso)**
1. Create a free account at turso.tech, then create a database.
2. Copy its URL (`libsql://…`) and create an auth token for it.

**2. Put the code on GitHub** and import the repository in Vercel (Add New → Project). No build settings are needed.

**3. Image storage:** in the Vercel project, open Storage → Create → Blob and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN` automatically.

**4. Environment variables** (Project → Settings → Environment Variables):

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | your `libsql://…` URL |
| `TURSO_AUTH_TOKEN` | your Turso token |
| `ADMIN_EMAIL` | the admin login email |
| `ADMIN_PASSWORD` | a strong password (used once, to create the first admin) |
| `NODE_ENV` | `production` |

**5. Deploy.** The first visit creates the admin account and the tables.

**6. Optional sample content:** run once from your computer, using the same Turso values:
```bash
# macOS / Linux
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... ADMIN_PASSWORD=... npm run seed
# Windows PowerShell
$env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="..."; $env:ADMIN_PASSWORD="..."; npm run seed
```
Seeding is safe to repeat; it only fills empty tables, and it never creates the demo editor account on a hosted database.

**Migrate existing local content:** after opening the deployed site once so it has an active admin, put `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and (if articles use local uploads) `BLOB_READ_WRITE_TOKEN` in your ignored local `.env` file. Run `npm run migrate:turso` for a dry run, then `npm run migrate:turso -- --apply` to import. The importer keeps article statuses, categories and authors, uploads referenced local images to Blob, and leaves the local database untouched. It reuses matching Turso users; missing authors are created as inactive accounts, and it refuses to overwrite articles with matching slugs. It does not migrate login sessions.

Notes: uploads are limited to 4 MB (Vercel's request size limit). The seed articles link to photos on Unsplash.

## Features

**Public site**
- Front page with lead story, latest, more stories, most read and per-section blocks
- Category pages with pagination, article pages with reading time and related stories
- Search, RSS feed (`/rss.xml`), sitemap, robots.txt, Open Graph tags
- Responsive layout, mobile menu, skip link and keyboard focus styles

**Admin dashboard**
- Sign-in with secure session cookies
- Dashboard: totals, recently updated, most read
- Articles: create, edit, delete, search, filter by status/category
- Rich-text editor (headings, bold/italic, lists, quotes, links, inline images)
- Draft / Published / Scheduled (future publish date), featured flag, cover image with caption, editable URL slug
- Preview of drafts and scheduled stories while signed in
- Categories (admin), users and roles (admin), site name/tagline/footer, change password

**Roles**
- *Administrator*: everything
- *Editor*: can write and manage their own articles only

## Security notes

- Passwords hashed with bcrypt; sessions stored server-side as hashes; HttpOnly + SameSite cookies
- Login rate limiting; CSRF protection via required request header on all writes
- Article HTML is sanitised on save (whitelist of tags); all other output is escaped
- Uploads limited to JPG/PNG/WebP/GIF, 4 MB, verified by file signature, renamed on save
- Content-Security-Policy and other security headers on every response

## Project layout

```
server.js              app entry
src/db.js              libSQL/SQLite schema and settings
src/storage.js         image storage (Vercel Blob or local folder)
api/index.js           Vercel serverless entry
vercel.json            Vercel routing
src/auth.js            sessions, roles, CSRF, rate limit
src/routes/api.js      REST API (/api/...)
src/routes/public.js   public pages, RSS, sitemap
src/views.js           HTML templates for the public site
public/css/site.css    public design
public/admin/          admin single-page app (index.html, app.js, admin.css)
scripts/seed.js        sample content
scripts/smoke-test.js  automated checks
data/                  SQLite database (created on first run)
uploads/               uploaded images
```

## API summary

All write requests need the header `X-Requested-With: fetch` and a signed-in session.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/logout` | |
| GET | `/api/auth/me` | current user |
| GET/POST | `/api/articles` | list (filters: `status`, `category`, `q`, `page`) / create |
| GET/PUT/PATCH/DELETE | `/api/articles/:id` | PATCH publishes/unpublishes/features |
| GET/POST/PUT/DELETE | `/api/categories` | writes: admin only |
| GET/POST/PUT/DELETE | `/api/users` | admin only |
| GET/PUT | `/api/settings` | PUT: admin only |
| POST | `/api/upload` | multipart field `file` |
| GET | `/api/stats` | dashboard numbers |
