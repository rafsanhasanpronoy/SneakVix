// admin-product-form.js — shared by add-product.html and edit-product.html.
// Mode is detected from the ?id= query param: present = edit, absent = add.
//
// Image uploads go straight to Supabase Storage (uploadProductImage, from
// supabaseClient.js) as soon as a file is chosen; the resulting public URL
// is what gets sent to Django. ASSUMPTION (flagged to the user): the Django
// API accepts POST /products/ and PATCH /products/<id>/ with a
// JSON body like { name, brand, price, description, image_main, image2,
// image3, sizes: [{ size, stock }, ...] } — image fields as plain URL
// strings, not file uploads. If your serializer expects something
// different, this is the file to adjust.

const productId = new URLSearchParams(window.location.search).get("id");
const isEdit = !!productId;

const imageState = { image_main: null, image2: null, image3: null };

document.addEventListener("DOMContentLoaded", async () => {
  buildImageSlots();
  addSizeRow(); // start with one empty row (add mode); overwritten below in edit mode

  if (isEdit) {
    document.querySelector(".admin-h1").textContent = "Edit Product";
    document.getElementById("submitBtn").textContent = "Save Changes";
    await loadExistingProduct();
  }

  document.getElementById("addSizeBtn").addEventListener("click", () => addSizeRow());
  document.getElementById("productForm").addEventListener("submit", handleSubmit);
});

// ---------------- Image slots ----------------
function buildImageSlots() {
  const wrap = document.getElementById("imageSlots");
  const slots = [
    { field: "image_main", label: "Main Image", required: true },
    { field: "image2", label: "Image 2", required: false },
    { field: "image3", label: "Image 3", required: false },
  ];

  wrap.innerHTML = slots
    .map(
      (s) => `
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
    </div>
  `
    )
    .join("");

  wrap.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", (e) => handleImageSelect(e, input.dataset.field));
  });
}

async function handleImageSelect(e, field) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    setFilenameStatus(field, "File exceeds 5MB.", true);
    return;
  }

  setFilenameStatus(field, "Uploading...", false);
  showLocalPreview(field, file);

  try {
    const url = await uploadProductImage(file);
    imageState[field] = url;
    setFilenameStatus(field, `\u2713 ${file.name}`, false);
  } catch (err) {
    console.error(err);
    setFilenameStatus(field, "Upload failed \u2014 check Supabase bucket policy.", true);
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

// ---------------- Size rows ----------------
function addSizeRow(size = "", stock = "") {
  const container = document.getElementById("sizesContainer");
  const row = document.createElement("div");
  row.className = "size-row";
  row.innerHTML = `
    <input type="number" class="size-input" min="35" max="50" value="${size}" placeholder="42" required />
    <input type="number" class="stock-input" min="0" value="${stock}" placeholder="0" required />
    <button type="button" class="size-row-remove">
      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;
  row.querySelector(".size-row-remove").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function clearSizeRows() {
  document.getElementById("sizesContainer").innerHTML = "";
}

function collectSizes() {
  const rows = document.querySelectorAll("#sizesContainer .size-row");
  const sizes = [];
  rows.forEach((row) => {
    const size = parseInt(row.querySelector(".size-input").value, 10);
    const stock = parseInt(row.querySelector(".stock-input").value, 10) || 0;
    if (size >= 35 && size <= 50) sizes.push({ size, stock });
  });
  return sizes;
}

// ---------------- Edit mode: load existing product ----------------
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
    if (Array.isArray(p.sizes) && p.sizes.length) {
      p.sizes.forEach((s) => addSizeRow(s.size, s.stock ?? ""));
    } else {
      addSizeRow();
    }
  } catch (err) {
    showAlert("Could not load this product.", "error");
  }
}

// ---------------- Submit ----------------
function showAlert(message, type) {
  document.getElementById("alertBox").innerHTML = `<div class="alert-${type}">${message}</div>`;
}

async function handleSubmit(e) {
  e.preventDefault();
  document.getElementById("alertBox").innerHTML = "";

  const name = document.getElementById("name").value.trim();
  const brand = document.getElementById("brand").value;
  const price = parseFloat(document.getElementById("price").value);
  const description = document.getElementById("description").value.trim();
  const sizes = collectSizes();

  const errors = [];
  if (!name) errors.push("Product name is required.");
  if (!brand) errors.push("Please select a brand.");
  if (!(price > 0)) errors.push("Price must be greater than 0.");
  if (!description) errors.push("Description is required.");
  if (sizes.length === 0) errors.push("At least one valid size (35\u201350) is required.");
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
      showAlert(`Product updated! <a href="products.html" style="color:#15803d;font-weight:600;">View all products &rarr;</a>`, "success");
    } else {
      await api.post("/products/", body);
      showAlert(`Product added! <a href="products.html" style="color:#15803d;font-weight:600;">View all products &rarr;</a>`, "success");
      document.getElementById("productForm").reset();
      clearSizeRows();
      addSizeRow();
      Object.keys(imageState).forEach((k) => (imageState[k] = null));
      buildImageSlots();
    }
  } catch (err) {
    const data = err.data || {};
    const msg = Object.values(data).flat().join(" ") || err.message || "Something went wrong.";
    showAlert(msg, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? "Save Changes" : "Add Product";
  }
}