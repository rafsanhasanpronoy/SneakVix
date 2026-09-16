// api.js — shared across every page. Talks to the Django backend with plain fetch().
const API_BASE = (() => {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:8000/api";
  }
  // Set this to your deployed Django backend's real URL once it's live —
  // see the deployment steps. Everything else in this file is unaffected.
  return "https://YOUR-BACKEND-DOMAIN.onrender.com/api";
})();

async function apiRequest(path, { method = "GET", body, auth = true, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";

  const token = localStorage.getItem("access");
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  // Access token expired — try refreshing once, then retry the request.
  if (res.status === 401 && auth && localStorage.getItem("refresh")) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("access")}`;
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      });
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || data.detail || "Request failed");
    error.data = data;
    error.status = res.status;
    throw error;
  }
  return data;
}

async function tryRefresh() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: localStorage.getItem("refresh") }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    localStorage.setItem("access", data.access);
    return true;
  } catch {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    return false;
  }
}

const api = {
  get: (path) => apiRequest(path),
  post: (path, body, opts = {}) => apiRequest(path, { method: "POST", body, ...opts }),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body }),
  del: (path) => apiRequest(path, { method: "DELETE" }),
};

function isLoggedIn() {
  return !!localStorage.getItem("access");
}

function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
  const base = window.location.pathname.includes("/admin/") ? "../" : "";
  window.location.href = `${base}index.html`;
}

function currentUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function mediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path; // already a full URL (e.g. Supabase Storage)
  return `http://localhost:8000/media/${path}`;
}

function formatPrice(amount) {
  const n = Number(amount) || 0;
  return "\u09F3 " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Shared product-card markup used on the homepage, shop grid, image search
// results, and "You may also like" — one place to change the card design.
// Image and name link to the detail page; the button quick-adds to cart
// (see the click-delegation handler further down this file).
function productCardHtml(p) {
  return `
    <div class="product-card">
      <a class="product-card-media" href="product.html?id=${p.id}">
        <img src="${mediaUrl(p.image_main)}" alt="${p.name}" />
      </a>
      <span class="brand">${p.brand}</span>
      <a class="product-card-title-link" href="product.html?id=${p.id}"><h3>${p.name}</h3></a>
      <div class="price">${formatPrice(p.price)}</div>
      <button type="button" class="quick-add-btn" data-product-id="${p.id}">
        <span class="btn-label">Add to Cart</span>
      </button>
    </div>
  `;
}

// ---------------- Guest cart (localStorage) ----------------
// Lets someone add to cart without an account. Items live entirely in the
// browser as [{ product_id, size, quantity }, ...] until they log in, at
// which point mergeGuestCartIntoServerCart() pushes them into the real
// server-side cart and clears local storage. Checkout still requires login
// (unchanged, enforced by the backend) — this only relaxes add-to-cart.
const GUEST_CART_KEY = "sneakvix-guest-cart";

function getGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function addToGuestCart(productId, size, qty = 1) {
  const items = getGuestCart();
  const existing = items.find((i) => i.product_id === productId && i.size === size);
  if (existing) {
    existing.quantity += qty;
  } else {
    items.push({ product_id: productId, size, quantity: qty });
  }
  saveGuestCart(items);
}

function removeFromGuestCart(productId, size) {
  saveGuestCart(getGuestCart().filter((i) => !(i.product_id === productId && i.size === size)));
}

function getGuestCartCount() {
  return getGuestCart().reduce((sum, i) => sum + i.quantity, 0);
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

async function mergeGuestCartIntoServerCart() {
  const items = getGuestCart();
  if (items.length === 0) return;
  for (const item of items) {
    try {
      // POST adds one unit per call (see cart.js/product.js) — loop to
      // match the quantity the guest had queued up.
      for (let i = 0; i < item.quantity; i++) {
        await api.post("/cart/", { product_id: item.product_id, size: item.size });
      }
    } catch {
      // e.g. it went out of stock while they were browsing as a guest —
      // skip that one item rather than aborting the whole merge.
    }
  }
  clearGuestCart();
}

// Unified cart fetch — works for both logged-in (server /cart/) and guest
// (localStorage) shoppers, returning the same shape either way. Used by
// both cart.js and the header mini-cart dropdown so they never drift.
async function getUnifiedCartItems() {
  if (isLoggedIn()) {
    const items = await api.get("/cart/"); // let caller catch failures
    return { items, isGuest: false };
  }

  const guestItems = getGuestCart();
  if (guestItems.length === 0) return { items: [], isGuest: true };

  const results = await Promise.allSettled(
    guestItems.map(async (gi) => ({ gi, product: await api.get(`/products/${gi.product_id}/`) }))
  );

  const items = [];
  const stillValid = [];
  results.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      const { gi, product: p } = r.value;
      items.push({
        id: `${gi.product_id}-${gi.size}`,
        product_id: gi.product_id,
        product_name: p.name,
        product_price: p.price,
        product_image: p.image_main,
        size: gi.size,
        quantity: gi.quantity,
      });
      stillValid.push(guestItems[idx]);
    }
    // rejected = product no longer exists; drop it from the guest cart
  });
  if (stillValid.length !== guestItems.length) saveGuestCart(stillValid);

  return { items, isGuest: true };
}

