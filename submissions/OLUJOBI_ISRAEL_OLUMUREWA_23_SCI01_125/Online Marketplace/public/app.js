'use strict';
/* ==========================================================================
   MarketHub frontend — single-page application (vanilla JS, hash routing)
   SECURITY: every piece of server/user data is passed through escapeHtml()
   before being inserted into the DOM, so stored XSS payloads are rendered
   as inert text. The server also enforces a strict Content-Security-Policy.
   ========================================================================== */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const state = {
  user: null,
  cart: loadCart(),
  csrf: null,
  filters: { search: '', category: '', sort: 'newest', minPrice: '', maxPrice: '' },
  adminTab: 'products',
};

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0e7ff"/><stop offset="1" stop-color="#cffafe"/></linearGradient></defs><rect width="600" height="400" fill="url(#g)"/><text x="50%" y="52%" font-family="sans-serif" font-size="28" fill="#818cf8" text-anchor="middle">MarketHub</text></svg>'
  );

/* ------------------------------ Utilities ------------------------------ */

// Output encoding — the XSS defence. All dynamic strings go through here.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function money(n) {
  return '$' + Number(n).toFixed(2);
}

function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = message; // textContent — never innerHTML with user data
  $('#toast-root').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem('mh_cart')) || []; } catch { return []; }
}
function saveCart() {
  localStorage.setItem('mh_cart', JSON.stringify(state.cart));
  updateCartBadge();
}
function cartCount() { return state.cart.reduce((n, i) => n + i.qty, 0); }
function cartTotal() { return state.cart.reduce((n, i) => n + i.price * i.qty, 0); }
function updateCartBadge() {
  const badge = $('#cart-count');
  const n = cartCount();
  badge.textContent = n;
  badge.hidden = n === 0;
}

/* ------------------------------ API client ------------------------------ */

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (method !== 'GET' && state.csrf) headers['X-CSRF-Token'] = state.csrf;
  const res = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function ensureCsrf() {
  if (!state.csrf) {
    const d = await api('/api/csrf-token');
    state.csrf = d.csrfToken;
  }
}

/* ------------------------------ Modal helper ------------------------------ */

function openModal(title, bodyHtml) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="modal-head">
          <h2>${escapeHtml(title)}</h2>
          <button class="modal-close" id="modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    </div>`;
  const close = () => { root.innerHTML = ''; };
  $('#modal-close').addEventListener('click', close);
  $('#modal-backdrop').addEventListener('click', (e) => { if (e.target.id === 'modal-backdrop') close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  return close;
}

/* ------------------------------ Router ------------------------------ */

function router() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, param] = hash.split('/');
  $$('.main-nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === page));
  $('#main-nav').classList.remove('open');
  $('#burger').setAttribute('aria-expanded', 'false');

  const routes = {
    '': renderHome, home: renderHome, login: renderLogin, register: renderRegister,
    cart: renderCart, checkout: renderCheckout, profile: renderProfile,
    orders: renderOrders, admin: renderAdmin, security: renderSecurity, testing: renderTesting,
  };
  const fn = routes[page] || renderHome;
  window.scrollTo(0, 0);
  fn(param).catch((err) => {
    console.error(err);
    $('#view-root').innerHTML = `<div class="empty-state"><h2>Something went wrong</h2><p>${escapeHtml(err.message)}</p></div>`;
  });
}
window.addEventListener('hashchange', router);

/* ------------------------------ Header / auth UI ------------------------------ */

function updateAuthArea() {
  const area = $('#auth-area');
  $('#nav-admin').hidden = !(state.user && state.user.role === 'admin');

  if (!state.user) {
    area.innerHTML = `
      <a class="btn btn-ghost btn-sm" href="#/login">Log in</a>
      <a class="btn btn-primary btn-sm" href="#/register">Sign up</a>`;
    return;
  }
  const initial = escapeHtml(state.user.name.charAt(0).toUpperCase());
  const roleTag = state.user.role === 'admin' ? '<span class="role-tag">Admin</span>' : '';
  area.innerHTML = `
    <div class="user-chip">
      <button class="user-chip-btn" id="user-chip-btn" aria-haspopup="true" aria-expanded="false">
        <span class="avatar">${initial}</span>
        <span class="user-name">${escapeHtml(state.user.name)}</span>
        ${roleTag}
      </button>
      <div class="dropdown hidden" id="user-dropdown">
        <a href="#/profile">My profile</a>
        <a href="#/orders">My orders</a>
        ${state.user.role === 'admin' ? '<a href="#/admin">Admin dashboard</a>' : ''}
        <button class="danger-link" id="logout-btn">Log out</button>
      </div>
    </div>`;
  const btn = $('#user-chip-btn');
  const dd = $('#user-dropdown');
  btn.addEventListener('click', () => {
    const open = dd.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-chip')) dd.classList.add('hidden');
  });
  $('#logout-btn').addEventListener('click', logout);
}

