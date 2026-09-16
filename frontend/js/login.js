// login.js
document.addEventListener("DOMContentLoaded", () => {
  const next = new URLSearchParams(window.location.search).get("next");
  if (next) {
    const signupLink = document.querySelector('a[href="signup.html"]');
    if (signupLink) signupLink.href = `signup.html?next=${encodeURIComponent(next)}`;
  }

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("error");
    errorEl.textContent = "";

    const form = new FormData(e.target);
    const { username, password } = Object.fromEntries(form.entries());

    try {
      const data = await api.post("/auth/login/", { username, password }, { auth: false });
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      const me = await api.get("/auth/me/");
      localStorage.setItem("user", JSON.stringify(me));

      await mergeGuestCartIntoServerCart();

      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next || "index.html";
    } catch {
      errorEl.textContent = "Invalid username or password.";
    }
  });
});