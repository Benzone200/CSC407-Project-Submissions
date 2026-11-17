// server.js — MarketHub backend (Express + SQLite)
//
// Security measures implemented here (see the in-app "Security" page for details):
//   1. Password hashing with bcrypt (cost 12) — plaintext passwords are never stored.
//   2. Server-side sessions with HttpOnly, SameSite cookies; session ID is
//      regenerated on login (session-fixation protection).
//   3. Role-based access control: 'admin' vs 'user' enforced on every route.
//   4. Parameterized SQL queries everywhere (SQL-injection protection).
//   5. CSRF synchronizer tokens required on all state-changing requests.
//   6. Input validation + length limits on every endpoint.
//   7. Rate limiting on authentication endpoints (brute-force protection).
//   8. Helmet security headers: CSP, HSTS, X-Content-Type-Options, frame protection.
//   9. Generic error messages — no stack traces or internals leak to clients.

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { db, SQLiteSessionStore } = require('./db');

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-secret-change-in-production';

if (isProd && !process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set — set a long random secret in production!');
}

// ---------------------------------------------------------------------------
// 1. Security headers (Helmet)
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],                 // no inline scripts → XSS mitigation
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],            // clickjacking protection
      baseUri: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true }, // force HTTPS for 1 year
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// ---------------------------------------------------------------------------
// 2. Body parsing with size limits (DoS / oversized-payload protection)
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// ---------------------------------------------------------------------------
// 3. Session management — server-side store, hardened cookie
// ---------------------------------------------------------------------------
app.use(session({
  store: new SQLiteSessionStore(db),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                          // invisible to JavaScript (XSS-safe)
    sameSite: 'lax',                         // CSRF mitigation for top-level GETs
    secure: isProd,                          // only sent over HTTPS in production
    maxAge: 1000 * 60 * 60 * 24,             // 24 hours
  },
}));

// ---------------------------------------------------------------------------
// 4. CSRF protection — synchronizer token pattern
// ---------------------------------------------------------------------------
function newCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}
app.get('/api/csrf-token', (req, res) => {
  if (!req.session.csrfToken) req.session.csrfToken = newCsrfToken();
  res.json({ csrfToken: req.session.csrfToken });
});
function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = req.headers['x-csrf-token'];
  const expected = req.session.csrfToken;
  if (!token || !expected) return fail(res, 403, 'Invalid or missing CSRF token');
  const a = Buffer.from(String(token));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return fail(res, 403, 'Invalid or missing CSRF token');
  }
  next();
}
app.use('/api', csrfProtect);

// ---------------------------------------------------------------------------
// 5. Rate limiting on auth endpoints (brute-force / credential-stuffing defence)
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fail(res, status, message) {
  return res.status(status).json({ error: message });
}

function publicUser(u) {
  return u ? { id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at } : null;
}

function currentUser(req) {
  if (!req.session.userId) return null;
  const u = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
    .get(req.session.userId);
  return u || null;
}

// Access-control middleware — checked on every protected route
function requireAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return fail(res, 401, 'You must be logged in to do that');
  req.user = u;
  next();
}
function requireAdmin(req, res, next) {
  const u = currentUser(req);
  if (!u) return fail(res, 401, 'You must be logged in to do that');
  if (u.role !== 'admin') return fail(res, 403, 'Admin access required');
  req.user = u;
  next();
}

// Input validation helpers — return an error string or null
function checkString(value, field, { min = 1, max = 255 } = {}) {
  if (typeof value !== 'string') return `${field} is required`;
  const v = value.trim();
  if (v.length < min) return `${field} must be at least ${min} characters`;
  if (v.length > max) return `${field} must be at most ${max} characters`;
  return null;
}
function checkEmail(email) {
  if (typeof email !== 'string') return 'Email is required';
  const e = email.trim().toLowerCase();
  if (e.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'Enter a valid email address';
  return null;
}
function checkPassword(password) {
  if (typeof password !== 'string') return 'Password is required';
  if (password.length < 8 || password.length > 128) return 'Password must be 8–128 characters';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
}
// Escape LIKE wildcards so search input cannot act as a pattern
function escapeLike(s) {
  return s.replace(/[\\%_]/g, (ch) => '\\' + ch);
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---------------------------------------------------------------------------
// AUTH — registration, login, logout, current user
// ---------------------------------------------------------------------------
app.post('/api/auth/register', authLimiter, (req, res) => {
  const { name, email, password } = req.body || {};
  const nameErr = checkString(name, 'Name', { min: 2, max: 60 });
  if (nameErr) return fail(res, 400, nameErr);
  const emailErr = checkEmail(email);
  if (emailErr) return fail(res, 400, emailErr);
  const passErr = checkPassword(password);
  if (passErr) return fail(res, 400, passErr);

  const emailNorm = email.trim().toLowerCase();
  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS); // salted, slow hash
  try {
    const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name.trim(), emailNorm, hash);
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
      .get(info.lastInsertRowid);
    req.session.userId = user.id;               // auto-login after registration
    req.session.csrfToken = newCsrfToken();
    return res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return fail(res, 409, 'An account with this email already exists');
    }
    throw err;
  }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailNorm);
  // Generic failure message — never reveal whether the email exists
  const ok = !!user && typeof password === 'string' && bcrypt.compareSync(password, user.password_hash);
  if (!ok) return fail(res, 401, 'Invalid email or password');

  // Regenerate the session ID on login → protects against session fixation
  req.session.regenerate((err) => {
    if (err) return fail(res, 500, 'Could not create a session');
    req.session.userId = user.id;
    req.session.csrfToken = newCsrfToken();
    res.json({ user: publicUser(user) });
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  const u = currentUser(req);
  if (!u) return fail(res, 401, 'Not logged in');
  res.json({ user: publicUser(u) });
});

