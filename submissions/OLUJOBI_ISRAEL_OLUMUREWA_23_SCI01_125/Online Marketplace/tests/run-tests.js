// tests/run-tests.js — Automated test suite for MarketHub
//
// Runs the REAL server against a throwaway SQLite database and exercises it
// over HTTP. Covers: functional testing, login/registration testing, form
// validation testing, security testing (SQLi, XSS, CSRF, access control,
// headers, rate limiting), error handling, database testing, and static
// usability/responsive checks.
//
// Usage:  npm test
// Output: console report + public/test-results.json + TESTING.md

const fs = require('fs');
const path = require('path');

// --- Test environment (must be set BEFORE requiring the server) ---
const DB_PATH = path.join(__dirname, 'test.db');
for (const suffix of ['', '-wal', '-shm']) {
  try { fs.unlinkSync(DB_PATH + suffix); } catch { /* fresh start */ }
}
process.env.DB_PATH = DB_PATH;
process.env.BCRYPT_ROUNDS = '4';        // fast hashing for tests only
process.env.AUTH_RATE_LIMIT = '60';     // generous; rate-limit test loops until 429
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

const app = require('../server');
const { db } = require('../db');

// --- Tiny test framework ---
const results = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.log(`  ✗ ${name}\n      → ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
function assertEq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'values differ'} (expected ${expected}, got ${actual})`);
}

