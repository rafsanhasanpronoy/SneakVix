// admin-dashboard.js — overview stat cards + recent orders.
// Products/orders come from endpoints already used elsewhere in this app.
// The users count needs a /admin/users/ endpoint — if that route doesn't
// exist yet on your backend, the Users stat card just shows "—" instead of
// breaking the rest of the dashboard.
document.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
  const [orders, products, users] = await Promise.all([
    api.get("/admin/orders/").catch(() => null),
    api.get("/products/").catch(() => null),
    api.get("/admin/users/").catch(() => null),
  ]);

  renderStats(orders, products, users);
  renderRecentOrders(orders);
}

function renderStats(orders, products, users) {
  const grid = document.getElementById("statGrid");

  const revenue = orders
    ? orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total_amount), 0)
    : null;

  const cards = [
    {
      label: "Revenue",
      value: revenue === null ? "—" : formatPrice(revenue),
      color: "#FF3C00",
      bg: "#fff5f2",
      border: "#ffe0d8",
      icon: '<svg width="14" height="14" fill="none" stroke="#FF3C00" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    },
    {
      label: "Orders",
      value: orders ? orders.length : "—",
      color: "#111",
      bg: "#eff6ff",
      border: "#bfdbfe",
      icon: '<svg width="14" height="14" fill="none" stroke="#2563eb" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>',
    },
    {
      label: "Products",
      value: products ? products.length : "—",
      color: "#111",
      bg: "#fefce8",
      border: "#fde68a",
      icon: '<svg width="14" height="14" fill="none" stroke="#d97706" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
    },
    {
      label: "Users",
      value: users ? users.length : "—",
      color: "#111",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      icon: '<svg width="14" height="14" fill="none" stroke="#16a34a" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
    },
  ];

  grid.innerHTML = cards
    .map(
      (c) => `
    <div class="stat-card">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span class="stat-label">${c.label}</span>
        <div class="stat-icon" style="background:${c.bg};border-color:${c.border};">${c.icon}</div>
      </div>
      <div class="stat-value" style="color:${c.color};">${c.value}</div>
    </div>
  `
    )
    .join("");
}

const STATUS_BADGE = {
  pending: "badge-pending",
  paid: "badge-paid",
  processing: "badge-processing",
  shipped: "badge-shipped",
  delivered: "badge-delivered",
  cancelled: "badge-cancelled",
};

function renderRecentOrders(orders) {
  const el = document.getElementById("recentOrders");
  if (!orders) {
    el.innerHTML = `<tr><td colspan="5" class="empty-row">Could not load orders.</td></tr>`;
    return;
  }
  const recent = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  if (recent.length === 0) {
    el.innerHTML = `<tr><td colspan="5" class="empty-row">No orders yet.</td></tr>`;
    return;
  }

  el.innerHTML = recent
    .map(
      (o) => `
    <tr>
      <td><span class="mono-input" style="font-size:12px;color:#bbb;">#${String(o.id).padStart(4, "0")}</span></td>
      <td style="font-weight:500;">${o.address?.full_name || "—"}</td>
      <td class="mono-input" style="font-size:13px;color:var(--admin-accent);font-weight:700;">${formatPrice(o.total_amount)}</td>
      <td><span class="badge ${STATUS_BADGE[o.status] || ""}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
      <td style="color:#aaa;font-size:13px;">${new Date(o.created_at).toLocaleDateString()}</td>
    </tr>
  `
    )
    .join("");
}
