// admin-products.js — product list with brand badges, stock, and edit/delete actions.
document.addEventListener("DOMContentLoaded", loadProducts);

const BRAND_BADGE = {
  nike: "badge-nike",
  adidas: "badge-adidas",
  new_balance: "badge-newbalance",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadProducts() {
  const rows = document.getElementById("rows");
  try {
    const products = await api.get("/products/");
    document.getElementById("productCount").textContent = `${products.length} products in inventory`;
    renderRows(products);
    renderStats(products);
  } catch {
    rows.innerHTML = `<tr><td colspan="6" class="empty-row">Could not load products.</td></tr>`;
  }
}

function totalStock(p) {
  return typeof p.total_stock === "number" ? p.total_stock : null;
}

function renderRows(products) {
  const rows = document.getElementById("rows");
  if (!products.length) {
    rows.innerHTML = `<tr><td colspan="6" class="empty-row">No products. <a href="add-product.html">Add your first &rarr;</a></td></tr>`;
    return;
  }

  rows.innerHTML = products.map((p) => {
    const stock = totalStock(p);
    const safeName = escapeHtml(p.name);
    const brand = escapeHtml(String(p.brand || "other").replace(/_/g, " "));
    const stockLabel = stock === null ? "—" : stock === 0
      ? `<span style="color:#dc2626;font-weight:600;">0</span> <span style="font-size:10.5px;color:#dc2626;background:#fef2f2;padding:1px 6px;border-radius:4px;">Out</span>`
      : stock <= 5
      ? `<span style="color:#d97706;font-weight:600;">${stock}</span> <span style="font-size:10.5px;color:#d97706;background:#fefce8;padding:1px 6px;border-radius:4px;">Low</span>`
      : `<span style="font-weight:600;">${stock}</span>`;

    return `<tr>
      <td><img class="data-thumb" src="${escapeHtml(mediaUrl(p.image_main))}" alt="${safeName}" /></td>
      <td style="font-weight:500;max-width:220px;">${safeName}</td>
      <td><span class="badge ${BRAND_BADGE[p.brand] || "badge-other"}">${brand}</span></td>
      <td class="mono-input" style="font-size:13px;color:var(--admin-accent);font-weight:700;">${formatPrice(p.price)}</td>
      <td>${stockLabel}</td>
      <td style="text-align:right;"><div style="display:inline-flex;align-items:center;gap:6px;">
        <a href="edit-product.html?id=${encodeURIComponent(p.id)}" class="btn-row-edit">Edit</a>
        <button class="btn-row-delete" data-id="${escapeHtml(p.id)}" data-name="${safeName}">Delete</button>
      </div></td>
    </tr>`;
  }).join("");

  rows.querySelectorAll(".btn-row-delete").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.id, btn.dataset.name));
  });
}

function renderStats(products) {
  const stats = document.getElementById("productStats");
  const withStock = products.map(totalStock).filter((s) => s !== null);
  const outOfStock = withStock.filter((s) => s === 0).length;
  const lowStock = withStock.filter((s) => s > 0 && s <= 5).length;
  const totalUnits = withStock.reduce((sum, s) => sum + s, 0);
  const prices = products.map((p) => Number(p.price)).filter((n) => !isNaN(n));
  const highest = prices.length ? Math.max(...prices) : null;
  stats.innerHTML = `
    <div class="stat-card"><span class="stat-label">Total Products</span><div class="stat-value">${products.length}</div></div>
    <div class="stat-card"><span class="stat-label">Total Units</span><div class="stat-value">${withStock.length ? totalUnits : "—"}</div></div>
    <div class="stat-card"><span class="stat-label">Low Stock</span><div class="stat-value">${withStock.length ? lowStock : "—"}</div></div>
    <div class="stat-card"><span class="stat-label">Out of Stock</span><div class="stat-value">${withStock.length ? outOfStock : "—"}</div></div>
    <div class="stat-card"><span class="stat-label">Highest Price</span><div class="stat-value">${highest === null ? "—" : formatPrice(highest)}</div></div>`;
}

function showAlert(message, type) {
  const box = document.getElementById("alertBox");
  box.textContent = message;
  box.className = `alert-${type}`;
}

async function handleDelete(id, name) {
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  try {
    await api.del(`/products/${id}/`);
    showAlert("Product deleted.", "success");
    await loadProducts();
  } catch (err) {
    showAlert(err.data?.error || "Could not delete product.", "error");
  }
}
