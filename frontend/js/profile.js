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
                ${o.status === "pending" ? `<button type="button" class="btn-outline cancel-order-btn" data-order-id="${o.id}">Cancel Order</button>` : ""}
                <button type="button" class="btn-outline receipt-btn" data-order-id="${o.id}">Receipt</button>
              </div>
            `
                    )
                    .join("")
            }
          </div>
        </div>
      </div>
    `;

    
    document.querySelectorAll(".receipt-btn").forEach((button) => { button.addEventListener("click", async () => { try { const order = await api.get(`/orders/${button.dataset.orderId}/`); printReceipt(order, "normal"); } catch { showToast("Could not load the receipt.", "error"); } }); });

    document.querySelectorAll(".cancel-order-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const orderId = button.dataset.orderId;
        openConfirmModal({
          title: "Cancel Order?",
          message: "This will cancel the order and return the reserved items to stock.",
          confirmLabel: "Cancel Order",
          danger: true,
          onConfirm: async () => {
            button.disabled = true;
            try {
              await api.post(`/orders/${orderId}/cancel/`);
              window.location.reload();
            } catch (err) {
              showToast((err.data && err.data.error) || err.message || "Could not cancel the order.", "error");
              button.disabled = false;
            }
          },
        });
      });
    });

    document.getElementById("signoutLink").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  } catch {
    el.innerHTML = `<p class="error">Could not load your profile.</p>`;
  }
});