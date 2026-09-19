// cart.js — works for both logged-in users (server cart via /cart/) and
// guests (localStorage guest cart). Checkout still requires login — a
// guest's "Proceed to checkout" goes to login.html?next=checkout.html
// instead, and mergeGuestCartIntoServerCart() runs right after login/signup.
document.addEventListener("DOMContentLoaded", loadCart);

async function loadCart() {
  const el = document.getElementById("cartContainer");
  try {
    const { items, isGuest } = await getUnifiedCartItems();
    renderCart(el, items, isGuest);
  } catch {
    el.innerHTML = `<p class="error">Could not load your cart.</p>`;
  }
}

function renderCart(el, items, isGuest) {
  if (items.length === 0) {
    el.innerHTML = `
      <h1 class="cart-page-title">Your Cart</h1>
      <div class="empty-state">
        <p>Your cart is empty.</p>
        <a href="products.html">Browse products &rarr;</a>
      </div>
    `;
    return;
  }

  const subtotal = items.reduce((sum, i) => sum + Number(i.product_price) * i.quantity, 0);
  const deliveryEstimate = 100.0;
  const hasStockIssue = items.some((i) => Number(i.stock) < Number(i.quantity));

  el.innerHTML = `
    <h1 class="cart-page-title">Your Cart</h1>
    <p class="cart-page-subtitle">
      ${items.length} item${items.length > 1 ? "s" : ""} in your cart
      ${isGuest ? ' &middot; <a href="login.html" style="color:var(--primary);text-decoration:none;">log in</a> to save it to your account' : ""}
    </p>
    ${hasStockIssue ? `
      <div class="error" style="margin-bottom:1rem;">
        Some cart items no longer have enough stock. Remove or reduce the affected items before checkout.
      </div>
    ` : ""}

    <div class="cart-layout">
      <div>
        ${items
          .map(
            (i) => {
              const stock = Number(i.stock);
              const quantity = Number(i.quantity);
              const stockIssue = stock < quantity;
              const stockText = stockIssue
                ? (stock > 0 ? `Only ${stock} available` : "Out of stock")
                : `${stock} available`;
              return `
          <div class="cart-item-row${stockIssue ? " cart-item-stock-warning" : ""}">
            <img class="cart-item-img" src="${escapeHtml(mediaUrl(i.product_image))}" alt="${escapeHtml(i.product_name)}" />
            <div class="cart-item-info">
              <h4>${escapeHtml(i.product_name)}</h4>
              <span class="cart-item-price">${formatPrice(i.product_price * quantity)}</span>
              <small>Size ${escapeHtml(i.size)} &middot; Qty ${quantity}</small>
              <small class="cart-stock-status">${escapeHtml(stockText)}</small>
            </div>
            <div class="cart-item-actions">
              <button class="cart-remove-link removeBtn" data-id="${escapeHtml(i.id)}" data-product-id="${escapeHtml(i.product_id)}" data-size="${escapeHtml(i.size)}" data-name="${escapeHtml(i.product_name)}">Remove</button>
            </div>
          </div>
        `;
            }
          )
          .join("")}
      </div>

      <div class="order-summary-card">
        <h3>Order Summary</h3>
        <div class="summary-row"><span>Subtotal</span><strong>${formatPrice(subtotal)}</strong></div>
        <div class="summary-row"><span>Estimated delivery</span><strong>${formatPrice(deliveryEstimate)}</strong></div>
        <hr class="summary-divider" />
        <div class="summary-total-row">
          <span>Total</span>
          <span class="total-amount">${formatPrice(subtotal + deliveryEstimate)}</span>
        </div>
        ${hasStockIssue
          ? `<button class="btn-checkout" type="button" disabled title="Update your cart stock before checkout">Update cart to checkout</button>`
          : `<a href="${isGuest ? "login.html?next=checkout.html" : "checkout.html"}">
              <button class="btn-checkout" type="button">${isGuest ? "Log in to checkout" : "Proceed to checkout"}</button>
            </a>`}
        <p class="cart-secure-note">Secure checkout</p>
      </div>
    </div>
  `;

  el.querySelectorAll(".removeBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openConfirmModal({
        title: "Remove item?",
        message: `Remove ${escapeHtml(btn.dataset.name)} from your cart?`,
        confirmLabel: "Remove",
        danger: true,
        onConfirm: async () => {
          if (isGuest) {
            removeFromGuestCart(Number(btn.dataset.productId), Number(btn.dataset.size));
          } else {
            await api.del(`/cart/${btn.dataset.id}/`);
          }
          await loadCart();
          renderNav();
        },
      });
    });
  });
}