async function logout() {
  try {
    await ensureCsrf();
    await api('/api/auth/logout', { method: 'POST' });
  } catch { /* still clear local state */ }
  state.user = null;
  state.csrf = null;
  updateAuthArea();
  toast('You have been logged out', 'success');
  location.hash = '#/home';
  router();
}

function requireLogin() {
  if (state.user) return true;
  toast('Please log in to continue', 'error');
  location.hash = '#/login';
  return false;
}

/* ------------------------------ HOME ------------------------------ */

async function renderHome() {
  const root = $('#view-root');
  root.innerHTML = `
    <section class="hero">
      <h1>Everything you need, one marketplace.</h1>
      <p>Browse quality products from verified sellers. Secure checkout, fast delivery, and buyer protection on every order.</p>
      <form class="hero-search" id="search-form">
        <input type="search" id="search-input" placeholder="Search products…" aria-label="Search products"
               value="${escapeHtml(state.filters.search)}">
        <button class="btn" type="submit">Search</button>
      </form>
    </section>

    <div class="filter-bar" id="filter-bar">
      <span id="category-chips"></span>
      <span class="spacer"></span>
      <input class="price-input" id="min-price" type="number" min="0" step="0.01" placeholder="Min $"
             value="${escapeHtml(state.filters.minPrice)}" aria-label="Minimum price">
      <input class="price-input" id="max-price" type="number" min="0" step="0.01" placeholder="Max $"
             value="${escapeHtml(state.filters.maxPrice)}" aria-label="Maximum price">
      <select id="sort-select" aria-label="Sort products">
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="name">Name A–Z</option>
      </select>
    </div>

    <div id="product-grid" class="product-grid"></div>`;

  $('#sort-select').value = state.filters.sort;

  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.filters.search = $('#search-input').value.trim();
    loadProducts();
  });
  $('#sort-select').addEventListener('change', (e) => { state.filters.sort = e.target.value; loadProducts(); });
  $('#min-price').addEventListener('change', (e) => { state.filters.minPrice = e.target.value; loadProducts(); });
  $('#max-price').addEventListener('change', (e) => { state.filters.maxPrice = e.target.value; loadProducts(); });

  await loadProducts();
}