// --- HTTP client with cookie jar + CSRF helper ---
let PORT;
class Client {
  constructor() { this.cookie = ''; this.csrfToken = null; }
  async req(method, p, body, extraHeaders = {}) {
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (this.cookie) headers.Cookie = this.cookie;
    if (method !== 'GET' && this.csrfToken) headers['X-CSRF-Token'] = this.csrfToken;
    const res = await fetch(`http://127.0.0.1:${PORT}${p}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    // After login/register the server issues a fresh CSRF token bound to the
    // new session — refresh ours, exactly like the real frontend does.
    if ((p === '/api/auth/login' || p === '/api/auth/register') && (res.status === 200 || res.status === 201)) {
      const t = await this.req('GET', '/api/csrf-token');
      this.csrfToken = t.data.csrfToken;
    }
    return { status: res.status, data, headers: res.headers };
  }
  async csrf() {
    const r = await this.req('GET', '/api/csrf-token');
    this.csrfToken = r.data.csrfToken;
    return this.csrfToken;
  }
}

const server = app.listen(0, async () => {
  PORT = server.address().port;
  console.log(`\nMarketHub test suite — server on http://127.0.0.1:${PORT}\n`);

  const anon = new Client();
  const userA = new Client();
  const userB = new Client();
  const admin = new Client();
  let productId = null;
  let orderId = null;

  try {
    // ================================================================
    // FUNCTIONAL TESTING — browsing, search, filters
    // ================================================================
    console.log('Functional testing — browsing & search');

    await test('GET /api/health returns ok', async () => {
      const r = await anon.req('GET', '/api/health');
      assertEq(r.status, 200);
      assertEq(r.data.status, 'ok');
    });

    await test('GET /api/products lists seeded products', async () => {
      const r = await anon.req('GET', '/api/products');
      assertEq(r.status, 200);
      assert(Array.isArray(r.data.products) && r.data.products.length >= 8, 'expected seeded products');
      assert(Array.isArray(r.data.categories) && r.data.categories.length >= 3, 'expected categories');
    });

    await test('Search filters products by keyword', async () => {
      const r = await anon.req('GET', '/api/products?search=keyboard');
      assertEq(r.status, 200);
      assert(r.data.products.length >= 1, 'expected a match');
      assert(r.data.products.every((p) => /keyboard/i.test(p.name + ' ' + p.description)), 'all results should match');
    });

    await test('Category filter works', async () => {
      const r = await anon.req('GET', '/api/products?category=Electronics');
      assertEq(r.status, 200);
      assert(r.data.products.length >= 1);
      assert(r.data.products.every((p) => p.category === 'Electronics'));
    });

    await test('Price range filter works', async () => {
      const r = await anon.req('GET', '/api/products?minPrice=50&maxPrice=100');
      assertEq(r.status, 200);
      assert(r.data.products.every((p) => p.price >= 50 && p.price <= 100));
    });

    await test('Sorting by price ascending works', async () => {
      const r = await anon.req('GET', '/api/products?sort=price_asc');
      const prices = r.data.products.map((p) => p.price);
      const sorted = [...prices].sort((a, b) => a - b);
      assertEq(JSON.stringify(prices), JSON.stringify(sorted));
    });

    await test('GET /api/products/:id returns a single product', async () => {
      const list = await anon.req('GET', '/api/products');
      productId = list.data.products[0].id;
      const r = await anon.req('GET', `/api/products/${productId}`);
      assertEq(r.status, 200);
      assertEq(r.data.product.id, productId);
    });

    await test('GET /api/products/:id with unknown id returns 404', async () => {
      const r = await anon.req('GET', '/api/products/999999');
      assertEq(r.status, 404);
    });

    await test('GET /api/products/:id with non-numeric id returns 400', async () => {
      const r = await anon.req('GET', '/api/products/abc');
      assertEq(r.status, 400);
    });

    // ================================================================
    // REGISTRATION & LOGIN TESTING
    // ================================================================
    console.log('\nLogin / registration testing');

    await test('Register a new user succeeds (201) and returns no password data', async () => {
      await userA.csrf();
      const r = await userA.req('POST', '/api/auth/register', {
        name: 'Test User A', email: 'usera@test.com', password: 'Password1',
      });
      assertEq(r.status, 201);
      assertEq(r.data.user.email, 'usera@test.com');
      assert(!('password_hash' in r.data.user) && !('password' in r.data.user), 'password must never be returned');
    });

    await test('Duplicate email registration returns 409', async () => {
      const r = await userA.req('POST', '/api/auth/register', {
        name: 'Copy Cat', email: 'usera@test.com', password: 'Password1',
      });
      assertEq(r.status, 409);
    });

    await test('Login with wrong password returns 401 (generic message)', async () => {
      const c = new Client(); await c.csrf();
      const r = await c.req('POST', '/api/auth/login', { email: 'usera@test.com', password: 'WrongPass9' });
      assertEq(r.status, 401);
      assert(/invalid email or password/i.test(r.data.error));
    });

    await test('Login with unknown email returns the same generic 401', async () => {
      const c = new Client(); await c.csrf();
      const r = await c.req('POST', '/api/auth/login', { email: 'nobody@test.com', password: 'Password1' });
      assertEq(r.status, 401);
      assert(/invalid email or password/i.test(r.data.error));
    });

    await test('GET /api/auth/me returns the logged-in user', async () => {
      const r = await userA.req('GET', '/api/auth/me');
      assertEq(r.status, 200);
      assertEq(r.data.user.email, 'usera@test.com');
    });

    await test('GET /api/auth/me without a session returns 401', async () => {
      const r = await anon.req('GET', '/api/auth/me');
      assertEq(r.status, 401);
    });

    await test('Seeded admin can log in and has role admin', async () => {
      await admin.csrf();
      const r = await admin.req('POST', '/api/auth/login', { email: 'admin@markethub.com', password: 'Admin123!' });
      assertEq(r.status, 200);
      assertEq(r.data.user.role, 'admin');
    });

    await test('Second user registers for access-control tests', async () => {
      await userB.csrf();
      const r = await userB.req('POST', '/api/auth/register', {
        name: 'Test User B', email: 'userb@test.com', password: 'Password1',
      });
      assertEq(r.status, 201);
    });

    // ================================================================
    // FORM VALIDATION TESTING
    // ================================================================
    console.log('\nForm validation testing');

    const validationCases = [
      ['invalid email format', { name: 'X Y', email: 'not-an-email', password: 'Password1' }, 400],
      ['password too short', { name: 'X Y', email: 'v1@test.com', password: 'Ab1' }, 400],
      ['password without a number', { name: 'X Y', email: 'v2@test.com', password: 'PasswordOnly' }, 400],
      ['password without a letter', { name: 'X Y', email: 'v3@test.com', password: '12345678' }, 400],
      ['missing name', { email: 'v4@test.com', password: 'Password1' }, 400],
      ['name too short', { name: 'A', email: 'v5@test.com', password: 'Password1' }, 400],
      ['oversized name', { name: 'x'.repeat(500), email: 'v6@test.com', password: 'Password1' }, 400],
    ];
    for (const [label, body, expected] of validationCases) {
      await test(`Registration rejected: ${label}`, async () => {
        const c = new Client(); await c.csrf();
        const r = await c.req('POST', '/api/auth/register', body);
        assertEq(r.status, expected);
        assert(r.data.error, 'expected an error message');
      });
    }

    await test('Admin product creation rejects negative price', async () => {
      const r = await admin.req('POST', '/api/products', {
        name: 'Bad Price', description: 'x', price: -5, category: 'Test', stock: 1,
      });
      assertEq(r.status, 400);
    });

    await test('Admin product creation rejects missing name', async () => {
      const r = await admin.req('POST', '/api/products', { price: 10, category: 'Test', stock: 1 });
      assertEq(r.status, 400);
    });

    await test('Admin product creation rejects non-http image URL', async () => {
      const r = await admin.req('POST', '/api/products', {
        name: 'Bad Img', description: 'x', price: 10, category: 'Test', stock: 1, image_url: 'javascript:alert(1)',
      });
      assertEq(r.status, 400);
    });

    // ================================================================
    // SECURITY TESTING
    // ================================================================
    console.log('\nSecurity testing');

    await test('SQL injection in login is neutralized (401, no bypass)', async () => {
      const c = new Client(); await c.csrf();
      const r = await c.req('POST', '/api/auth/login', {
        email: "' OR '1'='1' -- ", password: "' OR '1'='1",
      });
      assertEq(r.status, 401);
    });

    await test('SQL injection in search does not damage the database', async () => {
      const r = await anon.req('GET', '/api/products?search=' + encodeURIComponent("'; DROP TABLE products; --"));
      assertEq(r.status, 200);
      const after = await anon.req('GET', '/api/products');
      assert(after.data.products.length >= 8, 'products table must still exist');
    });

    await test('SQL injection in registration is stored as inert data', async () => {
      const c = new Client(); await c.csrf();
      const r = await c.req('POST', '/api/auth/register', {
        name: "Robert'); DROP TABLE users;--", email: 'bobby@test.com', password: 'Password1',
      });
      assertEq(r.status, 201);
      const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
      assert(users >= 4, 'users table must still exist');
    });

    await test('XSS payload in product name is stored but output-encoded by the client', async () => {
      const r = await admin.req('POST', '/api/products', {
        name: '<script>alert("xss")</script>', description: 'xss test', price: 9.99, category: 'Test', stock: 3,
      });
      assertEq(r.status, 201);
      const got = await anon.req('GET', `/api/products/${r.data.product.id}`);
      assertEq(got.data.product.name, '<script>alert("xss")</script>', 'stored verbatim as data');
      // The defence is output encoding + CSP — verify both are in place:
      const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
      assert(appJs.includes('escapeHtml'), 'frontend must escape all dynamic output');
      assert(/escapeHtml\(p\.name\)/.test(appJs), 'product names must be escaped when rendered');
      assert(r.headers.get('content-security-policy')?.includes("script-src 'self'"), 'CSP must block inline scripts');
      await admin.req('DELETE', `/api/products/${r.data.product.id}`);
    });

    await test('State-changing request without CSRF token returns 403', async () => {
      const c = new Client();
      c.cookie = userA.cookie; // valid session, but no CSRF token
      const r = await c.req('POST', '/api/orders', { items: [{ productId: 1, quantity: 1 }], shippingName: 'A B', address: '123 Street' });
      assertEq(r.status, 403);
    });

    await test('State-changing request with wrong CSRF token returns 403', async () => {
      const c = new Client();
      c.cookie = userA.cookie;
      c.csrfToken = 'deadbeef'.repeat(8);
      const r = await c.req('POST', '/api/orders', { items: [{ productId: 1, quantity: 1 }], shippingName: 'A B', address: '123 Street' });
      assertEq(r.status, 403);
    });

    await test('Unauthenticated access to admin endpoints returns 401', async () => {
      const r = await anon.req('GET', '/api/admin/users');
      assertEq(r.status, 401);
    });

    await test('Non-admin user accessing admin endpoints returns 403', async () => {
      const r = await userA.req('GET', '/api/admin/users');
      assertEq(r.status, 403);
      const r2 = await userA.req('POST', '/api/products', { name: 'Nope', price: 1, category: 'X', stock: 1 });
      assertEq(r2.status, 403);
    });

    await test('Session cookie is HttpOnly', async () => {
      const c = new Client(); await c.csrf();
      const r = await c.req('POST', '/api/auth/login', { email: 'usera@test.com', password: 'Password1' });
      assertEq(r.status, 200);
      const cookie = r.headers.get('set-cookie') || '';
      assert(/httponly/i.test(cookie), 'session cookie must be HttpOnly');
      assert(/samesite=lax/i.test(cookie), 'session cookie must be SameSite=Lax');
    });

    await test('Security headers are present (CSP, nosniff, frame protection, HSTS)', async () => {
      const r = await anon.req('GET', '/api/health');
      assert(r.headers.get('content-security-policy'), 'missing CSP');
      assertEq(r.headers.get('x-content-type-options'), 'nosniff');
      const frame = r.headers.get('x-frame-options') || r.headers.get('content-security-policy') || '';
      assert(/SAMEORIGIN|frame-ancestors/i.test(frame), 'missing clickjacking protection');
      assert(r.headers.get('strict-transport-security'), 'missing HSTS');
    });

    // ================================================================
    // FUNCTIONAL TESTING — checkout, orders, profile, admin CRUD
    // ================================================================
    console.log('\nFunctional testing — orders, profile, admin');

    await test('Checkout creates an order and decrements stock', async () => {
      const before = (await anon.req('GET', `/api/products/${productId}`)).data.product.stock;
      const r = await userA.req('POST', '/api/orders', {
        items: [{ productId, quantity: 2 }], shippingName: 'Test User A', address: '12 Market Street, Lagos',
      });
      assertEq(r.status, 201);
      orderId = r.data.order.id;
      assert(r.data.order.total > 0);
      assertEq(r.data.order.items.length, 1);
      const after = (await anon.req('GET', `/api/products/${productId}`)).data.product.stock;
      assertEq(after, before - 2);
    });

    await test('Checkout with empty cart returns 400', async () => {
      const r = await userA.req('POST', '/api/orders', { items: [], shippingName: 'A B', address: '123 Street' });
      assertEq(r.status, 400);
    });

    await test('Checkout beyond available stock returns 400', async () => {
      const r = await userA.req('POST', '/api/orders', {
        items: [{ productId, quantity: 9999 }], shippingName: 'A B', address: '123 Street',
      });
      assertEq(r.status, 400);
    });

    await test('Unauthenticated checkout returns 401', async () => {
      const c = new Client(); await c.csrf();
      const r = await c.req('POST', '/api/orders', {
        items: [{ productId, quantity: 1 }], shippingName: 'A B', address: '123 Street',
      });
      assertEq(r.status, 401);
    });

    await test('Users only see their own orders (access control)', async () => {
      const mineA = await userA.req('GET', '/api/orders');
      assert(mineA.data.orders.some((o) => o.id === orderId), 'user A should see their order');
      const mineB = await userB.req('GET', '/api/orders');
      assert(!mineB.data.orders.some((o) => o.id === orderId), 'user B must NOT see user A\'s order');
    });

    await test('Admin can list all orders and update status', async () => {
      const list = await admin.req('GET', '/api/admin/orders');
      assertEq(list.status, 200);
      assert(list.data.orders.some((o) => o.id === orderId));
      const upd = await admin.req('PUT', `/api/admin/orders/${orderId}/status`, { status: 'shipped' });
      assertEq(upd.status, 200);
      assertEq(upd.data.order.status, 'shipped');
    });

    await test('Admin order status update rejects invalid status', async () => {
      const r = await admin.req('PUT', `/api/admin/orders/${orderId}/status`, { status: 'hacked' });
      assertEq(r.status, 400);
    });

    await test('Profile update works', async () => {
      const r = await userA.req('PUT', '/api/profile', { name: 'User A Renamed' });
      assertEq(r.status, 200);
      assertEq(r.data.user.name, 'User A Renamed');
    });

    await test('Change password rejects wrong current password', async () => {
      const r = await userA.req('POST', '/api/profile/change-password', {
        currentPassword: 'WrongPass9', newPassword: 'NewPassword1',
      });
      assertEq(r.status, 401);
    });

    await test('Change password works and new password can log in', async () => {
      const r = await userA.req('POST', '/api/profile/change-password', {
        currentPassword: 'Password1', newPassword: 'NewPassword1',
      });
      assertEq(r.status, 200);
      const c = new Client(); await c.csrf();
      const login = await c.req('POST', '/api/auth/login', { email: 'usera@test.com', password: 'NewPassword1' });
      assertEq(login.status, 200);
      await userA.req('POST', '/api/profile/change-password', {
        currentPassword: 'NewPassword1', newPassword: 'Password1',
      }); // restore
    });

    await test('Admin can create, update and delete a product', async () => {
      const created = await admin.req('POST', '/api/products', {
        name: 'Admin Test Product', description: 'created by test', price: 42, category: 'Test', stock: 7,
      });
      assertEq(created.status, 201);
      const id = created.data.product.id;
      const updated = await admin.req('PUT', `/api/products/${id}`, { price: 43.5 });
      assertEq(updated.status, 200);
      assertEq(updated.data.product.price, 43.5);
      assertEq(updated.data.product.name, 'Admin Test Product', 'partial update must keep other fields');
      const del = await admin.req('DELETE', `/api/products/${id}`);
      assertEq(del.status, 200);
      const gone = await anon.req('GET', `/api/products/${id}`);
      assertEq(gone.status, 404);
    });

    await test('Deleting a product that appears in orders is blocked (409)', async () => {
      const r = await admin.req('DELETE', `/api/products/${productId}`);
      assertEq(r.status, 409);
    });

    await test('Admin can promote a user to admin and demote back', async () => {
      const users = (await admin.req('GET', '/api/admin/users')).data.users;
      const b = users.find((u) => u.email === 'userb@test.com');
      const promote = await admin.req('PUT', `/api/admin/users/${b.id}/role`, { role: 'admin' });
      assertEq(promote.status, 200);
      assertEq(promote.data.user.role, 'admin');
      const demote = await admin.req('PUT', `/api/admin/users/${b.id}/role`, { role: 'user' });
      assertEq(demote.data.user.role, 'user');
    });

    await test('Admin cannot change their own role or delete themselves', async () => {
      const me = (await admin.req('GET', '/api/auth/me')).data.user;
      const role = await admin.req('PUT', `/api/admin/users/${me.id}/role`, { role: 'user' });
      assertEq(role.status, 400);
      const del = await admin.req('DELETE', `/api/admin/users/${me.id}`);
      assertEq(del.status, 400);
    });

    await test('Logout invalidates the session', async () => {
      const c = new Client(); await c.csrf();
      await c.req('POST', '/api/auth/login', { email: 'userb@test.com', password: 'Password1' });
      const out = await c.req('POST', '/api/auth/logout');
      assertEq(out.status, 200);
      const me = await c.req('GET', '/api/auth/me');
      assertEq(me.status, 401);
    });

    // ================================================================
    // ERROR HANDLING
    // ================================================================
    console.log('\nError handling');

    await test('Malformed JSON body returns 400 (not a crash)', async () => {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userA.cookie, 'X-CSRF-Token': userA.csrfToken },
        body: '{not valid json',
      });
      assertEq(res.status, 400);
    });

