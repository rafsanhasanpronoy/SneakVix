// products.js — search, brand (multi-select), price range, and sort, all
// synced to the URL so filtered views are shareable/bookmarkable.
function getState() {
  const params = new URLSearchParams(window.location.search);
  return {
    search: params.get("search") || "",
    brands: (params.get("brand") || "").split(",").filter(Boolean),
    minPrice: params.get("min_price") || "",
    maxPrice: params.get("max_price") || "",
    ordering: params.get("ordering") || "-created_at",
  };
}

function stateToParams(state) {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.brands.length) params.set("brand", state.brands.join(","));
  if (state.minPrice) params.set("min_price", state.minPrice);
  if (state.maxPrice) params.set("max_price", state.maxPrice);
  if (state.ordering && state.ordering !== "-created_at") params.set("ordering", state.ordering);
  return params;
}

function applyStateToControls(state) {
  document.getElementById("shopSearchInput").value = state.search;
  document.getElementById("minPrice").value = state.minPrice;
  document.getElementById("maxPrice").value = state.maxPrice;
  document.getElementById("sortSelect").value = state.ordering;
  document.querySelectorAll(".brandFilter").forEach((cb) => {
    cb.checked = state.brands.includes(cb.value);
  });
}

function readControlsToState() {
  return {
    search: document.getElementById("shopSearchInput").value.trim(),
    brands: Array.from(document.querySelectorAll(".brandFilter:checked")).map((cb) => cb.value),
    minPrice: document.getElementById("minPrice").value,
    maxPrice: document.getElementById("maxPrice").value,
    ordering: document.getElementById("sortSelect").value,
  };
}

async function loadProducts(pushHistory = false) {
  const state = readControlsToState();
  const params = stateToParams(state);

  if (pushHistory) {
    const url = new URL(window.location);
    url.search = params.toString();
    window.history.pushState({}, "", url);
  }

  const grid = document.getElementById("grid");
  const countEl = document.getElementById("resultCount");
  grid.innerHTML = `<p>Loading...</p>`;

  try {
    const products = await api.get(`/products/?${params.toString()}`);

    countEl.textContent = `${products.length} product${products.length === 1 ? "" : "s"} found`;

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <p>No products match your filters.</p>
          <a href="#" id="emptyStateClear">Clear all filters</a>
        </div>
      `;
      const clearLink = document.getElementById("emptyStateClear");
      if (clearLink) clearLink.addEventListener("click", (e) => { e.preventDefault(); clearFilters(); });
      return;
    }

    grid.innerHTML = products.map(productCardHtml).join("");
  } catch {
    countEl.textContent = "";
    grid.innerHTML = `<p class="error">Could not load products.</p>`;
  }
}

function clearFilters() {
  document.getElementById("shopSearchInput").value = "";
  document.getElementById("minPrice").value = "";
  document.getElementById("maxPrice").value = "";
  document.getElementById("sortSelect").value = "-created_at";
  document.querySelectorAll(".brandFilter").forEach((cb) => (cb.checked = false));
  loadProducts(true);
}

document.addEventListener("DOMContentLoaded", () => {
  applyStateToControls(getState());
  loadProducts(false);

  document.getElementById("shopSearchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    loadProducts(true);
  });

  document.querySelectorAll(".brandFilter").forEach((cb) => {
    cb.addEventListener("change", () => loadProducts(true));
  });

  document.getElementById("applyPriceBtn").addEventListener("click", () => loadProducts(true));

  document.getElementById("sortSelect").addEventListener("change", () => loadProducts(true));

  document.getElementById("clearFiltersBtn").addEventListener("click", clearFilters);

  window.addEventListener("popstate", () => {
    applyStateToControls(getState());
    loadProducts(false);
  });
});