async function loadProducts() {
  const grid = $('#product-grid');
  if (!grid) return;
  grid.innerHTML = '<p class="muted">Loading products…</p>';
  const q = new URLSearchParams();
  if (state.filters.search) q.set('search', state.filters.search);
  if (state.filters.category) q.set('category', state.filters.category);
  if (state.filters.sort) q.set('sort', state.filters.sort);
  if (state.filters.minPrice) q.set('minPrice', state.filters.minPrice);
  if (state.filters.maxPrice) q.set('maxPrice', state.filters.maxPrice);

  const { products, categories } = await api('/api/products?' + q.toString());

  // Category filter chips
  const chips = $('#category-chips');
  if (chips) {
    chips.innerHTML =
      `<button class="chip ${state.filters.category === '' ? 'active' : ''}" data-cat="">All</button>` +
      categories.map((c) =>
        `<button class="chip ${state.filters.category === c ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
      ).join(' ');
    $$('#category-chips .chip').forEach((chip) =>
      chip.addEventListener('click', () => { state.filters.category = chip.dataset.cat; loadProducts(); })
    );
  }

  if (!products.length) {
    grid.innerHTML = `<div class="empty-state"><h2>No products found</h2>
      <p>Try a different search term or clear the filters.</p></div>`;
    return;
  }

  grid.innerHTML = products.map(productCard).join('');
  $$('.product-card', grid).forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-btn')) return;
      openProduct(Number(card.dataset.id));
    });
  });
  $$('.add-btn', grid).forEach((btn) =>
    btn.addEventListener('click', () => {
      const p = products.find((x) => x.id === Number(btn.dataset.id));
      if (p) addToCart(p, 1);
    })
  );
}

function productCard(p) {
  const stockHtml = p.stock <= 0
    ? '<span class="stock-out">Out of stock</span>'
    : p.stock <= 5
      ? `<span class="stock-low">Only ${p.stock} left</span>`
      : '<span class="stock-ok">In stock</span>';
  return `
    <article class="product-card" data-id="${p.id}" tabindex="0" role="button" aria-label="${escapeHtml(p.name)}">
      <div class="product-img-wrap">
        <img src="${escapeHtml(p.image_url || FALLBACK_IMG)}" alt="${escapeHtml(p.name)}" loading="lazy"
             onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
      </div>
      <div class="product-body">
        <span class="product-cat">${escapeHtml(p.category)}</span>
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description)}</p>
        <div class="product-foot">
          <span class="price">${money(p.price)}</span>
          ${stockHtml}
        </div>
        <button class="btn btn-primary btn-block add-btn" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
          ${p.stock <= 0 ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>`;
}

async function openProduct(id) {
  const { product: p } = await api(`/api/products/${id}`);
  const close = openModal(p.name, `
    <img class="modal-img" src="${escapeHtml(p.image_url || FALLBACK_IMG)}" alt="${escapeHtml(p.name)}"
         onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
    <p class="muted">${escapeHtml(p.category)} · ${p.stock > 0 ? `<span class="stock-ok">${p.stock} in stock</span>` : '<span class="stock-out">Out of stock</span>'}</p>
    <p>${escapeHtml(p.description)}</p>
    <p class="price">${money(p.price)}</p>
    <div class="field">
      <label for="qty-input">Quantity</label>
      <input id="qty-input" type="number" min="1" max="${Math.min(p.stock, 99)}" value="1" ${p.stock <= 0 ? 'disabled' : ''}>
    </div>
    <button class="btn btn-primary btn-block" id="modal-add" ${p.stock <= 0 ? 'disabled' : ''}>
      ${p.stock <= 0 ? 'Out of stock' : 'Add to cart'}
    </button>`);
  const addBtn = $('#modal-add');
  if (addBtn && p.stock > 0) {
    addBtn.addEventListener('click', () => {
      const qty = Math.max(1, Math.min(p.stock, Number($('#qty-input').value) || 1));
      addToCart(p, qty);
      close();
    });
  }
}

/* ------------------------------ CART ------------------------------ */

function addToCart(product, qty) {
  const existing = state.cart.find((i) => i.id === product.id);
  if (existing) {
    existing.qty = Math.min(product.stock, existing.qty + qty);
  } else {
    state.cart.push({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, qty });
  }
  saveCart();
  toast(`Added "${product.name}" to cart`, 'success');
}

async function renderCart() {
  const root = $('#view-root');
  if (!state.cart.length) {
    root.innerHTML = `<div class="empty-state">
      <h2>Your cart is empty</h2><p>Browse the marketplace to find something you like.</p>
      <a class="btn btn-primary" href="#/home">Start shopping</a></div>`;
    return;
  }
  root.innerHTML = `
    <div class="page-head"><h1>Shopping cart</h1></div>
    <div class="cart-layout">
      <div class="card-panel" style="padding:0">
        ${state.cart.map((i) => `
          <div class="cart-item" data-id="${i.id}">
            <img class="cart-thumb" src="${escapeHtml(i.image_url || FALLBACK_IMG)}" alt=""
                 onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
            <div class="cart-item-info">
              <div class="name">${escapeHtml(i.name)}</div>
              <div class="muted">${money(i.price)} each</div>
            </div>
            <div class="qty-control">
              <button data-act="dec" aria-label="Decrease quantity">−</button>
              <span>${i.qty}</span>
              <button data-act="inc" aria-label="Increase quantity">+</button>
            </div>
            <strong>${money(i.price * i.qty)}</strong>
            <button class="btn btn-ghost btn-sm" data-act="remove">Remove</button>
          </div>`).join('')}
      </div>
      <aside class="card-panel">
        <h2 style="margin-top:0">Order summary</h2>
        <div class="summary-row"><span>Items</span><span>${cartCount()}</span></div>
        <div class="summary-row"><span>Subtotal</span><span>${money(cartTotal())}</span></div>
        <div class="summary-row"><span>Shipping</span><span>Free</span></div>
        <div class="summary-row total"><span>Total</span><span>${money(cartTotal())}</span></div>
        <a class="btn btn-primary btn-block" href="#/checkout">Proceed to checkout</a>
        <a class="btn btn-ghost btn-block" href="#/home" style="margin-top:10px">Continue shopping</a>
      </aside>
    </div>`;

  $$('.cart-item').forEach((row) => {
    const id = Number(row.dataset.id);
    row.addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (!act) return;
      const item = state.cart.find((i) => i.id === id);
      if (!item) return;
      if (act === 'inc') item.qty = Math.min(99, item.qty + 1);
      if (act === 'dec') item.qty = Math.max(1, item.qty - 1);
      if (act === 'remove') state.cart = state.cart.filter((i) => i.id !== id);
      saveCart();
      renderCart();
    });
  });
}

/* ------------------------------ CHECKOUT ------------------------------ */

async function renderCheckout() {
  if (!requireLogin()) return;
  const root = $('#view-root');
  if (!state.cart.length) {
    root.innerHTML = `<div class="empty-state"><h2>Your cart is empty</h2>
      <a class="btn btn-primary" href="#/home">Browse products</a></div>`;
    return;
  }
  root.innerHTML = `
    <div class="page-head"><h1>Checkout</h1></div>
    <div class="cart-layout">
      <form class="card-panel" id="checkout-form" novalidate>
        <h2 style="margin-top:0">Delivery details</h2>
        <div id="checkout-error"></div>
        <div class="field">
          <label for="ship-name">Full name</label>
          <input id="ship-name" value="${escapeHtml(state.user.name)}" required>
        </div>
        <div class="field">
          <label for="ship-address">Delivery address</label>
          <textarea id="ship-address" rows="3" required placeholder="Street, city, postal code"></textarea>
        </div>
        <div class="field">
          <label for="card-number">Card number <span class="muted">(demo — not charged)</span></label>
          <input id="card-number" inputmode="numeric" placeholder="4242 4242 4242 4242" required>
        </div>
        <button class="btn btn-primary btn-block" type="submit">Place order · ${money(cartTotal())}</button>
        <p class="hint" style="margin-top:10px">This is a demo store — no real payment is processed.</p>
      </form>
      <aside class="card-panel">
        <h2 style="margin-top:0">Your items</h2>
        ${state.cart.map((i) => `
          <div class="summary-row"><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
        <div class="summary-row total"><span>Total</span><span>${money(cartTotal())}</span></div>
      </aside>
    </div>`;

  $('#checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('#checkout-error');
    errBox.innerHTML = '';
    const shippingName = $('#ship-name').value.trim();
    const address = $('#ship-address').value.trim();
    const card = $('#card-number').value.replace(/\s/g, '');
    if (shippingName.length < 2) return (errBox.innerHTML = '<div class="form-error">Enter your full name.</div>');
    if (address.length < 5) return (errBox.innerHTML = '<div class="form-error">Enter a complete delivery address.</div>');
    if (!/^\d{12,19}$/.test(card)) return (errBox.innerHTML = '<div class="form-error">Enter a valid card number (demo).</div>');

    try {
      await ensureCsrf();
      const { order } = await api('/api/orders', {
        method: 'POST',
        body: {
          items: state.cart.map((i) => ({ productId: i.id, quantity: i.qty })),
          shippingName,
          address,
        },
      });
      state.cart = [];
      saveCart();
      root.innerHTML = `
        <div class="empty-state">
          <h2>🎉 Order placed successfully!</h2>
          <p>Order <strong>#${order.id}</strong> · Total <strong>${money(order.total)}</strong> · Status: <span class="status-pill">${escapeHtml(order.status)}</span></p>
          <p class="muted">Thank you for shopping with MarketHub. You can track your order from your orders page.</p>
          <a class="btn btn-primary" href="#/orders">View my orders</a>
          <a class="btn btn-ghost" href="#/home">Continue shopping</a>
        </div>`;
    } catch (err) {
      errBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    }
  });
}

/* ------------------------------ AUTH VIEWS ------------------------------ */

function authFormHtml({ title, subtitle, fields, submitLabel, errorId }) {
  return `
    <div class="auth-wrap">
      <div class="card-panel">
        <h1>${title}</h1>
        <p class="muted">${subtitle}</p>
        <div id="${errorId}"></div>
        <form id="auth-form" novalidate>
          ${fields}
          <button class="btn btn-primary btn-block" type="submit">${submitLabel}</button>
        </form>
      </div>
    </div>`;
}

async function renderLogin() {
  $('#view-root').innerHTML = authFormHtml({
    title: 'Welcome back',
    subtitle: 'Log in to your MarketHub account.',
    errorId: 'login-error',
    submitLabel: 'Log in',
    fields: `
      <div class="field">
        <label for="email">Email address</label>
        <input id="email" type="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password" required>
      </div>
      <p class="hint">Demo accounts — Admin: <code>admin@markethub.com / Admin123!</code> · User: <code>demo@markethub.com / Demo123!</code></p>`,
  });
  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('#login-error');
    errBox.innerHTML = '';
    const email = $('#email').value.trim();
    const password = $('#password').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return (errBox.innerHTML = '<div class="form-error">Enter a valid email address.</div>');
    if (!password) return (errBox.innerHTML = '<div class="form-error">Enter your password.</div>');
    try {
      await ensureCsrf();
      const { user } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      state.user = user;
      state.csrf = null; // server issued a fresh token with the new session
      await ensureCsrf();
      updateAuthArea();
      toast(`Welcome back, ${user.name}!`, 'success');
      location.hash = '#/home';
      router();
    } catch (err) {
      errBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    }
  });
}

