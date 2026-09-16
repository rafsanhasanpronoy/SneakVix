// signup.js
document.addEventListener("DOMContentLoaded", () => {
  const next = new URLSearchParams(window.location.search).get("next");
  if (next) {
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

      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next || "index.html";
    } catch (err) {
      const data = err.data || {};
      errorEl.textContent = Object.values(data).flat().join(" ") || "Could not sign up.";
    }
  });
});