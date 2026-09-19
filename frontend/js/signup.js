// signup.js
function getSafeNextUrl(rawNext) {
  if (!rawNext) return "index.html";
  try {
    const url = new URL(rawNext, window.location.origin);
    // Only allow same-origin relative navigation to an HTML page.
    if (url.origin !== window.location.origin) return "index.html";
    if (!url.pathname || !url.pathname.endsWith(".html")) return "index.html";
    return `${url.pathname.replace(/^\//, "")}${url.search}${url.hash}`;
  } catch {
    return "index.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const rawNext = new URLSearchParams(window.location.search).get("next");
  const next = getSafeNextUrl(rawNext);
  if (rawNext && next !== "index.html") {
    const loginLink = document.querySelector('a[href="login.html"]');
    if (loginLink) loginLink.href = `login.html?next=${encodeURIComponent(next)}`;
  }

  document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("error");
    errorEl.textContent = "";

    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());

    try {
      const data = await api.post("/auth/signup/", body, { auth: false });
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));

      await mergeGuestCartIntoServerCart();

      window.location.href = next;
    } catch (err) {
      const data = err.data || {};
      errorEl.textContent = Object.values(data).flat().join(" ") || "Could not sign up.";
    }
  });
});