async function renderRegister() {
  $('#view-root').innerHTML = authFormHtml({
    title: 'Create your account',
    subtitle: 'Join MarketHub to shop, track orders and more.',
    errorId: 'reg-error',
    submitLabel: 'Create account',
    fields: `
      <div class="field">
        <label for="name">Full name</label>
        <input id="name" autocomplete="name" required>
      </div>
      <div class="field">
        <label for="email">Email address</label>
        <input id="email" type="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="new-password" required>
        <p class="hint">8–128 characters, with at least one letter and one number.</p>
      </div>`,
  });
  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('#reg-error');
    errBox.innerHTML = '';
    const name = $('#name').value.trim();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    if (name.length < 2) return (errBox.innerHTML = '<div class="form-error">Name must be at least 2 characters.</div>');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return (errBox.innerHTML = '<div class="form-error">Enter a valid email address.</div>');
    if (password.length < 8) return (errBox.innerHTML = '<div class="form-error">Password must be at least 8 characters.</div>');
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return (errBox.innerHTML = '<div class="form-error">Password must contain a letter and a number.</div>');
    try {
      await ensureCsrf();
      const { user } = await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
      state.user = user;
      state.csrf = null;
      await ensureCsrf();
      updateAuthArea();
      toast('Account created — welcome to MarketHub!', 'success');
      location.hash = '#/home';
      router();
    } catch (err) {
      errBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    }
  });
}

/* ------------------------------ PROFILE & ORDERS ------------------------------ */

