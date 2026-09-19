// admin-product-form.js — shared by add-product.html and edit-product.html.
const productId = new URLSearchParams(window.location.search).get("id");
const isEdit = !!productId;
const imageState = { image_main: null, image2: null, image3: null };

document.addEventListener("DOMContentLoaded", async () => {
  buildImageSlots();
  addSizeRow();
  if (isEdit) {
    document.querySelector(".admin-h1").textContent = "Edit Product";
    document.getElementById("submitBtn").textContent = "Save Changes";
    await loadExistingProduct();
  }
  document.getElementById("addSizeBtn").addEventListener("click", () => addSizeRow());
  document.getElementById("productForm").addEventListener("submit", handleSubmit);
});

function buildImageSlots() {
  const wrap = document.getElementById("imageSlots");
  const slots = [
    { field: "image_main", label: "Main Image", required: true },
    { field: "image2", label: "Image 2", required: false },
    { field: "image3", label: "Image 3", required: false },
  ];
  wrap.innerHTML = slots.map((s) => `
    <div>
      <label class="form-label">${s.label}${s.required ? " *" : ' <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#ccc;">(optional)</span>'}</label>
      <label class="dropzone" id="dropzone-${s.field}">
        <img class="dropzone-preview" id="preview-${s.field}" style="display:none;" />
        <svg width="20" height="20" fill="none" stroke="#ccc" viewBox="0 0 24 24" stroke-width="1.5" style="margin:0 auto 8px;display:block;" id="placeholder-icon-${s.field}"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <div class="dropzone-hint">JPG, PNG, WEBP &middot; Max 5MB</div>
        <div class="dropzone-choose">Choose file</div>
        <input type="file" data-field="${s.field}" accept="image/jpeg,image/png,image/webp" style="display:none;" />
      </label>
      <div class="dropzone-filename" id="filename-${s.field}"></div>
    </div>`).join("");
  wrap.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", (e) => handleImageSelect(e, input.dataset.field));
  });
}

async function handleImageSelect(e, field) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    setFilenameStatus(field, "File exceeds 5MB.", true);
    e.target.value = "";
    return;
  }
  setFilenameStatus(field, "Uploading...", false);
  showLocalPreview(field, file);
  try {
    const url = await uploadProductImage(file);
    imageState[field] = url;
    setFilenameStatus(field, `✓ ${file.name}`, false);
  } catch (err) {
    console.error(err);
    imageState[field] = null;
    setFilenameStatus(field, "Upload failed — check Supabase bucket policy.", true);
  }
}

function showLocalPreview(field, file) {
  const preview = document.getElementById(`preview-${field}`);
  const icon = document.getElementById(`placeholder-icon-${field}`);
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
  if (icon) icon.style.display = "none";
}

function setPreviewFromUrl(field, url) {
  if (!url) return;
  const preview = document.getElementById(`preview-${field}`);
  const icon = document.getElementById(`placeholder-icon-${field}`);
  preview.src = url;
  preview.style.display = "block";
  if (icon) icon.style.display = "none";
  imageState[field] = url;
}

function setFilenameStatus(field, text, isError) {
  const el = document.getElementById(`filename-${field}`);
  el.textContent = text;
  el.style.color = isError ? "var(--admin-danger)" : "#16a34a";
}

