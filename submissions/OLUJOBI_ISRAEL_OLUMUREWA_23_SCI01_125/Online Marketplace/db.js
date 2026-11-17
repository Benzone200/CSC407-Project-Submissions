// db.js — Database layer (SQLite via better-sqlite3)
//
// SECURITY NOTE: every query in this project uses bound parameters
// (the "?" placeholders). User input is therefore always treated as
// *data*, never as SQL — this is the primary defence against
// SQL injection. String interpolation into SQL is never used.

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'marketplace.db');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON'); // enforce referential integrity

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                       -- bcrypt hash, never plaintext
  role          TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin')),  -- role-based access control
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       REAL NOT NULL CHECK (price >= 0),
  category    TEXT NOT NULL DEFAULT 'General',
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   TEXT NOT NULL DEFAULT '',
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  total         REAL NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  shipping_name TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  price      REAL NOT NULL
);

-- Server-side session storage (so sessions survive restarts and can be revoked)
CREATE TABLE IF NOT EXISTS sessions (
  sid      TEXT PRIMARY KEY,
  data     TEXT NOT NULL,
  expires  INTEGER NOT NULL
);
`);

// ---------------------------------------------------------------------------
// SQLite-backed session store for express-session.
// Sessions are stored server-side; the browser only holds an opaque,
// HttpOnly session ID cookie — session data can never be tampered with
// or read by client-side scripts.
// ---------------------------------------------------------------------------
class SQLiteSessionStore extends session.Store {
  constructor(database) {
    super();
    this.db = database;
    this.stmtGet = database.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
    this.stmtSet = database.prepare(
      `INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?)
       ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires`
    );
    this.stmtDel = database.prepare('DELETE FROM sessions WHERE sid = ?');
    this.stmtClean = database.prepare('DELETE FROM sessions WHERE expires <= ?');
  }

  get(sid, cb) {
    try {
      const row = this.stmtGet.get(sid);
      if (!row) return cb(null, null);
      if (row.expires <= Date.now()) { this.stmtDel.run(sid); return cb(null, null); }
      cb(null, JSON.parse(row.data));
    } catch (err) { cb(err); }
  }

  set(sid, sess, cb) {
    try {
      const expires = sess.cookie && sess.cookie.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + 24 * 60 * 60 * 1000;
      this.stmtSet.run(sid, JSON.stringify(sess), expires);
      this.stmtClean.run(Date.now()); // opportunistic cleanup of expired sessions
      cb(null);
    } catch (err) { cb(err); }
  }

  destroy(sid, cb) {
    try { this.stmtDel.run(sid); cb(null); } catch (err) { cb(err); }
  }
}

// ---------------------------------------------------------------------------
// Seed data — runs only when the users table is empty (idempotent).
// Demo accounts (change these in production!):
//   Admin : admin@markethub.com / Admin123!
//   User  : demo@markethub.com  / Demo123!
// ---------------------------------------------------------------------------
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const admin = insertUser.run(
    'Store Admin', 'admin@markethub.com',
    bcrypt.hashSync('Admin123!', BCRYPT_ROUNDS), 'admin'
  );
  insertUser.run(
    'Demo Shopper', 'demo@markethub.com',
    bcrypt.hashSync('Demo123!', BCRYPT_ROUNDS), 'user'
  );

  const products = [
    ['Wireless Noise-Cancelling Headphones', 'Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.', 89.99, 'Electronics', 25, '/images/headphones.webp'],
    ['Mechanical Keyboard RGB', 'Hot-swappable mechanical keyboard with tactile switches and per-key RGB lighting.', 129.99, 'Electronics', 18, '/images/keyboard.jpg'],
    ['Smart Watch Series 5', 'Fitness tracking, heart-rate monitoring, sleep analysis and 7-day battery.', 199.99, 'Electronics', 12, '/images/smartwatch.jpg'],
    ['Bluetooth Speaker', 'Portable waterproof speaker with deep bass and 12-hour playtime.', 49.99, 'Electronics', 40, '/images/speaker.jpg'],
    ['Running Shoes', 'Lightweight breathable running shoes with cushioned sole for daily training.', 74.50, 'Fashion', 30, '/images/shoes.png'],
    ['Leather Backpack', 'Full-grain leather backpack with padded 15-inch laptop compartment.', 59.99, 'Fashion', 15, '/images/backpack.jpg'],
    ['Ceramic Mug Set (4)', 'Hand-glazed stoneware mugs, dishwasher and microwave safe.', 24.99, 'Home & Kitchen', 50, '/images/mugs.jpg'],
    ['LED Desk Lamp', 'Adjustable LED desk lamp with warm/cool light modes and USB charging port.', 39.99, 'Home & Kitchen', 22, '/images/lamp.jpg'],
    ['Pro Yoga Mat', '6mm non-slip yoga mat with carry strap, sweat-resistant surface.', 29.99, 'Sports', 35, '/images/yoga.jpg'],
    ['Insulated Steel Bottle 1L', 'Keeps drinks cold for 24 hours or hot for 12. Leak-proof cap.', 19.99, 'Sports', 60, '/images/bottle.jpg'],
  ];
  const insertProduct = db.prepare(
    'INSERT INTO products (name, description, price, category, stock, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const p of products) insertProduct.run(p[0], p[1], p[2], p[3], p[4], p[5], admin.lastInsertRowid);
  });
  tx();
  console.log('Database seeded with demo accounts and products.');
}

seed();

module.exports = { db, SQLiteSessionStore, seed };
