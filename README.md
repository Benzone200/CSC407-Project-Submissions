# Mah's Estates — Apartment Management

A Next.js App Router application for property managers, maintenance staff and tenants. The deployed website contains **no seeded tenants, property records, leases, payments, maintenance tickets, notices or visitors**. All workspace records are loaded from the application's Postgres database.

## Live account flow

1. A tenant registers with their name, email, password and optional emergency contact.
2. The server validates the submitted fields, hashes the password with bcrypt (cost 12), creates a TENANT account and starts a secure database-backed session.
3. The new tenant immediately appears in the manager's tenant directory. No lease is required to appear in that list. The newest registrations appear first, and open workspaces refresh on focus and every 30 seconds.
4. The tenant initially sees an unassigned unit and no rent schedule. A manager creates the property's real units and assigns a lease. Registration never creates a fictional property, occupied unit, balance or payment.
5. Rent schedules, receipts, requests, notices and visitor entries appear as the corresponding authorized activities are recorded.

There is no role switcher or public manager account. Legacy `/demo/*` links redirect to sign-in. The app removes obsolete browser-local demonstration records when a page loads. Existing authentication cookie identifiers remain stable.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase Postgres with the pg server driver, Drizzle ORM, Zod 4, bcryptjs, Vitest and Playwright. Node 24 LTS. Resolved dependencies are pinned in `package-lock.json`.

## Database and initial setup

A dedicated Supabase database must be connected to Vercel project `haven-university-apartments` before real account creation can work. The product name is Mah's Estates; the existing project identifier and domain are retained.

1. Provision a dedicated Supabase project through the connected Supabase integration. Connect it to this Vercel project; do not reuse another application's database.
2. Set server-only `DATABASE_URL` to the Supabase server-side Postgres pooler connection string, using the project's privileged database role, never an anon/publishable key. Set `APP_ORIGIN` to the exact site origin. The current production origin is `https://haven-university-apartments.vercel.app`.
3. Use `vercel env pull .env.local` to securely obtain local variables for the linked project, or supply them through the execution environment. Never commit secrets.
4. Run `npm ci`, then `npm run db:migrate` to apply the committed migration. Builds do not migrate or seed databases.
5. Supply `ADMIN_EMAIL` and a unique strong `ADMIN_PASSWORD` through the trusted local environment and run `npm run db:seed`. This creates an administrator only; it never adds tenant or transaction fixtures and never promotes an existing account. Optional `STAFF_EMAIL` and `STAFF_PASSWORD` create staff. Remove bootstrap credentials after use.
6. Deploy or redeploy the reviewed source after setting environment variables. Use `npm run dev` locally after project linking and environment setup.

There are no default administrator credentials. Public registration always creates a TENANT. A missing or unmigrated database makes account services unavailable; the app does not fall back to local browser accounts or invented records. `/api/health` returns 200 only if account storage can be queried; otherwise it returns 503.

## Routes

- Public: `/`, `/home`, `/login`, `/register`, `/security`.
- Signed-in accounts: `/dashboard`, `/profile`, `/properties`, `/units`, `/leases`, `/payments`, `/maintenance`, `/notices`, `/visitors`.
- Manager-only directory and administration: `/tenants`, `/admin`.
- Manager-only university project documentation: `/testing`, `/review`.
- Legacy `/demo/*`: redirects to sign-in; no demonstration workspace remains.

## Operational behavior

Properties and units support descriptions, HTTPS photo URLs, floor/type/rent/status filters and pagination. Units become occupied through lease assignment. The tenant directory includes registered tenants before lease assignment. A move-out closes the lease and vacates the unit.

Manual payment records use unique references and integer USD amounts. Rent is due on the first of the month, or the first lease start date for the initial month. Partial payments reduce balances. Receipts are ownership-scoped downloads. No card details or payment gateway are used.

Tenants submit maintenance requests and comments, read relevant notices, and pre-register visitors. Staff manage requests and visitor transitions. All mutations validate role and ownership on the server.

List APIs paginate at 10 rows. Manager select controls are bounded to 200 eligible options. Dashboard and property counts query real database aggregates; they do not infer totals from the first page. The rent chart shows the selected month's actual records, with no invented historical series. Larger operations should replace bounded selectors with searchable autocomplete.

## Security and verification

Security controls include bcrypt12, high-entropy hashed session tokens, HttpOnly/Secure/SameSite host-only production cookies, strict Zod schemas, server-side role and ownership checks, parameterized Drizzle queries, configured-origin checks, bounded JSON bodies, shared Postgres rate limits, nonce CSP, security headers and transactional audit writes.

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
npm audit --omit=dev --audit-level=moderate
```

Vitest exercises validation, request boundaries, role policies, tenant ownership SQL and registration persistence at a mocked database boundary. Playwright verifies the public website, absence of sample records, obsolete-route redirects, authentication gates, browser cleanup, responsive layouts and security headers. Mocked tests are not evidence of a successful Supabase connection. Production Supabase connectivity and ordinary-tenant authentication were verified; see `docs/VERIFICATION.md` for evidence and remaining privileged checks.

## Production review

See `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/REVIEW.md` and `docs/VERIFICATION.md`. Email verification, password recovery, MFA, monitoring/alerts, backup restoration, retention automation and an independent security/accessibility review remain operational release requirements. Removing demonstration data does not certify these requirements or make an unconnected database operational.

## Supabase table security

The committed second migration enables row-level security on every application table and revokes direct table access from PUBLIC, anon and authenticated. No browser Supabase SDK or public key is used: account and tenant data travel through the existing session-checked Next.js API. Apply both migrations before enabling registration. The server connection must own the application tables (the Supabase project postgres role is suitable) or otherwise have the explicitly required server privileges. Keep that credential server-only. See docs/SUPABASE_SETUP.md.
