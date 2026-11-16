# Conference Management System

A complete, working **conference management system** built for the coursework topic
*"Web Application Security"*. It implements a full conference workflow — browsing the
programme, reserving seats, managing your schedule, and an admin back-office — with
security engineered in as a first-class requirement and documented in-app (`/security`)
and in this README.

> **Stack:** Python 3 · Flask 3 · SQLite (parameterised queries) · Jinja2 (autoescaping) · vanilla CSS/JS (no inline code → strict CSP)

---

## Quick start

```bash
pip install -r requirements.txt
python app.py
# open http://127.0.0.1:5000
```

The SQLite database is created and seeded automatically on first run into `instance/conference.db`.

### Demo accounts (seeded)

| Role     | Email               | Password     |
|----------|---------------------|--------------|
| Admin    | `admin@example.com` | `Admin@2026!` |
| Attendee | `ada@example.com`   | `Demo@2026!`  |
| Attendee | `chidi@example.com` | `Demo@2026!`  |

### Configuration (environment variables)

| Variable        | Default                  | Purpose |
|-----------------|--------------------------|---------|
| `SECRET_KEY`    | *ephemeral random key*   | Flask session signing key. Set it in production or sessions reset on restart. |
| `DATABASE`      | `instance/conference.db`  | SQLite file path |
| `COOKIE_SECURE` | `0`                      | Set to `1` behind HTTPS. Side-effect: the session cookie becomes `SameSite=None; Secure` (required for cross-site iframe previews — `Lax` cookies are not sent on POST there) |
| `COOKIE_SAMESITE` | `None` if `COOKIE_SECURE=1`, else `Lax` | Override the cookie SameSite policy explicitly |
| `TRUST_PROXY`   | `0`                      | Set to `1` behind a TLS-terminating reverse proxy (enables `X-Forwarded-*` handling and HSTS) |
| `PORT`          | `5000`                   | Port for `python app.py` |

---

## Features

**Frontend / UI**
- Home/dashboard with hero, live stats and featured sessions
- Registration & login pages, user profile with "security at a glance"
- Full programme browser with **search + track/day filters**
- Responsive layout (desktop, tablet, phone) with collapsible navigation
- My Schedule page, seat-capacity progress bars, flash messaging

**Conference domain**
- Sessions with tracks, days, rooms, times, capacities
- Seat reservation with capacity enforcement and duplicate-booking prevention
- Admin back-office: dashboard (stats + most-popular chart + recent activity),
  session CRUD, per-session attendee lists, **CSV export**, read-only user directory

## Web Application Security (the major section)

### What is demonstrated, and where

| # | Control | Evidence in code |
|---|---------|------------------|
| 1 | **Authentication** (login/logout, session-based) | `app.py` → `login()`, `logout()`; generic errors, no user enumeration |
| 2 | **Password hashing** | `security.py` → Werkzeug **scrypt + per-user salt** (`generate_password_hash`); hashes only in DB; never displayed/logged |
| 3 | **Role-based access (Admin/User)** | `security.py` → `@login_required`, `@admin_required`; `role` column with `CHECK (role IN ('admin','attendee'))`; server-side on every route |
| 4 | **Input validation** | `security.py` → email regex, length caps, password policy; `app.py` → `parse_session_form()` whitelists track/day, strict `HH:MM`, `end > start` DB CHECK, bounded integer capacity |
| 5 | **SQL injection protection** | 100% parameterised queries; never f-strings in SQL; search uses `LIKE … ESCAPE '\'` with escaped wildcards (`security.py → escape_like`) |
| 6 | **Cross-Site Scripting (XSS) protection** | Jinja2 autoescaping everywhere; **zero** `\|safe` on user data; strict CSP `script-src 'self'`; no inline scripts/handlers; favicon & assets self-hosted |
| 7 | **Session management** | `HttpOnly` cookies, 30-minute expiry (`PERMANENT_SESSION_LIFETIME`), **session-id rotation on login** (fixation defence), `session.clear()` on logout/password change. `SameSite=Lax` locally; `SameSite=None; Secure` behind HTTPS/iframe previews |
| 8 | **Access-control checks / IDOR** | Owner-scoped queries only; no user ids in self-service URLs; `safe_next()` blocks open redirects on `?next=` |
| 9 | **Brute-force protection** | 5 failed attempts → 15-minute lockout (`failed_logins`, `locked_until` columns, reset on success); dummy-hash timing equalisation for unknown emails |
| 10 | **CSRF protection** | Synchroniser-token pattern; global `before_request` rejects missing/invalid tokens with **400** on every POST; constant-time `hmac.compare_digest` |
| 11 | **Secure handling of sensitive info** | `SECRET_KEY` from env (ephemeral fallback); generic error pages (no stack traces); hashes/secrets never shown; CSV export neutralises spreadsheet formula injection (`= + - @`) |
| 12 | **HTTPS / security headers** | `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS when behind TLS; 1 MB request cap |
| 13 | **Database integrity** | `PRAGMA foreign_keys = ON`, `UNIQUE(user_id, session_id)`, FK cascades, CHECK constraints |

An in-app walkthrough lives at **`/security`** (linked in the footer) — useful as a demo talking-point.

### Try the attacks (safe experiments)

These are educational checks you can run yourself:

1. **SQLi** — in the login form, enter `admin@example.com' -- ` or `' OR '1'='1` as the email.
   It simply fails validation/login; the query is parameterised so the payload is inert.
2. **XSS** — set your bio to `<script>alert(1)</script>` and view your profile.
   The payload renders as harmless text; `view-source` shows `&lt;script&gt;…`.
3. **CSRF** — `curl -X POST http://127.0.0.1:5000/logout` without a token → **400**.
4. **Privilege escalation** — log in as an attendee and open `/admin` → **403**.
5. **Brute force** — 5 wrong passwords on any account → account locks for 15 minutes.
6. **Open redirect** — `/login?next=https://evil.example.com` → after login you land on `/`, not the external URL.

## Project layout

```
conference-management-system/
├── app.py               # routes, app config, security headers, CSRF hook
├── db.py                # connection helpers, schema init, demo seed data
├── security.py          # hashing, CSRF tokens, RBAC decorators, validators
├── schema.sql           # users / sessions / registrations (FK, UNIQUE, CHECK)
├── static/              # style.css, app.js (CSP-safe), hero.jpg, favicon.svg
├── templates/           # Jinja2 (autoescaped) — 16 templates
├── instance/            # conference.db (git-ignored)
├── requirements.txt
└── README.md
