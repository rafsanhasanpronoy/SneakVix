// login.js
function getSafeNextUrl(rawNext) {
  if (!rawNext) return "index.html";
  try {
    const url = new URL(rawNext, window.location.origin);
    // Only allow same-origin relative navigation. Reject protocol-relative,
    // external, javascript:, data:, and other open-redirect targets.
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

      window.location.href = next;
    } catch {
      errorEl.textContent = "Invalid username or password.";
    }
  });
});
