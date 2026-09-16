// profile.js
document.addEventListener("DOMContentLoaded", async () => {
  requireLogin();
  const user = currentUser();
  const el = document.getElementById("profile");
  const orderedId = new URLSearchParams(window.location.search).get("ordered");

  try {
    const orders = await api.get("/orders/");
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const inProgress = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
    const initial = (user?.username || "?").charAt(0).toUpperCase();

    el.innerHTML = `
      <div class="profile-layout">
        <div class="profile-sidebar">
          <div class="profile-avatar">${initial}</div>
          <div class="profile-name">${user?.username || ""}</div>
          <div class="profile-email">${user?.email || ""}</div>
          <ul class="profile-nav">
            <li><a class="active"><span class="nav-icon">&#128100;</span> Account</a></li>
            <li><a><span class="nav-icon">&#128230;</span> Orders</a></li>
          </ul>
          <a href="#" id="signoutLink" class="profile-signout">Sign out</a>
        </div>

        <div>
          ${orderedId ? `<div class="alert alert-success">Order #${String(orderedId).padStart(4, "0")} placed successfully!</div>` : ""}

          <div class="profile-stats">
            <div class="profile-stat-card">
              <div class="profile-stat-value">${orders.length}</div>
              <div class="profile-stat-label">Orders</div>
            </div>
            <div class="profile-stat-card">
              <div class="profile-stat-value">${formatPrice(totalSpent)}</div>
              <div class="profile-stat-label">Total spent</div>
            </div>
            <div class="profile-stat-card">
              <div class="profile-stat-value">${inProgress}</div>
              <div class="profile-stat-label">In progress</div>
            </div>
          </div>

          <div class="profile-main-card">
            <div class="profile-card-title">Order history</div>
            ${
              orders.length === 0
                ? `<p style="color:var(--text-light);">No orders yet.</p>`
                : orders
                    .map(
                      (o) => `
              <div class="recent-order-item">
                <div>
                  <div class="order-id">Order #${String(o.id).padStart(4, "0")}</div>
                  <div class="order-date">${new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <span class="order-status ${o.status}">${o.status}</span>
                <span class="order-amt">${formatPrice(o.total_amount)}</span>
              </div>
            `
                    )
                    .join("")
            }
          </div>
        </div>
      </div>
    `;

    document.getElementById("signoutLink").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  } catch {
    el.innerHTML = `<p class="error">Could not load your profile.</p>`;
  }
});