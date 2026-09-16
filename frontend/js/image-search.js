// image-search.js
let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const dropIdle = document.getElementById("dropIdle");
  const dropPreview = document.getElementById("dropPreview");
  const preview = document.getElementById("preview");
  const removeBtn = document.getElementById("removePreview");
  const searchBtn = document.getElementById("searchBtn");
  const errorEl = document.getElementById("error");
  const results = document.getElementById("results");

  function setFile(file) {
    if (!file) return;
    selectedFile = file;
    preview.src = URL.createObjectURL(file);
    dropIdle.style.display = "none";
    dropPreview.style.display = "flex";
    searchBtn.disabled = false;
    results.innerHTML = "";
    errorEl.textContent = "";
  }

  dropZone.addEventListener("click", (e) => {
    if (e.target === removeBtn) return;
    fileInput.click();
  });

  fileInput.addEventListener("change", () => setFile(fileInput.files[0]));

  ["dragover", "dragenter"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
    })
  );
  dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = "";
    dropIdle.style.display = "flex";
    dropPreview.style.display = "none";
    searchBtn.disabled = true;
    results.innerHTML = "";
  });

  searchBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";
    errorEl.textContent = "";
    results.innerHTML = `
      <div class="img-loading">
        <div class="img-loading-ring"></div>
        <p class="img-loading-text">Scanning the catalog</p>
        <p class="img-loading-sub">Comparing your photo against every listed sneaker</p>
      </div>
    `;

    const form = new FormData();
    form.append("image", selectedFile);

    try {
      const matches = await api.post("/image-search/", form, { isForm: true, auth: false });

      if (matches.length === 0) {
        results.innerHTML = `
          <div class="img-results-header">
            <span class="img-result-label"><span class="result-detected">0 matches found</span></span>
          </div>
          <div class="img-no-results">No similar sneakers found. Try a clearer, front-on photo.</div>
        `;
      } else {
        results.innerHTML = `
          <div class="img-results-header">
            <span class="img-result-label">
              <span class="result-detected">Found</span>
              <span class="result-class">${matches.length} similar ${matches.length === 1 ? "sneaker" : "sneakers"}</span>
            </span>
          </div>
          <div class="img-results-grid">
            ${matches.map(productCardHtml).join("")}
          </div>
        `;
      }
    } catch (e) {
      results.innerHTML = "";
      errorEl.textContent = e.data?.error || "Search failed. Is the image-matching service running?";
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = "Search";
    }
  });
});