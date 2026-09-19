// admin-nav.js — injects the admin sidebar into #adminSidebar on every admin
// page, highlights the active section, and guards the whole admin area.
const ADMIN_ICONS = {
  dashboard: '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z"/></svg>',
  products: '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
  orders: '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>',
  users: '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
};

function renderAdminSidebar() {
  const el = document.getElementById("adminSidebar");
  if (!el) return;

  const user = currentUser();
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const username = escapeHtml(user?.username || "");
  const links = [
    { href: "index.html", label: "Dashboard", icon: "dashboard", pages: ["index.html"] },
    { href: "products.html", label: "Products", icon: "products", pages: ["products.html", "add-product.html", "edit-product.html"] },
    { href: "orders.html", label: "Orders", icon: "orders", pages: ["orders.html", "order-detail.html"] },
    { href: "users.html", label: "Users", icon: "users", pages: ["users.html"] },
  ];

  el.innerHTML = `
    <div class="admin-sidebar-logo">
      <img src="https://gargfwngcvmoggilbvfl.supabase.co/storage/v1/object/public/sneaker/logo.png" alt="SneakVix" />
    </div>
    <div class="admin-sidebar-tag">Admin panel</div>
    <nav class="admin-nav-links">
      ${links
        .map(
          (l) => `
        <a href="${escapeHtml(l.href)}" class="${l.pages.includes(currentPage) ? "active" : ""}">
          ${ADMIN_ICONS[l.icon]} ${escapeHtml(l.label)}
        </a>
      `
        )
        .join("")}
    </nav>
    <div class="admin-sidebar-foot">
      <div class="admin-user-chip">Signed in as <strong>&nbsp;${username}</strong></div>
      <button class="admin-logout-btn" id="adminLogoutBtn">Log out</button>
      <a href="../index.html" class="admin-logout-btn" style="display:block;text-align:center;text-decoration:none;margin-top:8px;">&larr; Back to store</a>
    </div>
  `;

  document.getElementById("adminLogoutBtn").addEventListener("click", logout);

  document.getElementById("adminMobileToggle")?.remove();
  document.getElementById("adminMobileOverlay")?.remove();

  const toggle = document.createElement("button");
  toggle.className = "admin-mobile-toggle";
  toggle.id = "adminMobileToggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Open admin menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = "<span aria-hidden=\"true\">⋮</span>";

  const overlay = document.createElement("div");
  overlay.className = "admin-mobile-overlay";
  overlay.id = "adminMobileOverlay";

  document.body.append(toggle, overlay);

  const sidebar = document.getElementById("adminSidebar");
  const closeAdminMenu = () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open admin menu");
    document.body.classList.remove("admin-menu-open");
  };
  toggle.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    overlay.classList.toggle("open", open);
    toggle.classList.toggle("open", open);
    toggle.textContent = open ? "×" : "⋮";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close admin menu" : "Open admin menu");
    document.body.classList.toggle("admin-menu-open", open);
  });
  overlay.addEventListener("click", closeAdminMenu);
  sidebar.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeAdminMenu));
}

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  const user = currentUser();
  if (user?.role !== "admin") {
    window.location.href = "../index.html";
    return;
  }
  document.body.classList.add("admin-body");
  renderAdminSidebar();
});