// ---------------------------------------------------------------------------
// PROFILE — view / update own profile, change password
// ---------------------------------------------------------------------------
app.get('/api/profile', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.put('/api/profile', requireAuth, (req, res) => {
  const { name } = req.body || {};
  const err = checkString(name, 'Name', { min: 2, max: 60 });
  if (err) return fail(res, 400, err);
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.id);
  res.json({ user: publicUser(currentUser(req)) });
});

app.post('/api/profile/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (typeof currentPassword !== 'string' || !bcrypt.compareSync(currentPassword, row.password_hash)) {
    return fail(res, 401, 'Current password is incorrect');
  }
  const err = checkPassword(newPassword);
  if (err) return fail(res, 400, err);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, BCRYPT_ROUNDS), req.user.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// PRODUCTS — public browsing with search/filter; admin-only writes
// ---------------------------------------------------------------------------
const SORT_MAP = {
  newest: 'created_at DESC',
  price_asc: 'price ASC',
  price_desc: 'price DESC',
  name: 'name ASC',
};

app.get('/api/products', (req, res) => {
  const { search = '', category = '', sort = 'newest', minPrice = '', maxPrice = '' } = req.query;
  const where = [];
  const params = [];

  if (search) {
    const like = `%${escapeLike(String(search).slice(0, 100))}%`;
    where.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    params.push(like, like);
  }
  if (category) {
    where.push('category = ?');
    params.push(String(category).slice(0, 60));
  }
  const min = parseFloat(minPrice);
  if (!Number.isNaN(min) && min >= 0) { where.push('price >= ?'); params.push(min); }
  const max = parseFloat(maxPrice);
  if (!Number.isNaN(max) && max >= 0) { where.push('price <= ?'); params.push(max); }

  const orderBy = SORT_MAP[sort] || SORT_MAP.newest; // whitelisted — no injection via sort
  const sql = `SELECT * FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orderBy}`;
  const products = db.prepare(sql).all(...params);
  const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category')
    .all().map((r) => r.category);
  res.json({ products, categories });
});

app.get('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'Invalid product id');
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!p) return fail(res, 404, 'Product not found');
  res.json({ product: p });
});

function validateProduct(body, partial) {
  const v = {};
  const has = (k) => !partial || body[k] !== undefined;

  if (has('name')) {
    const e = checkString(body.name, 'Product name', { min: 2, max: 120 });
    if (e) return { error: e };
    v.name = body.name.trim();
  }
  if (has('description')) {
    const e = checkString(body.description, 'Description', { min: 0, max: 2000 });
    if (e) return { error: e };
    v.description = body.description.trim();
  }
  if (has('price')) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0 || price > 10000000) {
      return { error: 'Price must be a number between 0 and 10,000,000' };
    }
    v.price = Math.round(price * 100) / 100;
  }
  if (has('category')) {
    const e = checkString(body.category, 'Category', { min: 1, max: 60 });
    if (e) return { error: e };
    v.category = body.category.trim();
  }
  if (has('stock')) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) {
      return { error: 'Stock must be a whole number between 0 and 1,000,000' };
    }
    v.stock = stock;
  }
  if (has('image_url')) {
    const url = body.image_url === undefined || body.image_url === null ? '' : String(body.image_url).trim();
    if (url.length > 500) return { error: 'Image URL is too long' };
    if (url && !/^https?:\/\//i.test(url) && !/^\/images\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(url)) return { error: 'Image URL must be an http(s) URL or a local /images/ path' };
    v.image_url = url;
  }
  return { values: v };
}

