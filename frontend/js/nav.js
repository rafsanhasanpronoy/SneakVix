// nav.js — injects the navbar into #navbar on every page and keeps the cart count live.
const SUN_ICON = '<svg class="icon-sun" width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const MOON_ICON = '<svg class="icon-moon" width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';

const THEME_KEY = "sneakvix-theme";

function applyStoredTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  document.documentElement.classList.toggle("light-mode", theme === "light");
}

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle("light-mode");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}

applyStoredTheme(); // run immediately, not just on DOMContentLoaded, to avoid a flash of the wrong theme

function navLinks(base, currentPage) {
  const links = [
    { href: `${base}index.html`, label: "Home", page: "index.html" },
    { href: `${base}products.html`, label: "Shop", page: "products.html" },
    { href: `${base}image-search.html`, label: "Image Search", page: "image-search.html" },
  ];
  return links
    .map(
      (l) =>
        `<a href="${l.href}" class="${l.page === currentPage ? "active" : ""}">${l.label}</a>`
    )
    .join("");
}

function renderNav() {
  const el = document.getElementById("navbar");
  if (!el) return;

  const user = currentUser();

  // pages inside /admin/ need "../" to reach the top-level pages
  const base = window.location.pathname.includes("/admin/") ? "../" : "";
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  el.innerHTML = `
    <header>
      <div class="container header-flex">
        <a href="${base}index.html" class="logo">
          <img class="logo-dark" src="https://gargfwngcvmoggilbvfl.supabase.co/storage/v1/object/public/sneaker/logo.png" alt="SneakVix" />
          <img class="logo-light" src="https://gargfwngcvmoggilbvfl.supabase.co/storage/v1/object/public/sneaker/logo-light.png" alt="SneakVix" />
        </a>

        <nav class="nav-links">
          ${navLinks(base, currentPage)}
        </nav>

        <form class="header-search" id="headerSearchForm">
          <input type="search" id="headerSearchInput" placeholder="Search sneakers..." autocomplete="off" />
          <button type="submit" aria-label="Search">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/></svg>
          </button>
        </form>

        <div class="nav-right">
          <button id="themeToggle" class="theme-toggle" aria-label="Toggle light/dark mode" title="Toggle light/dark mode">
            ${SUN_ICON}${MOON_ICON}
          </button>
          <div class="cart-dropdown-wrap" id="cartDropdownWrap">
            <a href="${base}cart.html" class="nav-signin" id="cartCountLink">Cart (0)</a>
            <div class="cart-dropdown glass-panel" id="cartDropdown">
              <p class="cart-dropdown-empty">Loading...</p>
            </div>
          </div>
          ${
            user
              ? `
            <a href="${base}profile.html" class="nav-signin">${user.username}</a>
            ${user.role === "admin" ? `<a href="${base}admin/index.html" class="admin-link">Admin</a>` : ""}
            <button id="logoutBtn" class="logout-btn">Logout</button>
          `
              : `
            <a href="${base}login.html" class="nav-signin">Sign in</a>
            <a href="${base}signup.html" class="nav-signup">Sign up</a>
          `
          }
        </div>
      </div>
    </header>
  `;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  document.getElementById("headerSearchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("headerSearchInput").value.trim();
    window.location.href = `${base}products.html${q ? `?search=${encodeURIComponent(q)}` : ""}`;
  });

  document.getElementById("cartDropdownWrap").addEventListener("mouseenter", renderCartDropdown);

  updateCartCount();
}

async function renderCartDropdown() {
  const el = document.getElementById("cartDropdown");
  try {
    const { items } = await getUnifiedCartItems();

    if (items.length === 0) {
      el.innerHTML = `
        <p class="cart-dropdown-title">Your Cart</p>
        <p class="cart-dropdown-empty">Your cart is empty.</p>
      `;
      return;
    }

    const subtotal = items.reduce((sum, i) => sum + Number(i.product_price) * i.quantity, 0);
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    const base = window.location.pathname.includes("/admin/") ? "../" : "";

    el.innerHTML = `
      <p class="cart-dropdown-title">Your Cart (${totalQty})</p>
      ${items
        .map(
          (i) => `
        <div class="cart-dropdown-row">
          <img src="${mediaUrl(i.product_image)}" alt="${i.product_name}" />
          <div class="cart-dropdown-info">
            <h5>${i.product_name}</h5>
            <small>Size ${i.size} &middot; Qty ${i.quantity}</small>
          </div>
          <span class="cart-dropdown-price">${formatPrice(i.product_price * i.quantity)}</span>
          <button class="cart-dropdown-remove" data-id="${i.id}" data-product-id="${i.product_id}" data-size="${i.size}" aria-label="Remove">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      `
        )
        .join("")}
      <div class="cart-dropdown-footer">
        <div class="cart-dropdown-subtotal"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        <div class="cart-dropdown-actions">
          <a href="${base}cart.html" class="view-cart">View Cart</a>
          <a href="${base}${isLoggedIn() ? "checkout.html" : "login.html?next=checkout.html"}" class="checkout-link">Checkout</a>
        </div>
      </div>
    `;

    el.querySelectorAll(".cart-dropdown-remove").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (isLoggedIn()) {
          await api.del(`/cart/${btn.dataset.id}/`);
        } else {
          removeFromGuestCart(Number(btn.dataset.productId), Number(btn.dataset.size));
        }
        renderCartDropdown();
        updateCartCount();
      });
    });
  } catch {
    el.innerHTML = `<p class="cart-dropdown-empty">Could not load your cart.</p>`;
  }
}

async function updateCartCount() {
  const link = document.getElementById("cartCountLink");
  if (!isLoggedIn()) {
    if (link) link.textContent = `Cart (${getGuestCartCount()})`;
    return;
  }
  try {
    const items = await api.get("/cart/");
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    if (link) link.textContent = `Cart (${count})`;
  } catch {
    // token might be stale; leave the default "Cart (0)" in place
  }
}

function bumpCartBadge() {
  const link = document.getElementById("cartCountLink");
  if (!link) return;
  link.classList.remove("cart-bump");
  void link.offsetWidth; // restart the animation even if triggered again quickly
  link.classList.add("cart-bump");
}

document.addEventListener("DOMContentLoaded", renderNav);