    await test('Unknown API route returns JSON 404', async () => {
      const r = await anon.req('GET', '/api/does-not-exist');
      assertEq(r.status, 404);
      assert(r.data.error, 'expected JSON error');
    });

    await test('Oversized payload returns 413', async () => {
      const big = 'x'.repeat(200 * 1024);
      const res = await fetch(`http://127.0.0.1:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userA.cookie, 'X-CSRF-Token': userA.csrfToken },
        body: JSON.stringify({ name: big, email: 'big@test.com', password: 'Password1' }),
      });
      assertEq(res.status, 413);
    });

    // ================================================================
    // SECURITY TESTING — rate limiting (runs last: it exhausts the
    // per-IP auth quota, so no later test may call /api/auth/*)
    // ================================================================
    console.log('\nSecurity testing — rate limiting');

    await test('Rate limiting kicks in after repeated failed logins (429)', async () => {
      const c = new Client(); await c.csrf();
      let saw429 = false;
      for (let i = 0; i < 300 && !saw429; i++) {
        const r = await c.req('POST', '/api/auth/login', { email: 'usera@test.com', password: 'WrongPass9' });
        if (r.status === 429) saw429 = true;
      }
      assert(saw429, 'expected a 429 response after many failed attempts');
    });

    // ================================================================
    // DATABASE TESTING
    // ================================================================
    console.log('\nDatabase testing');

    await test('Passwords are stored as bcrypt hashes, never plaintext', async () => {
      const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('usera@test.com');
      assert(/^\$2[aby]\$/.test(row.password_hash), 'expected a bcrypt hash');
      assert(!row.password_hash.includes('Password1'), 'plaintext must not appear');
    });

    await test('Seeded admin exists with role admin', async () => {
      const row = db.prepare('SELECT role FROM users WHERE email = ?').get('admin@markethub.com');
      assertEq(row.role, 'admin');
    });

    await test('Foreign keys are enforced', async () => {
      const fk = db.pragma('foreign_key_check');
      assertEq(fk.length, 0, 'no orphaned rows allowed');
    });

    await test('Sessions are stored server-side in the database', async () => {
      const row = db.prepare('SELECT COUNT(*) AS c FROM sessions').get();
      assert(row.c > 0, 'expected server-side session rows');
    });

    // ================================================================
    // USABILITY / RESPONSIVE (static checks)
    // ================================================================
    console.log('\nUsability & responsive testing (static checks)');

    await test('HTML includes a viewport meta tag for mobile', async () => {
      const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
      assert(/<meta[^>]+name=["']viewport["']/i.test(html), 'missing viewport meta');
    });

    await test('CSS contains responsive breakpoints', async () => {
      const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');
      const count = (css.match(/@media/g) || []).length;
      assert(count >= 2, `expected at least 2 media queries, found ${count}`);
      assert(/minmax\(|auto-fill/.test(css), 'expected a fluid responsive grid');
    });

    await test('Frontend uses textContent/escaping for user data (XSS-safe rendering)', async () => {
      const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
      assert(js.includes('escapeHtml'), 'missing output encoding');
      assert(!/innerHTML\s*=\s*[^;]*\$\{[^}]*\.(name|email|description)/.test(js.replace(/escapeHtml\([^)]*\)/g, '')),
        'found unescaped user data in innerHTML');
    });

  } catch (err) {
    console.error('Test suite crashed:', err);
    failed++;
    results.push({ name: 'Test suite completed without crashing', status: 'FAIL', error: err.message });
  }

  // --- Report ---
  const report = { timestamp: new Date().toISOString(), passed, failed, total: results.length, results };
  fs.writeFileSync(path.join(__dirname, '../public/test-results.json'), JSON.stringify(report, null, 2));

  const md = [
    '# MarketHub — Test Report',
    '',
    `Generated: ${report.timestamp}`,
    '',
    `**${passed} passed · ${failed} failed · ${results.length} total**`,
    '',
    '| # | Test | Result |',
    '|---|------|--------|',
    ...results.map((r, i) => `| ${i + 1} | ${r.name.replace(/\|/g, '\\|')} | ${r.status}${r.error ? ` — ${r.error}` : ''} |`),
    '',
    'Run with `npm test`. The suite boots the real server against a throwaway SQLite database and exercises it over HTTP.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, '../TESTING.md'), md);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log(`Reports written: public/test-results.json, TESTING.md`);
  console.log('='.repeat(60));

  server.close(() => process.exit(failed ? 1 : 0));
});