async function renderProfile() {
  if (!requireLogin()) return;
  const root = $('#view-root');
  const { user } = await api('/api/profile');
  root.innerHTML = `
    <div class="page-head"><h1>My profile</h1></div>
    <div class="cart-layout">
      <div class="card-panel">
        <h2 style="margin-top:0">Account details</h2>
        <p><strong>Name:</strong> ${escapeHtml(user.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
        <p><strong>Role:</strong> ${escapeHtml(user.role)}</p>
        <p><strong>Member since:</strong> ${escapeHtml(String(user.created_at).slice(0, 10))}</p>
        <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
        <h2>Update name</h2>
        <div id="profile-error"></div>
        <form id="profile-form">
          <div class="field">
            <label for="new-name">Full name</label>
            <input id="new-name" value="${escapeHtml(user.name)}" required>
          </div>
          <button class="btn btn-primary" type="submit">Save changes</button>
        </form>
      </div>
      <div class="card-panel">
        <h2 style="margin-top:0">Change password</h2>
        <div id="pw-error"></div>
        <form id="pw-form">
          <div class="field">
            <label for="current-pw">Current password</label>
            <input id="current-pw" type="password" autocomplete="current-password" required>
          </div>
          <div class="field">
            <label for="new-pw">New password</label>
            <input id="new-pw" type="password" autocomplete="new-password" required>
            <p class="hint">8–128 characters, with at least one letter and one number.</p>
          </div>
          <button class="btn btn-ghost" type="submit">Change password</button>
        </form>
        <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
        <a class="btn btn-ghost btn-block" href="#/orders">View my orders</a>
      </div>
    </div>`;

  $('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('#profile-error');
    try {
      await ensureCsrf();
      const { user: updated } = await api('/api/profile', { method: 'PUT', body: { name: $('#new-name').value.trim() } });
      state.user = updated;
      updateAuthArea();
      errBox.innerHTML = '<div class="form-success">Profile updated.</div>';
    } catch (err) {
      errBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    }
  });

  $('#pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('#pw-error');
    try {
      await ensureCsrf();
      await api('/api/profile/change-password', {
        method: 'POST',
        body: { currentPassword: $('#current-pw').value, newPassword: $('#new-pw').value },
      });
      errBox.innerHTML = '<div class="form-success">Password changed successfully.</div>';
      $('#pw-form').reset();
    } catch (err) {
      errBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    }
  });
}

async function renderOrders() {
  if (!requireLogin()) return;
  const root = $('#view-root');
  const { orders } = await api('/api/orders');
  root.innerHTML = `
    <div class="page-head"><h1>My orders</h1></div>
    ${orders.length ? orders.map(orderCard).join('') :
      `<div class="empty-state"><h2>No orders yet</h2><p>When you place an order it will appear here.</p>
       <a class="btn btn-primary" href="#/home">Start shopping</a></div>`}`;
}