app.post('/api/products', requireAdmin, (req, res) => {
  const { error, values } = validateProduct(req.body || {}, false);
  if (error) return fail(res, 400, error);
  const info = db.prepare(
    `INSERT INTO products (name, description, price, category, stock, image_url, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(values.name, values.description, values.price, values.category, values.stock, values.image_url, req.user.id);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ product });
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'Invalid product id');
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return fail(res, 404, 'Product not found');
  const { error, values } = validateProduct(req.body || {}, true);
  if (error) return fail(res, 400, error);
  const keys = Object.keys(values);
  if (keys.length === 0) return fail(res, 400, 'Nothing to update');
  const setClause = keys.map((k) => `${k} = ?`).join(', '); // keys are whitelisted above
  db.prepare(`UPDATE products SET ${setClause} WHERE id = ?`).run(...keys.map((k) => values[k]), id);
  res.json({ product: db.prepare('SELECT * FROM products WHERE id = ?').get(id) });
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'Invalid product id');
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return fail(res, 404, 'Product not found');
  const inOrders = db.prepare('SELECT COUNT(*) AS c FROM order_items WHERE product_id = ?').get(id).c;
  if (inOrders > 0) return fail(res, 409, 'Cannot delete a product that appears in orders');
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// ORDERS — checkout (auth), own orders (auth), all orders (admin)
// ---------------------------------------------------------------------------
function getOrderWithItems(id) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!o) return null;
  o.items = db.prepare(
    `SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name AS product_name
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? ORDER BY oi.id`
  ).all(id);
  return o;
}

app.post('/api/orders', requireAuth, (req, res) => {
  const { items, shippingName, address } = req.body || {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return fail(res, 400, 'Your cart is empty');
  }
  const nameErr = checkString(shippingName, 'Shipping name', { min: 2, max: 60 });
  if (nameErr) return fail(res, 400, nameErr);
  const addrErr = checkString(address, 'Address', { min: 5, max: 300 });
  if (addrErr) return fail(res, 400, addrErr);

  // Merge duplicate product lines, validate quantities
  const merged = new Map();
  for (const it of items) {
    const pid = Number(it && it.productId);
    const qty = Number(it && it.quantity);
    if (!Number.isInteger(pid) || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return fail(res, 400, 'Invalid item in cart');
    }
    merged.set(pid, (merged.get(pid) || 0) + qty);
  }

  try {
    const orderId = db.transaction(() => {
      let total = 0;
      const lines = [];
      for (const [pid, qty] of merged) {
        const p = db.prepare('SELECT * FROM products WHERE id = ?').get(pid);
        if (!p) throw Object.assign(new Error('A product in your cart no longer exists'), { status: 400 });
        if (p.stock < qty) throw Object.assign(new Error(`Only ${p.stock} in stock for "${p.name}"`), { status: 400 });
        total += p.price * qty;
        lines.push({ pid, qty, price: p.price });
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, pid);
      }
      const info = db.prepare(
        'INSERT INTO orders (user_id, total, shipping_name, address) VALUES (?, ?, ?, ?)'
      ).run(req.user.id, Math.round(total * 100) / 100, shippingName.trim(), address.trim());
      const ins = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
      for (const l of lines) ins.run(info.lastInsertRowid, l.pid, l.qty, l.price);
      return info.lastInsertRowid;
    })();
    res.status(201).json({ order: getOrderWithItems(orderId) });
  } catch (err) {
    if (err.status) return fail(res, err.status, err.message);
    throw err;
  }
});

app.get('/api/orders', requireAuth, (req, res) => {
  // Access control: a user can only ever see their own orders
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id).map((o) => getOrderWithItems(o.id));
  res.json({ orders });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = db.prepare(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email
     FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`
  ).all().map((o) => getOrderWithItems(o.id));
  res.json({ orders });
});

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
app.put('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'Invalid order id');
  if (!ORDER_STATUSES.includes(status)) return fail(res, 400, 'Invalid status');
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!existing) return fail(res, 404, 'Order not found');
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  res.json({ order: getOrderWithItems(id) });
});

// ---------------------------------------------------------------------------
// ADMIN — user management
// ---------------------------------------------------------------------------
app.get('/api/admin/users', requireAdmin, (req, res) => {
  // Password hashes are never selected or returned
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id').all();
  res.json({ users });
});

app.put('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'Invalid user id');
  if (!['user', 'admin'].includes(role)) return fail(res, 400, 'Role must be "user" or "admin"');
  if (id === req.user.id) return fail(res, 400, 'You cannot change your own role');
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return fail(res, 404, 'User not found');
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  res.json({ user: publicUser(db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id)) });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'Invalid user id');
  if (id === req.user.id) return fail(res, 400, 'You cannot delete your own account');
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return fail(res, 404, 'User not found');
  db.transaction(() => {
    db.prepare('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)').run(id);
    db.prepare('DELETE FROM orders WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  })();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Static files + SPA fallback
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return fail(res, 404, 'Not found');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Central error handler — never leak stack traces to clients
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === 'entity.too.large') return fail(res, 413, 'Request payload too large');
  if (err instanceof SyntaxError && err.status === 400) return fail(res, 400, 'Invalid JSON in request body');
  fail(res, 500, 'Internal server error');
});

// ---------------------------------------------------------------------------
// Start server (HTTP by default; HTTPS when PEM files are configured)
// ---------------------------------------------------------------------------
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  if (process.env.HTTPS_KEY && process.env.HTTPS_CERT) {
    const https = require('https');
    const fs = require('fs');
    https.createServer(
      { key: fs.readFileSync(process.env.HTTPS_KEY), cert: fs.readFileSync(process.env.HTTPS_CERT) },
      app
    ).listen(PORT, '0.0.0.0', () => console.log(`MarketHub running over HTTPS at https://localhost:${PORT}`));
  } else {
    app.listen(PORT, '0.0.0.0', () => console.log(`MarketHub running at http://localhost:${PORT}`));
  }
}

module.exports = app;
