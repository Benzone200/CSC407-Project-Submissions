# MarketHub — Test Report

Generated: 2026-11-17T10:04:21.824Z

**63 passed · 0 failed · 63 total**

| # | Test | Result |
|---|------|--------|
| 1 | GET /api/health returns ok | PASS |
| 2 | GET /api/products lists seeded products | PASS |
| 3 | Search filters products by keyword | PASS |
| 4 | Category filter works | PASS |
| 5 | Price range filter works | PASS |
| 6 | Sorting by price ascending works | PASS |
| 7 | GET /api/products/:id returns a single product | PASS |
| 8 | GET /api/products/:id with unknown id returns 404 | PASS |
| 9 | GET /api/products/:id with non-numeric id returns 400 | PASS |
| 10 | Register a new user succeeds (201) and returns no password data | PASS |
| 11 | Duplicate email registration returns 409 | PASS |
| 12 | Login with wrong password returns 401 (generic message) | PASS |
| 13 | Login with unknown email returns the same generic 401 | PASS |
| 14 | GET /api/auth/me returns the logged-in user | PASS |
| 15 | GET /api/auth/me without a session returns 401 | PASS |
| 16 | Seeded admin can log in and has role admin | PASS |
| 17 | Second user registers for access-control tests | PASS |
| 18 | Registration rejected: invalid email format | PASS |
| 19 | Registration rejected: password too short | PASS |
| 20 | Registration rejected: password without a number | PASS |
| 21 | Registration rejected: password without a letter | PASS |
| 22 | Registration rejected: missing name | PASS |
| 23 | Registration rejected: name too short | PASS |
| 24 | Registration rejected: oversized name | PASS |
| 25 | Admin product creation rejects negative price | PASS |
| 26 | Admin product creation rejects missing name | PASS |
| 27 | Admin product creation rejects non-http image URL | PASS |
| 28 | SQL injection in login is neutralized (401, no bypass) | PASS |
| 29 | SQL injection in search does not damage the database | PASS |
| 30 | SQL injection in registration is stored as inert data | PASS |
| 31 | XSS payload in product name is stored but output-encoded by the client | PASS |
| 32 | State-changing request without CSRF token returns 403 | PASS |
| 33 | State-changing request with wrong CSRF token returns 403 | PASS |
| 34 | Unauthenticated access to admin endpoints returns 401 | PASS |
| 35 | Non-admin user accessing admin endpoints returns 403 | PASS |
| 36 | Session cookie is HttpOnly | PASS |
| 37 | Security headers are present (CSP, nosniff, frame protection, HSTS) | PASS |
| 38 | Checkout creates an order and decrements stock | PASS |
| 39 | Checkout with empty cart returns 400 | PASS |
| 40 | Checkout beyond available stock returns 400 | PASS |
| 41 | Unauthenticated checkout returns 401 | PASS |
| 42 | Users only see their own orders (access control) | PASS |
| 43 | Admin can list all orders and update status | PASS |
| 44 | Admin order status update rejects invalid status | PASS |
| 45 | Profile update works | PASS |
| 46 | Change password rejects wrong current password | PASS |
| 47 | Change password works and new password can log in | PASS |
| 48 | Admin can create, update and delete a product | PASS |
| 49 | Deleting a product that appears in orders is blocked (409) | PASS |
| 50 | Admin can promote a user to admin and demote back | PASS |
| 51 | Admin cannot change their own role or delete themselves | PASS |
| 52 | Logout invalidates the session | PASS |
| 53 | Malformed JSON body returns 400 (not a crash) | PASS |
| 54 | Unknown API route returns JSON 404 | PASS |
| 55 | Oversized payload returns 413 | PASS |
| 56 | Rate limiting kicks in after repeated failed logins (429) | PASS |
| 57 | Passwords are stored as bcrypt hashes, never plaintext | PASS |
| 58 | Seeded admin exists with role admin | PASS |
| 59 | Foreign keys are enforced | PASS |
| 60 | Sessions are stored server-side in the database | PASS |
| 61 | HTML includes a viewport meta tag for mobile | PASS |
| 62 | CSS contains responsive breakpoints | PASS |
| 63 | Frontend uses textContent/escaping for user data (XSS-safe rendering) | PASS |

Run with `npm test`. The suite boots the real server against a throwaway SQLite database and exercises it over HTTP.