function orderCard(o) {
  return `
    <div class="card-panel" style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <strong>Order #${o.id}</strong>
          <span class="muted"> · ${escapeHtml(String(o.created_at).replace('T', ' ').slice(0, 16))}</span>
        </div>
        <span class="status-pill ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span>
      </div>
      <div class="table-wrap" style="margin-top:12px">
        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead>
          <tbody>
            ${o.items.map((i) => `<tr>
              <td>${escapeHtml(i.product_name)}</td><td>${i.quantity}</td>
              <td>${money(i.price)}</td><td>${money(i.price * i.quantity)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="summary-row total"><span>Total</span><span>${money(o.total)}</span></div>
      ${o.shipping_name ? `<p class="muted" style="margin:4px 0 0">Deliver to: ${escapeHtml(o.shipping_name)} — ${escapeHtml(o.address)}</p>` : ''}
    </div>`;
}

/* ------------------------------ ADMIN ------------------------------ */

async function renderAdmin() {
  const root = $('#view-root');
  if (!state.user) { location.hash = '#/login'; return; }
  if (state.user.role !== 'admin') {
    root.innerHTML = `<div class="empty-state"><h2>Access denied</h2>
      <p>The admin dashboard is restricted to administrators.</p>
      <a class="btn btn-primary" href="#/home">Back to home</a></div>`;
    return;
  }
  root.innerHTML = `
    <div class="page-head">
      <h1>Admin dashboard</h1>
      <button class="btn btn-primary" id="add-product-btn">+ Add product</button>
    </div>
    <div class="tabs">
      <button class="tab-btn ${state.adminTab === 'products' ? 'active' : ''}" data-tab="products">Products</button>
      <button class="tab-btn ${state.adminTab === 'orders' ? 'active' : ''}" data-tab="orders">Orders</button>
      <button class="tab-btn ${state.adminTab === 'users' ? 'active' : ''}" data-tab="users">Users</button>
    </div>
    <div id="admin-content"><p class="muted">Loading…</p></div>`;

  $$('.tab-btn').forEach((b) => b.addEventListener('click', () => { state.adminTab = b.dataset.tab; renderAdmin(); }));
  $('#add-product-btn').addEventListener('click', () => productFormModal(null));

  const content = $('#admin-content');
  if (state.adminTab === 'products') {
    const { products } = await api('/api/products');
    content.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody>${products.map((p) => `<tr>
          <td>${p.id}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.category)}</td>
          <td>${money(p.price)}</td><td>${p.stock}</td>
          <td><div class="table-actions">
            <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del="${p.id}">Delete</button>
          </div></td></tr>`).join('')}</tbody>
      </table></div>`;
    $$('[data-edit]', content).forEach((b) => b.addEventListener('click', async () => {
      const { product } = await api(`/api/products/${b.dataset.edit}`);
      productFormModal(product);
    }));
    $$('[data-del]', content).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this product?')) return;
      try {
        await ensureCsrf();
        await api(`/api/products/${b.dataset.del}`, { method: 'DELETE' });
        toast('Product deleted', 'success');
        renderAdmin();
      } catch (err) { toast(err.message, 'error'); }
    }));
  }

  if (state.adminTab === 'orders') {
    const { orders } = await api('/api/admin/orders');
    content.innerHTML = orders.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Update</th></tr></thead>
        <tbody>${orders.map((o) => `<tr>
          <td>#${o.id}<br><span class="muted">${escapeHtml(String(o.created_at).slice(0, 10))}</span></td>
          <td>${escapeHtml(o.customer_name)}<br><span class="muted">${escapeHtml(o.customer_email)}</span></td>
          <td>${o.items.reduce((n, i) => n + i.quantity, 0)}</td>
          <td>${money(o.total)}</td>
          <td><span class="status-pill ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
          <td><select data-order-status="${o.id}" aria-label="Update status for order ${o.id}">
            ${['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) =>
              `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></td></tr>`).join('')}</tbody>
      </table></div>` :
      '<div class="empty-state"><h2>No orders yet</h2></div>';
    $$('[data-order-status]', content).forEach((sel) =>
      sel.addEventListener('change', async () => {
        try {
          await ensureCsrf();
          await api(`/api/admin/orders/${sel.dataset.orderStatus}/status`, { method: 'PUT', body: { status: sel.value } });
          toast('Order status updated', 'success');
          renderAdmin();
        } catch (err) { toast(err.message, 'error'); }
      })
    );
  }

  if (state.adminTab === 'users') {
    const { users } = await api('/api/admin/users');
    content.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>${users.map((u) => `<tr>
          <td>${u.id}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td>
          <td><span class="role-tag">${escapeHtml(u.role)}</span></td>
          <td>${escapeHtml(String(u.created_at).slice(0, 10))}</td>
          <td><div class="table-actions">
            ${u.id !== state.user.id ? `
              <button class="btn btn-ghost btn-sm" data-role="${u.id}">${u.role === 'admin' ? 'Make user' : 'Make admin'}</button>
              <button class="btn btn-danger btn-sm" data-userdel="${u.id}">Delete</button>` : '<span class="muted">You</span>'}
          </div></td></tr>`).join('')}</tbody>
      </table></div>`;
    $$('[data-role]', content).forEach((b) => b.addEventListener('click', async () => {
      const target = users.find((u) => u.id === Number(b.dataset.role));
      try {
        await ensureCsrf();
        await api(`/api/admin/users/${target.id}/role`, { method: 'PUT', body: { role: target.role === 'admin' ? 'user' : 'admin' } });
        toast('Role updated', 'success');
        renderAdmin();
      } catch (err) { toast(err.message, 'error'); }
    }));
    $$('[data-userdel]', content).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this user and all their orders?')) return;
      try {
        await ensureCsrf();
        await api(`/api/admin/users/${b.dataset.userdel}`, { method: 'DELETE' });
        toast('User deleted', 'success');
        renderAdmin();
      } catch (err) { toast(err.message, 'error'); }
    }));
  }
}

function productFormModal(product) {
  const isEdit = !!product;
  const close = openModal(isEdit ? 'Edit product' : 'Add product', `
    <div id="product-form-error"></div>
    <form id="product-form">
      <div class="field"><label for="pf-name">Name</label>
        <input id="pf-name" value="${escapeHtml(product?.name || '')}" required></div>
      <div class="field"><label for="pf-desc">Description</label>
        <textarea id="pf-desc" rows="3">${escapeHtml(product?.description || '')}</textarea></div>
      <div class="field"><label for="pf-price">Price ($)</label>
        <input id="pf-price" type="number" min="0" step="0.01" value="${product?.price ?? ''}" required></div>
      <div class="field"><label for="pf-cat">Category</label>
        <input id="pf-cat" value="${escapeHtml(product?.category || '')}" required></div>
      <div class="field"><label for="pf-stock">Stock</label>
        <input id="pf-stock" type="number" min="0" step="1" value="${product?.stock ?? 0}" required></div>
      <div class="field"><label for="pf-img">Image URL <span class="muted">(optional, https)</span></label>
        <input id="pf-img" value="${escapeHtml(product?.image_url || '')}"></div>
      <button class="btn btn-primary btn-block" type="submit">${isEdit ? 'Save changes' : 'Create product'}</button>
    </form>`);

  $('#product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('#product-form-error');
    const body = {
      name: $('#pf-name').value.trim(),
      description: $('#pf-desc').value.trim(),
      price: Number($('#pf-price').value),
      category: $('#pf-cat').value.trim(),
      stock: Number($('#pf-stock').value),
      image_url: $('#pf-img').value.trim(),
    };
    try {
      await ensureCsrf();
      if (isEdit) await api(`/api/products/${product.id}`, { method: 'PUT', body });
      else await api('/api/products', { method: 'POST', body });
      toast(isEdit ? 'Product updated' : 'Product created', 'success');
      close();
      renderAdmin();
    } catch (err) {
      errBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    }
  });
}

/* ------------------------------ SECURITY PAGE ------------------------------ */

async function renderSecurity() {
  $('#view-root').innerHTML = `
  <div class="doc-page">
    <h1>Application Security</h1>
    <p class="muted">MarketHub is built with defence-in-depth: every layer of the stack applies its own security controls.
    This page documents each measure and where it is implemented.</p>

    <section class="doc-section">
      <h2>1. Authentication &amp; password hashing</h2>
      <p>Passwords are never stored in plain text. They are hashed with <strong>bcrypt</strong> (cost factor 12) using a
      unique random salt per password. Login compares the candidate password against the hash with a constant-time
      comparison, and failure responses are generic (<em>"Invalid email or password"</em>) so attackers cannot learn
      whether an email address is registered.</p>
      <pre><code>const hash = bcrypt.hashSync(password, 12);   // salted, slow hash
const ok   = bcrypt.compareSync(password, user.password_hash);</code></pre>
    </section>

    <section class="doc-section">
      <h2>2. Session management</h2>
      <p>Sessions are stored <strong>server-side</strong> in the database; the browser only receives an opaque session ID in an
      <code>HttpOnly</code> cookie (invisible to JavaScript, so XSS cannot steal it), with <code>SameSite=Lax</code> and a 24-hour
      expiry. The session ID is <strong>regenerated on login</strong> to prevent session-fixation attacks, and destroyed on logout.</p>
    </section>

    <section class="doc-section">
      <h2>3. Role-based access control (RBAC)</h2>
      <p>Every user has a role — <code>user</code> or <code>admin</code>. Access-control middleware runs on every protected route:
      <code>requireAuth</code> for logged-in features and <code>requireAdmin</code> for the dashboard (product/user/order management).
      Additionally, order queries are always scoped to the session's user ID, so users can never view each other's orders.</p>
      <pre><code>function requireAdmin(req, res, next) {
  const u = currentUser(req);
  if (!u) return fail(res, 401, 'You must be logged in');
  if (u.role !== 'admin') return fail(res, 403, 'Admin access required');
  next();
}</code></pre>
    </section>

    <section class="doc-section">
      <h2>4. SQL injection protection</h2>
      <p>All database access uses <strong>parameterized queries</strong> (bound <code>?</code> placeholders). User input is sent to
      SQLite as data, never concatenated into SQL, so payloads like <code>' OR '1'='1</code> or
      <code>'; DROP TABLE users; --</code> are treated as ordinary strings. Sort order is chosen from a server-side whitelist,
      and LIKE wildcards in search terms are escaped.</p>
      <pre><code>db.prepare('SELECT * FROM users WHERE email = ?').get(email);</code></pre>
    </section>

    <section class="doc-section">
      <h2>5. Cross-Site Scripting (XSS) protection</h2>
      <p>Three layers: (1) a strict <strong>Content-Security-Policy</strong> that forbids inline scripts;
      (2) <strong>output encoding</strong> — every dynamic value is HTML-escaped before rendering;
      (3) <code>HttpOnly</code> cookies so even a successful script injection cannot read the session.</p>
      <pre><code>function escapeHtml(s) {
  return String(s).replace(/[&amp;&lt;&gt;"']/g, c =&gt; ({'&amp;':'&amp;amp;','&lt;':'&amp;lt;','&gt;':'&amp;gt;','"':'&amp;quot;',"'":'&amp;#39;'}[c]));
}</code></pre>
    </section>

    <section class="doc-section">
      <h2>6. CSRF protection</h2>
      <p>Every state-changing request (POST/PUT/DELETE) must carry a per-session <strong>CSRF token</strong> in the
      <code>X-CSRF-Token</code> header. The token is generated with a cryptographic RNG, stored in the server-side session,
      and compared in constant time. Combined with <code>SameSite=Lax</code> cookies, cross-site forged requests are rejected.</p>
    </section>

    <section class="doc-section">
      <h2>7. Input validation</h2>
      <p>All input is validated on the server (never trusting the client): email format, password policy
      (8–128 chars, letter + number), string length limits, numeric ranges for prices/stock, whitelisted enums for
      roles and order statuses, and a 100 KB request-body size limit. Invalid input is rejected with a 400 error
      before it reaches the database.</p>
    </section>

    <section class="doc-section">
      <h2>8. Brute-force &amp; abuse protection</h2>
      <p>Authentication endpoints are rate-limited (30 attempts per IP per 15 minutes by default), slowing down
      credential-stuffing and brute-force attacks. Generic login errors avoid account enumeration.</p>
    </section>

    <section class="doc-section">
      <h2>9. Security headers &amp; HTTPS</h2>
      <p><strong>Helmet</strong> sets hardened headers: Content-Security-Policy, Strict-Transport-Security (HSTS),
      X-Content-Type-Options (nosniff), frame-ancestors (clickjacking protection) and more. In production the app
      should be served over <strong>HTTPS</strong> — either via the built-in TLS support (set <code>HTTPS_KEY</code> /
      <code>HTTPS_CERT</code>) or, more commonly, behind a reverse proxy such as Nginx with Let's Encrypt. With
      <code>NODE_ENV=production</code>, session cookies also get the <code>Secure</code> flag so they are only sent over HTTPS.</p>
    </section>

    <section class="doc-section">
      <h2>10. Sensitive data handling</h2>
      <p>Password hashes are never selected in API queries and never returned in responses. Error handlers return
      generic messages — stack traces and internal details stay in server logs. Secrets (session key) come from
      environment variables, not source code.</p>
    </section>
  </div>`;
}

/* ------------------------------ TESTING PAGE ------------------------------ */

async function renderTesting() {
  const root = $('#view-root');
  root.innerHTML = `
    <div class="doc-page">
      <h1>Testing Report</h1>
      <p class="muted">The application is covered by an automated test suite (<code>npm test</code>) that exercises
      functional behaviour, form validation, security controls, error handling and the database layer against a
      live instance of the server. The latest results are shown below.</p>
      <div id="test-results"><p class="muted">Loading latest test results…</p></div>

      <section class="doc-section">
        <h2>What is tested</h2>
        <ul>
          <li><strong>Functional testing</strong> — product browsing, search &amp; filters, cart checkout, order history, admin CRUD.</li>
          <li><strong>Login / registration testing</strong> — valid and invalid credentials, duplicate accounts, logout, session persistence.</li>
          <li><strong>Form validation testing</strong> — email format, password policy, required fields, numeric ranges, payload size limits.</li>
          <li><strong>Security testing</strong> — SQL-injection attempts, XSS payloads, CSRF tokens, unauthenticated &amp; unauthorized access, session-cookie flags, security headers, rate limiting.</li>
          <li><strong>Database testing</strong> — password hashing at rest, seeded roles, referential integrity, parameterized queries.</li>
          <li><strong>Error handling</strong> — malformed JSON, unknown routes, invalid IDs, oversized payloads.</li>
          <li><strong>Usability &amp; responsive testing</strong> — viewport meta tag, responsive breakpoints, mobile navigation, accessible labels.</li>
        </ul>
      </section>

      <section class="doc-section">
        <h2>How to run the tests</h2>
        <pre><code>cd marketplace
npm install
npm test</code></pre>
        <p>The suite starts the real server on an ephemeral port with a throwaway database, runs every test over
        HTTP, writes results to <code>public/test-results.json</code> (rendered above) and a full report to
        <code>TESTING.md</code>, then exits with code 0 only if all tests pass.</p>
      </section>
    </div>`;

  try {
    const res = await fetch('/test-results.json');
    if (!res.ok) throw new Error('no results');
    const data = await res.json();
    const pass = data.results.filter((r) => r.status === 'PASS').length;
    const failCount = data.results.length - pass;
    $('#test-results').innerHTML = `
      <div class="test-summary">
        <div class="stat-card"><div class="num">${data.results.length}</div><div class="label">Tests run</div></div>
        <div class="stat-card"><div class="num pass">${pass}</div><div class="label">Passed</div></div>
        <div class="stat-card"><div class="num ${failCount ? 'fail' : 'pass'}">${failCount}</div><div class="label">Failed</div></div>
        <div class="stat-card"><div class="num">${escapeHtml(String(data.timestamp).slice(0, 19).replace('T', ' '))}</div><div class="label">Last run (UTC)</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Test</th><th>Result</th></tr></thead>
        <tbody>${data.results.map((r) => `<tr>
          <td>${escapeHtml(r.name)}</td>
          <td class="${r.status === 'PASS' ? 'pass' : 'fail'}">${r.status}${r.error ? ` — ${escapeHtml(r.error)}` : ''}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
  } catch {
    $('#test-results').innerHTML = '<p class="muted">No test results yet — run <code>npm test</code> in the project folder to generate them.</p>';
  }
}

/* ------------------------------ Init ------------------------------ */

$('#burger').addEventListener('click', () => {
  const nav = $('#main-nav');
  const open = nav.classList.toggle('open');
  $('#burger').setAttribute('aria-expanded', String(open));
});

async function init() {
  updateCartBadge();
  try {
    const { user } = await api('/api/auth/me');
    state.user = user;
  } catch { /* not logged in */ }
  try { await ensureCsrf(); } catch { /* offline */ }
  updateAuthArea();
  router();
}

document.addEventListener('DOMContentLoaded', init);
