// product.js
let currentProduct = null;
const selectedQty = {}; // { [size]: quantity }

const BRAND_LABELS = { nike: "Nike", adidas: "Adidas", puma: "Puma", new_balance: "New Balance", other: "Other" };

async function loadProduct() {
  const id = new URLSearchParams(window.location.search).get("id");
  const el = document.getElementById("detail");
  if (!id) {
    el.innerHTML = `<p class="error">No product specified.</p>`;
    return;
  }

  try {
    currentProduct = await api.get(`/products/${id}/`);
    render();
    loadRelatedProducts(currentProduct);
  } catch {
    el.innerHTML = `<p class="error">Product not found.</p>`;
  }
}

function renderBreadcrumb(p) {
  const bc = document.getElementById("breadcrumb");
  if (!bc) return;
  const brandLabel = BRAND_LABELS[p.brand] || p.brand;
  bc.innerHTML = `
    <a href="index.html">Home</a>
    <span class="sep">/</span>
    <a href="products.html">Shop</a>
    <span class="sep">/</span>
    <a href="products.html?brand=${p.brand}">${brandLabel}</a>
    <span class="sep">/</span>
    <span class="current">${p.name}</span>
  `;
}

function render() {
  const p = currentProduct;
  const el = document.getElementById("detail");
  const images = [p.image_main, p.image2, p.image3].filter(Boolean);

  renderBreadcrumb(p);

  el.innerHTML = `
    <div>
      <div class="product-hero-img">
        <img id="mainImage" src="${mediaUrl(p.image_main)}" alt="${p.name}" style="width:100%;display:block;object-fit:contain;background:#f8f9fa;" />
      </div>
      <div class="thumb-strip">
        ${images
          .map(
            (img, i) =>
              `<img class="thumb ${i === 0 ? "active" : ""}" src="${mediaUrl(img)}" data-src="${mediaUrl(img)}" alt="${p.name} view ${i + 1}" />`
          )
          .join("")}
      </div>
    </div>
    <div>
      <p class="product-brand">${p.brand}</p>
      <h1>${p.name}</h1>
      <p class="product-price">${formatPrice(p.price)}</p>
      ${stockBadgeHtml(p.sizes)}
      <p class="product-desc">${p.description || ""}</p>

      <p class="product-section-label">Select size &amp; quantity</p>
      <div class="size-picker" id="sizePicker">
        ${
          p.sizes.length === 0
            ? `<p class="out-of-stock">No sizes available for this product.</p>`
            : p.sizes.map((s) => sizeRowHtml(s)).join("")
        }
      </div>

      <div id="selectionSummary"></div>

      <button id="addBtn" class="btn btn-primary large">Add to cart</button>
      <p id="message" class="field-msg"></p>

      <div class="trust-badges">
        <div class="trust-badge">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Quality checked
        </div>
        <div class="trust-badge">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          Secure checkout
        </div>
        <div class="trust-badge">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4M4 12l6-6M4 12l6 6"/></svg>
          Easy returns
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll(".thumb-strip .thumb").forEach((img) => {
    img.addEventListener("click", () => {
      document.getElementById("mainImage").src = img.dataset.src;
      el.querySelectorAll(".thumb-strip .thumb").forEach((t) => t.classList.remove("active"));
      img.classList.add("active");
    });
  });

  wireStepperEvents();
  updateSelectionSummary();

  const addBtn = document.getElementById("addBtn");
  if (addBtn) addBtn.addEventListener("click", handleAdd);
}

function stockBadgeHtml(sizes) {
  const inStock = sizes.some((s) => s.stock > 0);
  return inStock
    ? `<span class="stock-badge in-stock">In Stock</span>`
    : `<span class="stock-badge out-of-stock">Out of Stock</span>`;
}

function sizeRowHtml(s) {
  const qty = selectedQty[s.size] || 0;
  const outOfStock = s.stock === 0;
  const lowStock = !outOfStock && s.stock <= 5;
  const stockLabel = outOfStock ? "Out of stock" : lowStock ? `Only ${s.stock} left` : "In stock";
  return `
    <div class="size-picker-row ${outOfStock ? "is-out-of-stock" : ""}" data-size="${s.size}" data-stock="${s.stock}">
      <div class="size-picker-label">
        <span class="size-picker-size">EU ${s.size}</span>
        <span class="size-picker-stock ${lowStock ? "low" : ""} ${outOfStock ? "out" : ""}">${stockLabel}</span>
      </div>
      <div class="qty-stepper">
        <button type="button" class="qty-minus" ${qty === 0 || outOfStock ? "disabled" : ""}>&minus;</button>
        <span class="qty-value">${qty}</span>
        <button type="button" class="qty-plus" ${qty >= s.stock || outOfStock ? "disabled" : ""}>+</button>
      </div>
    </div>
  `;
}

function wireStepperEvents() {
  document.querySelectorAll("#sizePicker .size-picker-row").forEach((row) => {
    const size = Number(row.dataset.size);
    const stock = Number(row.dataset.stock);

    row.querySelector(".qty-plus").addEventListener("click", () => {
      selectedQty[size] = Math.min((selectedQty[size] || 0) + 1, stock);
      refreshRow(row, size, stock);
    });
    row.querySelector(".qty-minus").addEventListener("click", () => {
      selectedQty[size] = Math.max((selectedQty[size] || 0) - 1, 0);
      if (selectedQty[size] === 0) delete selectedQty[size];
      refreshRow(row, size, stock);
    });
  });
}

function refreshRow(row, size, stock) {
  const qty = selectedQty[size] || 0;
  row.querySelector(".qty-value").textContent = qty;
  row.querySelector(".qty-minus").disabled = qty === 0;
  row.querySelector(".qty-plus").disabled = qty >= stock;
  row.classList.toggle("has-qty", qty > 0);
  updateSelectionSummary();
}

function updateSelectionSummary() {
  const summary = document.getElementById("selectionSummary");
  if (!summary) return;
  const entries = Object.entries(selectedQty).filter(([, q]) => q > 0);
  const totalItems = entries.reduce((sum, [, q]) => sum + q, 0);

  if (totalItems === 0) {
    summary.innerHTML = "";
    return;
  }

  const totalPrice = totalItems * Number(currentProduct.price);
  summary.innerHTML = `
    <p class="selection-total">${totalItems} item${totalItems > 1 ? "s" : ""} selected \u2014 <span class="amount">${formatPrice(totalPrice)}</span></p>
    <p class="cart-selection-summary">${entries.map(([size, q]) => `EU ${size} \u00d7${q}`).join(", ")}</p>
  `;
}

async function handleAdd() {
  const msg = document.getElementById("message");
  msg.classList.remove("success");

  const entries = Object.entries(selectedQty).filter(([, q]) => q > 0);
  if (entries.length === 0) {
    msg.textContent = "Please select at least one size and quantity.";
    return;
  }

  const addBtn = document.getElementById("addBtn");
  addBtn.disabled = true;
  addBtn.textContent = "Adding...";

  try {
    if (isLoggedIn()) {
      // The cart endpoint adds one unit per call and increments quantity on
      // repeat calls, so multiple sizes/quantities are added as a sequence
      // of calls rather than a single bulk request.
      for (const [size, qty] of entries) {
        for (let i = 0; i < qty; i++) {
          await api.post("/cart/", { product_id: currentProduct.id, size: Number(size) });
        }
      }
    } else {
      // Not logged in — queue it in the guest cart instead of blocking.
      entries.forEach(([size, qty]) => addToGuestCart(currentProduct.id, Number(size), qty));
    }
    msg.textContent = "Added to cart!";
    msg.classList.add("success");
    Object.keys(selectedQty).forEach((k) => delete selectedQty[k]);
    render();
    renderNav();
  } catch (e) {
    msg.textContent = e.data?.error || "Could not add all items to cart \u2014 some sizes may have run out mid-request.";
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = "Add to cart";
  }
}

async function loadRelatedProducts(p) {
  const section = document.getElementById("relatedSection");
  if (!section) return;
  try {
    const products = await api.get(`/products/?brand=${encodeURIComponent(p.brand)}`);
    const related = products.filter((item) => item.id !== p.id).slice(0, 4);
    if (related.length === 0) {
      section.innerHTML = "";
      return;
    }
    section.innerHTML = `
      <div class="section-heading">
        <h2>You may also like</h2>
        <a href="products.html?brand=${p.brand}">View all &rarr;</a>
      </div>
      <div class="product-grid">
        ${related.map(productCardHtml).join("")}
      </div>
    `;
  } catch {
    section.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", loadProduct);