function addSizeRow(size = "", stock = "") {
  const container = document.getElementById("sizesContainer");
  const row = document.createElement("div");
  row.className = "size-row";
  row.innerHTML = `
    <input type="number" class="size-input" min="35" max="50" value="${Number.isInteger(Number(size)) ? Number(size) : ""}" placeholder="42" required />
    <input type="number" class="stock-input" min="0" value="${Number.isInteger(Number(stock)) ? Number(stock) : ""}" placeholder="0" required />
    <button type="button" class="size-row-remove" aria-label="Remove size">×</button>`;
  row.querySelector(".size-row-remove").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function clearSizeRows() {
  document.getElementById("sizesContainer").innerHTML = "";
}

function collectSizes() {
  const rows = document.querySelectorAll("#sizesContainer .size-row");
  const sizes = [];
  const seen = new Set();
  const errors = [];

  rows.forEach((row, index) => {
    const size = Number(row.querySelector(".size-input").value);
    const stock = Number(row.querySelector(".stock-input").value);
    if (!Number.isInteger(size) || size < 35 || size > 50) {
      errors.push(`Size row ${index + 1}: EU size must be an integer from 35 to 50.`);
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      errors.push(`Size row ${index + 1}: stock must be a non-negative integer.`);
      return;
    }
    if (seen.has(size)) {
      errors.push(`Duplicate EU size ${size} is not allowed.`);
      return;
    }
    seen.add(size);
    sizes.push({ size, stock });
  });

  return { sizes, errors };
}

async function loadExistingProduct() {
  try {
    const p = await api.get(`/products/${productId}/`);
    document.getElementById("name").value = p.name || "";
    document.getElementById("brand").value = p.brand || "";
    document.getElementById("price").value = p.price || "";
    document.getElementById("description").value = p.description || "";
    setPreviewFromUrl("image_main", mediaUrl(p.image_main));
    setPreviewFromUrl("image2", mediaUrl(p.image2));
    setPreviewFromUrl("image3", mediaUrl(p.image3));
    clearSizeRows();
    if (Array.isArray(p.sizes) && p.sizes.length) p.sizes.forEach((s) => addSizeRow(s.size, s.stock ?? ""));
    else addSizeRow();
  } catch {
    showAlert("Could not load this product.", "error");
  }
}

function showAlert(message, type) {
  const box = document.getElementById("alertBox");
  box.textContent = message;
  box.className = `alert-${type}`;
}

async function handleSubmit(e) {
  e.preventDefault();
  const alertBox = document.getElementById("alertBox");
  alertBox.textContent = "";
  alertBox.className = "";

  const name = document.getElementById("name").value.trim();
  const brand = document.getElementById("brand").value;
  const price = parseFloat(document.getElementById("price").value);
  const description = document.getElementById("description").value.trim();
  const { sizes, errors: sizeErrors } = collectSizes();
  const errors = [...sizeErrors];

  if (!name) errors.push("Product name is required.");
  if (!brand) errors.push("Please select a brand.");
  if (!(price > 0) || !Number.isFinite(price)) errors.push("Price must be greater than 0.");
  if (!description) errors.push("Description is required.");
  if (sizes.length === 0) errors.push("At least one valid size (35–50) is required.");
  if (!isEdit && !imageState.image_main) errors.push("Main image is required.");

  if (errors.length) {
    showAlert(errors.join(" "), "error");
    return;
  }

  const body = { name, brand, price, description, sizes };
  if (imageState.image_main) body.image_main = imageState.image_main;
  if (imageState.image2) body.image2 = imageState.image2;
  if (imageState.image3) body.image3 = imageState.image3;

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = isEdit ? "Saving..." : "Adding...";

  try {
    if (isEdit) {
      await api.patch(`/products/${productId}/`, body);
      showAlert("Product updated successfully.", "success");
    } else {
      await api.post("/products/", body);
      showAlert("Product added successfully.", "success");
      document.getElementById("productForm").reset();
      clearSizeRows();
      addSizeRow();
      Object.keys(imageState).forEach((k) => (imageState[k] = null));
      buildImageSlots();
    }
  } catch (err) {
    const data = err.data || {};
    const messages = [];
    Object.values(data).forEach((value) => {
      if (Array.isArray(value)) messages.push(value.join(" "));
      else if (typeof value === "string") messages.push(value);
      else if (value && typeof value === "object") messages.push(JSON.stringify(value));
    });
    showAlert(messages.join(" ") || err.message || "Something went wrong.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? "Save Changes" : "Add Product";
  }
}
