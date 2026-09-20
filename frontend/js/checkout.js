// checkout.js
// SneakVix currently uses a fixed ৳100 delivery charge for Bangladesh orders.
const DELIVERY_CHARGE = 100.0;

async function showTotals() {
  const items = await api.get("/cart/");
  if (items.length === 0) {
    window.location.href = "cart.html";
    return;
  }

  const subtotal = items.reduce((sum, i) => sum + Number(i.product_price) * i.quantity, 0);
  const discount = 0;
  const total = subtotal + DELIVERY_CHARGE - discount;

  document.getElementById("summaryItems").innerHTML = items
    .map(
      (i) => `
    <div class="checkout-mini-item">
      <img class="checkout-mini-img" src="${mediaUrl(i.product_image)}" alt="${escapeHtml(i.product_name)}" />
      <div class="checkout-mini-name">${escapeHtml(i.product_name)}<br><small>Size ${escapeHtml(i.size)} &middot; Qty ${escapeHtml(i.quantity)}</small></div>
      <span class="checkout-mini-price">${formatPrice(i.product_price * i.quantity)}</span>
    </div>
  `
    )
    .join("");

  document.getElementById("totals").innerHTML = `
    <div class="summary-row"><span>Subtotal</span><strong>${formatPrice(subtotal)}</strong></div>
    <div class="summary-row"><span>Delivery</span><strong>${formatPrice(DELIVERY_CHARGE)}</strong></div>
    <div class="summary-row"><span>Discount</span><strong class="discount-value">${discount ? "- " + formatPrice(discount) : formatPrice(0)}</strong></div>
    <hr class="summary-divider" />
    <div class="summary-total-row">
      <span>Total</span>
      <span class="total-amount">${formatPrice(total)}</span>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  showTotals();

  document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("error");
    errorEl.textContent = "";

    const placeOrderBtn = document.getElementById("placeOrderBtn");
    const originalLabel = placeOrderBtn.innerHTML;
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = `<span class="btn-spinner"></span> Placing order...`;

    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());

    try {
      const order = await api.post("/checkout/", body);
      showOrderSuccess(order);
    } catch (err) {
      const data = err.data || {};
      errorEl.innerHTML = formatApiError(data || { error: err.message || "Something went wrong." });
      placeOrderBtn.disabled = false;
      placeOrderBtn.innerHTML = originalLabel;
    }
  });
});

function showOrderSuccess(order) {
  const paddedId = String(order.id).padStart(6, "0");
  const bkashNumber = order.bkash_number || "01XXXXXXXXX";

  // The backend calculates the authoritative order total, including the
  // fixed Bangladesh delivery charge. Use that exact total for bKash so the
  // customer is never instructed to send an incorrect amount.
  const bkashAmount = Number(order.total_amount);

  document.getElementById("checkoutIntro").style.display = "none";
  document.getElementById("checkoutLayout").style.display = "none";

  const wrap = document.getElementById("orderSuccess");
  wrap.style.display = "block";
  wrap.innerHTML = `
    <div class="order-success-wrap">
      <div class="order-success-icon">\u2705</div>
      <h2>Order Placed!</h2>
      <p class="cart-page-subtitle">Your order ID is:</p>

      <div class="order-id-badge">
        <p class="label">Order ID</p>
        <p class="value">#${paddedId}</p>
      </div>

      <div class="bkash-box">
        <div class="bkash-box-header"><strong>\uD83D\DCF1 Complete Your Payment via bKash</strong></div>
        <div class="bkash-box-body">
          <table class="bkash-table">
            <tr><td>bKash Number</td><td>${escapeHtml(bkashNumber)}</td></tr>
            <tr><td>Amount</td><td>${formatPrice(bkashAmount)}</td></tr>
            <tr class="ref-row"><td>Reference (Required)</td><td>#${escapeHtml(paddedId)}</td></tr>
          </table>
          <ol class="bkash-steps">
            <li>Open bKash &rarr; tap <strong>Send Money</strong></li>
            <li>Enter number: <strong>${escapeHtml(bkashNumber)}</strong></li>
            <li>Amount: <strong>${formatPrice(bkashAmount)}</strong></li>
            <li>Reference: <strong>#${escapeHtml(paddedId)}</strong></li>
            <li>Complete payment</li>
          </ol>
          <div class="bkash-warning">Order will only be processed after bKash payment is verified.</div>
        </div>
      </div>

      <p class="order-email-note">
        ${
          order.email_sent
            ? "\uD83D\DCE7 A confirmation email with payment instructions has been sent to your inbox."
            : "\uD83D\DCE7 We couldn't send the confirmation email \u2014 but your order is placed. Note your Order ID above."
        }
      </p>

      <a href="index.html" class="btn btn-primary large">Continue Shopping</a>
    </div>
  `;
}