// ---------------- Reusable glass modal (confirm-style) ----------------
function openConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, onConfirm }) {
  closeModal(); // only one at a time

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "activeModal";
  overlay.innerHTML = `
    <div class="modal-box glass-panel">
      <h3 class="modal-title">${title}</h3>
      <p class="modal-message">${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn-outline" id="modalCancelBtn">Cancel</button>
        <button type="button" class="btn btn-primary" id="modalConfirmBtn" style="${danger ? "background:var(--danger);color:#fff;" : ""}">${confirmLabel}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.getElementById("modalCancelBtn").addEventListener("click", closeModal);
  document.getElementById("modalConfirmBtn").addEventListener("click", () => {
    closeModal();
    onConfirm();
  });
}

function closeModal() {
  const overlay = document.getElementById("activeModal");
  if (!overlay) return;
  overlay.classList.remove("open");
  setTimeout(() => overlay.remove(), 250);
}
// Delegated on document so it works for cards rendered by any page/script,
// including ones injected after this file has already run.
document.addEventListener("click", (e) => {
  const chip = e.target.closest(".quick-size-chip");
  if (chip) {
    e.preventDefault();
    handleQuickSizePick(chip);
    return;
  }
  const btn = e.target.closest(".quick-add-btn");
  if (btn) {
    e.preventDefault();
    handleQuickAddClick(btn);
  }
});

async function handleQuickAddClick(btn) {
  if (btn.dataset.busy || btn.classList.contains("size-mode")) return;
  btn.dataset.busy = "1";
  const label = btn.querySelector(".btn-label");
  const originalText = label ? label.textContent : "Add to Cart";
  if (label) label.textContent = "Loading...";

  try {
    const productId = Number(btn.dataset.productId);
    const p = await api.get(`/products/${productId}/`);
    if (!p.sizes || p.sizes.length === 0) {
      if (label) label.textContent = "Out of stock";
      setTimeout(() => {
        if (label) label.textContent = originalText;
      }, 1400);
    } else if (p.sizes.length === 1) {
      // Only one size in stock — skip the picker, add it directly.
      await addQuickItem(productId, p.sizes[0].size);
      showAddedAnimation(btn, originalText);
    } else {
      showSizeChips(btn, productId, p.sizes, originalText);
    }
  } catch {
    if (label) label.textContent = originalText;
  } finally {
    delete btn.dataset.busy;
  }
}

function showSizeChips(btn, productId, sizes, originalText) {
  btn.classList.add("size-mode");
  btn.dataset.originalText = originalText;
  btn.dataset.productId = productId;
  btn.innerHTML = `
    <div class="quick-size-chips">
      ${sizes.map((s) => `<button type="button" class="quick-size-chip" data-size="${s.size}">${s.size}</button>`).join("")}
    </div>
  `;
}

async function handleQuickSizePick(chip) {
  const btn = chip.closest(".quick-add-btn");
  if (!btn || btn.dataset.busy) return;
  btn.dataset.busy = "1";
  const productId = Number(btn.dataset.productId);
  const size = Number(chip.dataset.size);
  const originalText = btn.dataset.originalText || "Add to Cart";

  await addQuickItem(productId, size);
  showAddedAnimation(btn, originalText);
  delete btn.dataset.busy;
}

async function addQuickItem(productId, size) {
  if (isLoggedIn()) {
    try {
      await api.post("/cart/", { product_id: productId, size });
    } catch {
      // stock may have changed between fetch and click; silently ignore
      // here since the size picker already reflected sizes as of the fetch
    }
  } else {
    addToGuestCart(productId, size, 1);
  }
  if (typeof updateCartCount === "function") updateCartCount();
  if (typeof bumpCartBadge === "function") bumpCartBadge();
}

function showAddedAnimation(btn, originalText) {
  btn.classList.remove("size-mode");
  btn.classList.add("added-flash");
  btn.innerHTML = `<span class="btn-label">\u2713 Added!</span>`;
  setTimeout(() => {
    btn.classList.remove("added-flash");
    btn.innerHTML = `<span class="btn-label">${originalText}</span>`;
  }, 1300);
}

function requireLogin() {
  if (!isLoggedIn()) {
    const base = window.location.pathname.includes("/admin/") ? "../" : "";
    window.location.href = `${base}login.html`;
  }
}