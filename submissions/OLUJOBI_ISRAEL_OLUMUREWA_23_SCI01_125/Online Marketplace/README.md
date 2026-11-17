# MarketHub — Secure Online Marketplace

A complete full-stack online marketplace built with **Node.js + Express + SQLite** on the backend and a
**responsive single-page application** (vanilla HTML/CSS/JS) on the frontend. It demonstrates professional
web development practices with a strong emphasis on **web application security**, plus an automated test
suite covering functional, validation, security, error-handling, database, and usability testing.

---

## Features

### Frontend (User Interface)
- **Home / Dashboard** — product grid with hero search, category filter chips, price-range filter and sorting
- **Registration & Login pages** — with client-side validation and inline error messages
- **User profile** — view/edit name, change password, order history
- **Navigation menu** — sticky header, mobile hamburger menu, user dropdown, cart badge
- **Data-entry forms** — checkout form, admin product form, profile forms
- **Search / filter functionality** — keyword search, category, min/max price, sort by price/name/newest
- **Shopping cart** — add/remove/quantity controls, order summary, persisted in `localStorage`
- **Checkout & orders** — place orders, track order status
- **Admin dashboard** — product CRUD, order management (status updates), user management (role changes, deletion)
- **Security page** — in-app documentation of every security measure implemented
- **Testing page** — live results from the automated test suite
- **Responsive design** — fluid grid, breakpoints at 900px and 600px; works on phones and computers

### Backend
- REST API with JSON responses (`/api/...`)
- SQLite database with users, products, orders, order items, and server-side sessions
- Seed data: 10 products and two demo accounts

---

## Demo Accounts

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | `admin@markethub.com`  | `Admin123!` |
| User  | `demo@markethub.com`   | `Demo123!`  |

> ⚠️ Change these credentials before any real deployment.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Install & Run

```bash
cd marketplace
npm install
npm start
```

Then open **http://localhost:3000**

The database (`marketplace.db`) is created and seeded automatically on first run.

### Run the Tests

```bash
npm test
```

This boots the real server against a throwaway database, runs **63 automated tests** over HTTP, and writes
results to `public/test-results.json` (shown on the in-app *Testing* page) and `TESTING.md`.

### Configuration (`.env`)

Copy `.env.example` to `.env` and adjust:

| Variable          | Purpose                                                        |
|-------------------|----------------------------------------------------------------|
| `PORT`            | Server port (default 3000)                                     |
| `NODE_ENV`        | Set to `production` to enable `Secure` cookies                 |
| `SESSION_SECRET`  | Long random secret for signing sessions (**required in prod**) |
| `DB_PATH`         | SQLite file location                                           |
| `BCRYPT_ROUNDS`   | Password hashing cost (default 12)                             |
| `AUTH_RATE_LIMIT` | Max auth attempts per IP per 15 min (default 30)               |
| `HTTPS_KEY` / `HTTPS_CERT` | PEM files to enable built-in HTTPS                     |

---

## Security Implementation

| Measure | How it's implemented |
|---|---|
| **Password hashing** | bcrypt (cost 12) with per-password salt; plaintext is never stored or returned |
| **Authentication** | Login/logout with generic error messages (no account enumeration); session ID regenerated on login (fixation protection) |
| **Session management** | Server-side storage in SQLite; `HttpOnly`, `SameSite=Lax`, 24h expiry cookies; `Secure` flag in production |
| **Role-based access control** | `user` / `admin` roles enforced by `requireAuth` / `requireAdmin` middleware on every route; order queries scoped to the session user |
| **SQL injection protection** | Parameterized queries (`?` placeholders) everywhere; whitelisted sort columns; LIKE wildcards escaped |
| **XSS protection** | Strict Content-Security-Policy (no inline scripts), output encoding (`escapeHtml`) for all dynamic content, `HttpOnly` cookies |
| **CSRF protection** | Per-session synchronizer tokens required on all POST/PUT/DELETE requests, compared in constant time |
| **Input validation** | Server-side validation of every field: email format, password policy, length limits, numeric ranges, enum whitelists, 100 KB body limit |
| **Brute-force protection** | Rate limiting on auth endpoints (30 attempts / IP / 15 min) |
| **Security headers** | Helmet: CSP, HSTS, `X-Content-Type-Options`, frame-ancestors (clickjacking), etc. |
| **Sensitive data handling** | Password hashes never selected/returned; generic error messages; secrets via environment variables; no stack traces to clients |
| **HTTPS** | Built-in TLS support via `HTTPS_KEY`/`HTTPS_CERT`, or deploy behind a reverse proxy (Nginx + Let's Encrypt) |

See the in-app **Security** page for a detailed explanation with code references.

---

## Testing

The suite (`tests/run-tests.js`) covers:

- **Functional testing** — browsing, search, filters, sorting, checkout, stock decrement, order history, admin CRUD
- **Login / registration testing** — valid/invalid credentials, duplicate accounts, logout, session persistence
- **Form validation testing** — email format, password policy, required fields, numeric ranges, payload limits
- **Security testing** — SQL-injection attempts (login, search, registration), XSS payloads, missing/wrong CSRF tokens, unauthenticated (401) and unauthorized (403) access, cookie flags, security headers, rate limiting (429)
- **Error handling** — malformed JSON (400), unknown routes (404), oversized payloads (413)
- **Database testing** — bcrypt hashes at rest, seeded roles, foreign-key integrity, server-side sessions
- **Usability / responsive testing** — viewport meta tag, CSS breakpoints, fluid grid, XSS-safe rendering patterns

**Latest result: 63 passed, 0 failed.** See `TESTING.md` for the full report.

---

## Project Structure

```
marketplace/
├── server.js            # Express app: security middleware, API routes, access control
├── db.js                # SQLite schema, session store, seed data
├── public/
│   ├── index.html       # SPA shell (header, nav, footer)
│   ├── styles.css       # Responsive stylesheet
│   ├── app.js           # Frontend logic (routing, views, cart, admin)
│   └── test-results.json# Generated by the test suite
├── tests/
│   └── run-tests.js     # Automated test suite (npm test)
├── TESTING.md           # Generated test report
├── .env.example         # Configuration template
└── package.json
```

## API Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |
| GET | `/api/csrf-token` | Public | Get CSRF token for the session |
| POST | `/api/auth/register` | Public | Create account (auto-login) |
| POST | `/api/auth/login` | Public | Log in |
| POST | `/api/auth/logout` | Public | Log out |
| GET | `/api/auth/me` | Public | Current user (401 if logged out) |
| GET/PUT | `/api/profile` | User | View / update profile |
| POST | `/api/profile/change-password` | User | Change password |
| GET | `/api/products` | Public | List with `search`, `category`, `sort`, `minPrice`, `maxPrice` |
| GET | `/api/products/:id` | Public | Product detail |
| POST/PUT/DELETE | `/api/products[/:id]` | **Admin** | Product management |
| POST | `/api/orders` | User | Checkout |
| GET | `/api/orders` | User | Own orders |
| GET | `/api/admin/orders` | **Admin** | All orders |
| PUT | `/api/admin/orders/:id/status` | **Admin** | Update order status |
| GET | `/api/admin/users` | **Admin** | List users |
| PUT | `/api/admin/users/:id/role` | **Admin** | Change role |
| DELETE | `/api/admin/users/:id` | **Admin** | Delete user |

All state-changing requests require the `X-CSRF-Token` header.
