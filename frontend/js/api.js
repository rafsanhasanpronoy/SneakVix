// api.js — shared across every page. Talks to the Django backend with plain fetch().
const API_BASE = "https://sneakvix.onrender.com/api";
const MEDIA_BASE = "https://sneakvix.onrender.com/media";

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
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = String(path).replace(/^\/+/, "");
  return `${MEDIA_BASE}/${cleanPath}`;
}

function formatPrice(amount) {
  const n = Number(amount) || 0;
  return "\u09F3 " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function productCardHtml(p) {
  const name = escapeHtml(p.name);
  const brand = escapeHtml(p.brand);
  const image = escapeHtml(mediaUrl(p.image_main));
  const id = encodeURIComponent(p.id);
  return `
    <div class="product-card">
      <a class="product-card-media" href="product.html?id=${id}">
        <img src="${image}" alt="${name}" />
      </a>
      <span class="brand">${brand}</span>
      <a class="product-card-title-link" href="product.html?id=${id}"><h3>${name}</h3></a>
      <div class="price">${formatPrice(p.price)}</div>
      <button type="button" class="quick-add-btn" data-product-id="${escapeHtml(p.id)}">
        <span class="btn-label">Add to Cart</span>
      </button>
    </div>`;
}

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
  if (existing) existing.quantity += qty;
  else items.push({ product_id: productId, size, quantity: qty });
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
  if (!items.length) return;

  const remaining = [];
  for (const item of items) {
    let mergedQuantity = 0;
    for (let i = 0; i < item.quantity; i++) {
      try {
        await api.post("/cart/", { product_id: item.product_id, size: item.size });
        mergedQuantity += 1;
      } catch {
        break;
      }
    }

    const unmergedQuantity = item.quantity - mergedQuantity;
    if (unmergedQuantity > 0) {
      remaining.push({ ...item, quantity: unmergedQuantity });
    }
  }

  if (remaining.length) saveGuestCart(remaining);
  else clearGuestCart();
}

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
    const availableSizes = (p.sizes || []).filter((s) => Number(s.stock) > 0);
    if (!availableSizes.length) {
      if (label) label.textContent = "Out of stock";
      setTimeout(() => { if (label) label.textContent = originalText; }, 1400);
    } else if (availableSizes.length === 1) {
      await addQuickItem(productId, availableSizes[0].size);
      showAddedAnimation(btn, originalText);
    } else {
      showSizeChips(btn, productId, availableSizes, originalText);
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
  btn.innerHTML = `<div class="quick-size-chips">${sizes.map((s) => `<button type="button" class="quick-size-chip" data-size="${escapeHtml(s.size)}">${escapeHtml(s.size)}</button>`).join("")}</div>`;
}

async function handleQuickSizePick(chip) {
  const btn = chip.closest(".quick-add-btn");
  if (!btn || btn.dataset.busy) return;
  btn.dataset.busy = "1";
  const productId = Number(btn.dataset.productId);
  const size = Number(chip.dataset.size);
  const originalText = btn.dataset.originalText || "Add to Cart";
  try {
    await addQuickItem(productId, size);
    showAddedAnimation(btn, originalText);
  } catch {
    btn.classList.remove("size-mode");
    btn.innerHTML = `<span class="btn-label">${escapeHtml(originalText)}</span>`;
  } finally {
    delete btn.dataset.busy;
  }
}

async function addQuickItem(productId, size) {
  if (isLoggedIn()) {
    await api.post("/cart/", { product_id: productId, size });
  } else {
    addToGuestCart(productId, size, 1);
  }
  if (typeof updateCartCount === "function") updateCartCount();
  if (typeof bumpCartBadge === "function") bumpCartBadge();
}

function showAddedAnimation(btn, originalText) {
  btn.classList.remove("size-mode");
  btn.classList.add("added-flash");
  btn.innerHTML = `<span class="btn-label">✓ Added!</span>`;
  setTimeout(() => {
    btn.classList.remove("added-flash");
    btn.innerHTML = `<span class="btn-label">${escapeHtml(originalText)}</span>`;
  }, 1300);
}

function requireLogin() {
  if (!isLoggedIn()) {
    const base = window.location.pathname.includes("/admin/") ? "../" : "";
    window.location.href = `${base}login.html`;
  }
}
