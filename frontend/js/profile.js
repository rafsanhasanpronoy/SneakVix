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
          <div class="profile-account-label">Customer Account</div>
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
            <div class="profile-card-heading"><div><div class="profile-card-title">Order history</div><div class="profile-card-subtitle">View your orders, payment status and receipts.</div></div><span class="profile-order-count">${orders.length} ${orders.length === 1 ? "order" : "orders"}</span></div>
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
                ${o.status === "pending" && !o.payment ? `<div class="order-payment-prompt"><strong>Awaiting payment</strong><span>Pay ${formatPrice(o.total_amount)} via bKash, then submit the transaction ID.</span><button type="button" class="btn-outline submit-payment-btn" data-order-id="${o.id}" data-amount="${o.total_amount}">Submit bKash Payment</button></div>` : ""}
                ${o.payment?.status === "submitted" ? `<div class="order-payment-prompt is-submitted"><strong>Payment submitted</strong><span>Transaction ID received. Waiting for admin verification.</span></div>` : ""}
                ${o.payment?.status === "rejected" ? `<div class="order-payment-prompt is-rejected"><strong>Payment needs attention</strong><span>Please check your bKash payment details and submit a new transaction ID.</span><button type="button" class="btn-outline submit-payment-btn" data-order-id="${o.id}" data-amount="${o.total_amount}">Submit Payment Again</button></div>` : ""}
                ${o.payment?.status === "verified" ? `<div class="order-payment-prompt is-verified"><strong>Payment verified</strong><span>Your bKash payment has been verified.</span></div>` : ""}
                ${o.status === "pending" ? `<button type="button" class="btn-outline cancel-order-btn" data-order-id="${o.id}">Cancel Order</button>` : ""}
                <button type="button" class="btn-outline receipt-btn" data-order-id="${o.id}">Receipt</button>
                <button type="button" class="btn-outline download-receipt-btn" data-order-id="${o.id}">Download PDF</button>
              </div>
            `
                    )
                    .join("")
            }
          </div>
        </div>
      </div>
    `;

    
    document.querySelectorAll(".download-receipt-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const order = orders.find((item) => String(item.id) === String(button.dataset.orderId));
        if (!order) { window.alert("Could not load the receipt."); return; }
        downloadReceipt(order, "normal");
      });
    });

    document.querySelectorAll(".receipt-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const order = orders.find((item) => String(item.id) === String(button.dataset.orderId));
        if (!order) {
          window.alert("Could not load the receipt.");
          return;
        }
        printReceipt(order, "normal");
      });
    });

    document.querySelectorAll(".submit-payment-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const amount = Number(button.dataset.amount);
        const existing = document.getElementById("profilePaymentModal");
        if (existing) existing.remove();
        const modal = document.createElement("div");
        modal.id = "profilePaymentModal";
        modal.innerHTML = `
          <div style="position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999;">
            <div style="width:min(460px,100%);background:var(--card-bg,#171717);padding:24px;border-radius:14px;">
              <h3 style="margin-top:0;">Submit bKash Payment</h3>
              <div class="profile-payment-steps">
                <div><strong>1. Pay first</strong><span>Send exactly ${formatPrice(amount)} via bKash to the store number shown at checkout.</span></div>
                <div><strong>2. Get your Transaction ID</strong><span>After a successful payment, copy the Transaction ID from bKash.</span></div>
                <div><strong>3. Submit it here</strong><span>Enter the Transaction ID below. Do not submit it before payment is completed.</span></div>
              </div>
              <p><strong>Order amount: ${formatPrice(amount)}</strong></p>
              <form id="profilePaymentForm">
                <label class="form-label" for="profilePaymentReference">bKash Transaction ID</label>
                <input id="profilePaymentReference" name="reference" class="form-input" required minlength="4" maxlength="100" placeholder="e.g. 8A1B2C3D" autocomplete="off">
                <input type="hidden" name="amount" value="${amount}">
                <div style="display:flex;gap:10px;margin-top:14px;">
                  <button type="button" class="btn-outline" id="closeProfilePayment">Cancel</button>
                  <button type="submit" class="btn btn-primary">Submit Payment</button>
                </div>
                <div id="profilePaymentError" class="error" style="display:none;margin-top:10px;"></div>
              </form>
            </div>
          </div>`;
        document.body.appendChild(modal);
        document.getElementById("closeProfilePayment").onclick = () => modal.remove();
        document.getElementById("profilePaymentForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const submit = e.target.querySelector('button[type="submit"]');
          const error = document.getElementById("profilePaymentError");
          submit.disabled = true;
          error.style.display = "none";
          try {
            const data = Object.fromEntries(new FormData(e.target).entries());
            data.amount = Number(data.amount);
            await api.post(`/orders/${button.dataset.orderId}/payment/`, data);
            modal.remove();
            window.location.reload();
          } catch (err) {
            error.innerHTML = formatApiError(err.data || { error: err.message || "Could not submit payment." });
            error.style.display = "block";
            submit.disabled = false;
          }
        });
      });
    });

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
              window.alert((err.data && err.data.error) || err.message || "Could not cancel the order.");
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