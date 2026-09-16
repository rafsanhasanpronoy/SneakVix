// admin-products.js — product list with brand badges, stock, and edit/delete
// actions. Image management now lives on the Add/Edit product pages, not
// inline here (matches the add-product / edit-product flow).
document.addEventListener("DOMContentLoaded", loadProducts);

const BRAND_BADGE = {
  jordan: "badge-jordan",
  nike: "badge-nike",
  adidas: "badge-adidas",
  new_balance: "badge-newbalance",
};

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
  // /products/ (list) now returns a computed total_stock field directly —
  // see ProductListSerializer.get_total_stock in serializers.py.
  return typeof p.total_stock === "number" ? p.total_stock : null;
}

function renderRows(products) {
  const rows = document.getElementById("rows");

  if (products.length === 0) {
    rows.innerHTML = `<tr><td colspan="6" class="empty-row">No products. <a href="add-product.html">Add your first &rarr;</a></td></tr>`;
    return;
  }

  rows.innerHTML = products
    .map((p) => {
      const stock = totalStock(p);
      const stockLabel =
        stock === null
          ? "—"
          : stock === 0
          ? `<span style="color:#dc2626;font-weight:600;">0</span> <span style="font-size:10.5px;color:#dc2626;background:#fef2f2;padding:1px 6px;border-radius:4px;">Out</span>`
          : stock <= 5
          ? `<span style="color:#d97706;font-weight:600;">${stock}</span> <span style="font-size:10.5px;color:#d97706;background:#fefce8;padding:1px 6px;border-radius:4px;">Low</span>`
          : `<span style="font-weight:600;">${stock}</span>`;

      return `
      <tr>
        <td><img class="data-thumb" src="${mediaUrl(p.image_main)}" alt="${p.name}" /></td>
        <td style="font-weight:500;max-width:220px;">${p.name}</td>
        <td><span class="badge ${BRAND_BADGE[p.brand] || "badge-other"}">${p.brand.replace("_", " ")}</span></td>
        <td class="mono-input" style="font-size:13px;color:var(--admin-accent);font-weight:700;">${formatPrice(p.price)}</td>
        <td>${stockLabel}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex;align-items:center;gap:6px;">
            <a href="edit-product.html?id=${p.id}" class="btn-row-edit">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Edit
            </a>
            <button class="btn-row-delete" data-id="${p.id}" data-name="${p.name}">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

  rows.querySelectorAll(".btn-row-delete").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.id, btn.dataset.name));
  });
}

function renderStats(products) {
  const stats = document.getElementById("productStats");
  const withStock = products.map(totalStock).filter((s) => s !== null);
  const outOfStock = withStock.filter((s) => s === 0).length;
  const prices = products.map((p) => Number(p.price)).filter((n) => !isNaN(n));
  const highest = prices.length ? Math.max(...prices) : null;

  stats.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Total Products</span>
      <div class="stat-value" style="color:#111;">${products.length}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">Out of Stock</span>
      <div class="stat-value" style="color:#dc2626;">${withStock.length ? outOfStock : "—"}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">Highest Price</span>
      <div class="stat-value" style="color:var(--admin-accent);">${highest === null ? "—" : formatPrice(highest)}</div>
    </div>
  `;
}

function showAlert(message, type) {
  document.getElementById("alertBox").innerHTML = `<div class="alert-${type}">${message}</div>`;
}

async function handleDelete(id, name) {
  if (!confirm(`Delete ${name}?`)) return;
  try {
    await api.del(`/products/${id}/`);
    showAlert("Product deleted.", "success");
    loadProducts();
  } catch (err) {
    showAlert(err.data?.error || "Could not delete product.", "error");
  }
}