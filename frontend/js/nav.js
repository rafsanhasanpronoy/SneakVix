// nav.js — injects the navbar into #navbar on every page and keeps the cart count live.
const SUN_ICON = '<svg class="icon-sun" width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const MOON_ICON = '<svg class="icon-moon" width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
const MENU_ICON = '<svg class="menu-icon" width="22" height="22" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
const CLOSE_ICON = '<svg class="close-icon" width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>';
const THEME_KEY = "sneakvix-theme";

function loadMobileNavStyles() {
  if (document.getElementById("sneakvix-mobile-nav-css")) return;
  const link = document.createElement("link");
  link.id = "sneakvix-mobile-nav-css";
  link.rel = "stylesheet";
  link.href = `${window.location.pathname.includes("/admin/") ? "../" : ""}css/mobile-nav.css`;
  document.head.appendChild(link);
}

function applyStoredTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  document.documentElement.classList.toggle("light-mode", theme === "light");
}
function toggleTheme() {
  const isLight = document.documentElement.classList.toggle("light-mode");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}

loadMobileNavStyles();
applyStoredTheme();

function navLinks(base, currentPage) {
  const links = [
    { href: `${base}index.html`, label: "Home", page: "index.html" },
    { href: `${base}products.html`, label: "Shop", page: "products.html" },
    { href: `${base}image-search.html`, label: "Image Search", page: "image-search.html" },
  ];
  return links.map((l) => `<a href="${escapeHtml(l.href)}" class="${l.page === currentPage ? "active" : ""}">${escapeHtml(l.label)}</a>`).join("");
}

function closeMobileNav() {
  document.getElementById("mobileNavPanel")?.classList.remove("open");
  document.getElementById("mobileNavOverlay")?.classList.remove("open");
  document.getElementById("mobileMenuToggle")?.classList.remove("open");
  document.getElementById("mobileMenuToggle")?.setAttribute("aria-expanded", "false");
  document.getElementById("mobileMenuToggle")?.setAttribute("aria-label", "Open navigation menu");
  document.body.classList.remove("mobile-menu-open");
}

function renderNav() {
  const el = document.getElementById("navbar");
  if (!el) return;
  const user = currentUser();
  const base = window.location.pathname.includes("/admin/") ? "../" : "";
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const username = escapeHtml(user?.username || "");

  el.innerHTML = `
    <header>
      <div class="container header-flex">
        <a href="${escapeHtml(base)}index.html" class="logo">
          <img class="logo-dark" src="https://gargfwngcvmoggilbvfl.supabase.co/storage/v1/object/public/sneaker/logo.png" alt="SneakVix" />
          <img class="logo-light" src="https://gargfwngcvmoggilbvfl.supabase.co/storage/v1/object/public/sneaker/logo-light.png" alt="SneakVix" />
        </a>
        <button class="mobile-menu-toggle" id="mobileMenuToggle" type="button" aria-label="Open navigation menu" aria-expanded="false">
          ${MENU_ICON}${CLOSE_ICON}
        </button>
        <div class="mobile-nav-overlay" id="mobileNavOverlay"></div>
        <div class="mobile-nav-panel" id="mobileNavPanel">
          <nav class="nav-links">${navLinks(base, currentPage)}</nav>
          <form class="header-search" id="headerSearchForm">
            <input type="search" id="headerSearchInput" placeholder="Search sneakers..." autocomplete="off" />
            <button type="submit" aria-label="Search">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/></svg>
            </button>
          </form>
          <div class="nav-right">
            <button id="themeToggle" class="theme-toggle" aria-label="Toggle light/dark mode" title="Toggle light/dark mode">${SUN_ICON}${MOON_ICON}</button>
            <a href="${escapeHtml(base)}cart.html" class="nav-signin" id="cartCountLink">Cart (0)</a>
            ${user ? `<a href="${escapeHtml(base)}profile.html" class="nav-signin">${username}</a>${user.role === "admin" ? `<a href="${escapeHtml(base)}admin/index.html" class="admin-link">Admin</a>` : ""}<button id="logoutBtn" class="logout-btn">Logout</button>` : `<a href="${escapeHtml(base)}login.html" class="nav-signin">Sign in</a><a href="${escapeHtml(base)}signup.html" class="nav-signup">Sign up</a>`}
          </div>
        </div>
      </div>
    </header>`;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  document.getElementById("mobileMenuToggle").addEventListener("click", () => {
    const toggle = document.getElementById("mobileMenuToggle");
    const panel = document.getElementById("mobileNavPanel");
    const overlay = document.getElementById("mobileNavOverlay");
    const open = panel.classList.toggle("open");
    toggle.classList.toggle("open", open);
    overlay.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    document.body.classList.toggle("mobile-menu-open", open);
  });

  document.getElementById("mobileNavOverlay").addEventListener("click", closeMobileNav);
  document.querySelectorAll("#mobileNavPanel a").forEach((link) => link.addEventListener("click", closeMobileNav));

  document.getElementById("headerSearchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("headerSearchInput").value.trim();
    closeMobileNav();
    window.location.href = `${base}products.html${q ? `?search=${encodeURIComponent(q)}` : ""}`;
  });
  updateCartCount();
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
  } catch {}
}

function bumpCartBadge() {
  const link = document.getElementById("cartCountLink");
  if (!link) return;
  link.classList.remove("cart-bump");
  void link.offsetWidth;
  link.classList.add("cart-bump");
}

document.addEventListener("DOMContentLoaded", renderNav);
