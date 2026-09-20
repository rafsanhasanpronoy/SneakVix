// admin-order-detail.js — full view of a single order: customer/shipping
// info, line items, computed totals, and a status control.
const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
const STATUS_BADGE = {
  pending: "badge-pending",
  paid: "badge-paid",
  processing: "badge-processing",
  shipped: "badge-shipped",
  delivered: "badge-delivered",
  cancelled: "badge-cancelled",
  refunded: "badge-refunded",
};

const orderId = new URLSearchParams(window.location.search).get("id");

document.addEventListener("DOMContentLoaded", loadOrder);

function showAlert(message, type) {
  document.getElementById("alertBox").innerHTML = `<div class="alert-${type}">${message}</div>`;
}

async function loadOrder() {
  if (!orderId) {
    document.getElementById("orderContent").innerHTML = `<p class="error">No order specified.</p>`;
    return;
  }
  try {
    const o = await api.get(`/admin/orders/${orderId}/`);
    render(o);
  } catch {
    document.getElementById("orderContent").innerHTML = `<p class="error">Could not load this order.</p>`;
  }
}

function render(o) {
  document.getElementById("orderTitle").textContent = `Order #${String(o.id).padStart(4, "0")}`;

  const subtotal = o.items.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);
  const other = Number(o.total_amount) - subtotal; // delivery/fees, whatever makes up the difference

  const a = o.address || {};

  document.getElementById("orderContent").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;">

      <div class="card">
        <div class="card-header">
          <span class="card-header-label">Status</span>
          <span class="badge ${STATUS_BADGE[o.status] || ""}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
        </div>
        <div style="padding:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <label class="form-label" style="margin:0;">Update status</label>
          <select id="statusSelect" class="form-select" style="width:auto;">
            ${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join("")}
          </select>
          <span class="admin-subtext" style="margin-left:auto;">
            Placed ${new Date(o.created_at).toLocaleString()}${o.updated_at ? ` &middot; Updated ${new Date(o.updated_at).toLocaleString()}` : ""}
          </span>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-header-label">Payment</span></div>
        <div style="padding:20px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;">
          <div><span class="form-label">Method</span><div>bKash</div></div>
          <div><span class="form-label">Status</span><div>${o.payment?.status ? o.payment.status.charAt(0).toUpperCase() + o.payment.status.slice(1) : "Awaiting Payment"}</div></div>
          <div><span class="form-label">Transaction ID</span><div class="mono-input">${escapeHtml(o.payment?.reference || "—")}</div></div>
          <div><span class="form-label">Submitted amount</span><div>${o.payment ? formatPrice(o.payment.amount) : "—"}</div></div>
          <div><span class="form-label">Submitted at</span><div>${o.payment?.submitted_at ? new Date(o.payment.submitted_at).toLocaleString() : "—"}</div></div>
          <div><span class="form-label">Verified at</span><div>${o.payment?.verified_at ? new Date(o.payment.verified_at).toLocaleString() : "—"}</div></div>
        </div>
        ${o.payment?.status === "submitted" ? `<div style="padding:0 20px 20px;display:flex;gap:10px;flex-wrap:wrap;"><button type="button" id="verifyPaymentBtn" class="btn btn-primary">Verify Payment</button><button type="button" id="rejectPaymentBtn" class="btn btn-outline">Reject Payment</button></div>` : ""}
      </div>

      <div class="card">
        <div class="card-header"><span class="card-header-label">Shipping Address</span></div>
        <div class="admin-shipping-grid" style="padding:20px;">
          <div><span class="form-label">Full name</span><div>${a.full_name || "—"}</div></div>
          <div><span class="form-label">Phone</span><div>${a.phone || "—"}</div></div>
          <div><span class="form-label">Address</span><div>${a.address_line1 || ""}${a.address_line2 ? `, ${a.address_line2}` : ""}</div></div>
          <div><span class="form-label">City</span><div>${a.city || "—"}</div></div>
          <div><span class="form-label">Postal code</span><div>${a.postal_code || "—"}</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-header-label">Items</span></div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr><th>Product</th><th>Size</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead>
            <tbody>
              ${o.items
                .map(
                  (i) => `
                <tr>
                  <td style="display:flex;align-items:center;gap:10px;">
                    <img class="data-thumb" src="${mediaUrl(i.product_image)}" alt="${i.product_name}" />
                    ${i.product_name}
                  </td>
                  <td>EU ${i.size}</td>
                  <td>${i.quantity}</td>
                  <td class="mono-input">${formatPrice(i.unit_price)}</td>
                  <td class="mono-input" style="color:var(--admin-accent);font-weight:700;">${formatPrice(i.unit_price * i.quantity)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-header-label">Order Summary</span></div>
        <div class="admin-order-summary" style="padding:20px;">
          <div style="display:flex;justify-content:space-between;"><span class="admin-subtext">Items subtotal</span><span>${formatPrice(subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;"><span class="admin-subtext">Delivery / fees</span><span>${formatPrice(other)}</span></div>
          <hr style="border:none;border-top:1px solid var(--admin-border-soft);margin:6px 0;" />
          <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.05rem;">
            <span>Total</span><span style="color:var(--admin-accent);">${formatPrice(o.total_amount)}</span>
          </div>
        </div>
      </div>

    </div>
  `;

  document.getElementById("verifyPaymentBtn")?.addEventListener("click", async (e) => {
    if (!window.confirm("Have you checked the bKash transaction/reference and payment amount?")) return;
    e.target.disabled = true;
    try {
      await api.post("/admin/orders/" + o.id + "/verify-payment/");
      showAlert("Payment verified and order marked as paid.", "success");
      loadOrder();
    } catch (err) {
      showAlert(err.data?.error || "Could not verify payment.", "error");
      e.target.disabled = false;
    }
  });

  document.getElementById("rejectPaymentBtn")?.addEventListener("click", async (e) => {
    if (!window.confirm("Reject this bKash payment? The customer will be able to submit a new transaction ID.")) return;
    e.target.disabled = true;
    try {
      await api.post("/admin/orders/" + o.id + "/reject-payment/");
      showAlert("Payment rejected. The customer can submit a new transaction ID.", "success");
      loadOrder();
    } catch (err) {
      showAlert(err.data?.error || "Could not reject payment.", "error");
      e.target.disabled = false;
    }
  });

  document.getElementById("statusSelect").addEventListener("change", async (e) => {
    const newStatus = e.target.value;
    e.target.disabled = true;
    try {
      await api.patch(`/admin/orders/${o.id}/`, { status: newStatus });
      showAlert("Status updated.", "success");
      loadOrder();
    } catch (err) {
      showAlert(err.data?.error || "Could not update status.", "error");
      e.target.disabled = false;
    }
  });
}