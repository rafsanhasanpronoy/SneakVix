// admin-orders.js — order list with search, filters, status updates, and payment verification.
const STATUS_TRANSITIONS = { pending: ["cancelled"], paid: ["processing", "refunded"], processing: ["shipped"], shipped: ["delivered"], delivered: [], cancelled: [], refunded: [] };
const STATUS_BADGE = {
  pending: "badge-pending",
  paid: "badge-paid",
  processing: "badge-processing",
  shipped: "badge-shipped",
  delivered: "badge-delivered",
  cancelled: "badge-cancelled",
  refunded: "badge-refunded",
};

function getState() {
  const params = new URLSearchParams(window.location.search);
  return { search: params.get("search") || "", status: params.get("status") || "", ordering: params.get("ordering") || "-created_at" };
}
function applyStateToControls(state) {
  document.getElementById("orderSearch").value = state.search;
  document.getElementById("statusFilter").value = state.status;
  document.getElementById("orderSort").value = state.ordering;
}
function readControlsToState() {
  return { search: document.getElementById("orderSearch").value.trim(), status: document.getElementById("statusFilter").value, ordering: document.getElementById("orderSort").value };
}
function stateToParams(state) {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.status) params.set("status", state.status);
  if (state.ordering && state.ordering !== "-created_at") params.set("ordering", state.ordering);
  return params;
}

async function loadOrders(pushHistory = false) {
  const state = readControlsToState();
  const params = stateToParams(state);
  if (pushHistory) {
    const url = new URL(window.location);
    url.search = params.toString();
    window.history.pushState({}, "", url);
  }

  const el = document.getElementById("orderRows");
  el.innerHTML = `<tr><td colspan="8" class="empty-row">Loading...</td></tr>`;

  try {
    const orders = await api.get(`/admin/orders/?${params.toString()}`);
    document.getElementById("orderCount").textContent = `${orders.length} order${orders.length === 1 ? "" : "s"} found`;

    if (orders.length === 0) {
      el.innerHTML = `<tr><td colspan="8" class="empty-row">No orders match.</td></tr>`;
      return;
    }

    el.innerHTML = orders.map((o) => {
      const paymentStatus = o.payment?.status || "unsubmitted";
      const paymentLabel = {
        submitted: "Submitted",
        verified: "Verified",
        rejected: "Rejected",
        unsubmitted: "Awaiting Payment"
      }[paymentStatus] || paymentStatus;
      const paymentClass = paymentStatus === "submitted" ? "badge-pending" : paymentStatus === "verified" ? "badge-paid" : paymentStatus === "rejected" ? "badge-cancelled" : "";
      return `
      <tr>
        <td><span class="mono-input" style="font-size:12px;color:#bbb;">#${String(o.id).padStart(4, "0")}</span></td>
        <td style="font-weight:500;">
          ${o.address?.full_name || "—"}
          <div style="font-size:11.5px;color:#bbb;">${o.address?.city || ""}</div>
        </td>
        <td class="mono-input" style="font-size:13px;color:var(--admin-accent);font-weight:700;">${formatPrice(o.total_amount)}</td>
        <td><span class="badge ${STATUS_BADGE[o.status] || ""}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="badge ${paymentClass}">${paymentLabel}</span>
            ${paymentStatus === "submitted" ? `<button type="button" class="btn-row-edit verify-payment-btn" data-id="${o.id}">Verify Payment</button>` : ""}
          </div>
        </td>
        <td style="color:#aaa;font-size:13px;">${new Date(o.created_at).toLocaleDateString()}</td>
        <td>
          <select class="form-select status-select" data-id="${o.id}" style="width:auto;padding:6px 10px;font-size:12.5px;">
            ${[o.status, ...(STATUS_TRANSITIONS[o.status] || [])].map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join("")}
          </select>
        </td>
        <td style="text-align:right;"><a href="order-detail.html?id=${o.id}" class="btn-row-edit">View</a></td>
      </tr>`;
    }).join("");

    el.querySelectorAll(".verify-payment-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.confirm("Have you checked the bKash transaction/reference and payment amount?")) return;
        btn.disabled = true;
        try { await api.post(`/admin/orders/${btn.dataset.id}/verify-payment/`); loadOrders(); }
        catch { btn.disabled = false; }
      });
    });

    el.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        sel.disabled = true;
        try { await api.patch(`/admin/orders/${sel.dataset.id}/`, { status: sel.value }); loadOrders(); }
        catch { sel.disabled = false; }
      });
    });
  } catch {
    document.getElementById("orderCount").textContent = "";
    el.innerHTML = `<tr><td colspan="8" class="empty-row">Could not load orders.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyStateToControls(getState());
  loadOrders(false);
  document.getElementById("orderSearch").addEventListener("input", debounce(() => loadOrders(true), 400));
  document.getElementById("statusFilter").addEventListener("change", () => loadOrders(true));
  document.getElementById("orderSort").addEventListener("change", () => loadOrders(true));
  window.addEventListener("popstate", () => { applyStateToControls(getState()); loadOrders(false); });
});
function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}