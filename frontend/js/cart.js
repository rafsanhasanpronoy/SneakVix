// cart.js — works for both logged-in users (server cart via /cart/) and
// guests (localStorage guest cart, see api.js). Checkout still requires
// login — a guest's "Proceed to checkout" goes to login.html?next=checkout.html
// instead, and mergeGuestCartIntoServerCart() runs right after login/signup.
document.addEventListener("DOMContentLoaded", loadCart);

async function loadCart() {
  const el = document.getElementById("cartContainer");
  if (isLoggedIn()) {
    await loadServerCart(el);
  } else {
    await loadGuestCartView(el);
  }
}

async function loadServerCart(el) {
  try {
    const items = await api.get("/cart/");
    renderCart(el, items, false);
  } catch {
    el.innerHTML = `<p class="error">Could not load your cart.</p>`;
  }
}

async function loadGuestCartView(el) {
  const guestItems = getGuestCart();
  if (guestItems.length === 0) {
    renderCart(el, [], true);
    return;
  }

  // Fetch each product fresh (public endpoint, no auth needed) so price,
  // image, and current stock stay accurate rather than a stale snapshot.
  const results = await Promise.allSettled(
    guestItems.map(async (gi) => ({ gi, product: await api.get(`/products/${gi.product_id}/`) }))
  );

  const items = [];
  const stillValid = [];
  results.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      const { gi, product: p } = r.value;
      items.push({
        id: `${gi.product_id}-${gi.size}`,
        product_id: gi.product_id,
        product_name: p.name,
        product_price: p.price,
        product_image: p.image_main,
        size: gi.size,
        quantity: gi.quantity,
      });
      stillValid.push(guestItems[idx]);
    }
    // rejected = product no longer exists; drop it from the guest cart below
  });

  if (stillValid.length !== guestItems.length) saveGuestCart(stillValid);

  renderCart(el, items, true);
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

  el.innerHTML = `
    <h1 class="cart-page-title">Your Cart</h1>
    <p class="cart-page-subtitle">
      ${items.length} item${items.length > 1 ? "s" : ""} in your cart
      ${isGuest ? ' &middot; <a href="login.html" style="color:var(--primary);text-decoration:none;">log in</a> to save it to your account' : ""}
    </p>

    <div class="cart-layout">
      <div>
        ${items
          .map(
            (i) => `
          <div class="cart-item-row">
            <img class="cart-item-img" src="${mediaUrl(i.product_image)}" alt="${i.product_name}" />
            <div class="cart-item-info">
              <h4>${i.product_name}</h4>
              <span class="cart-item-price">${formatPrice(i.product_price * i.quantity)}</span>
              <small>Size ${i.size} &middot; Qty ${i.quantity}</small>
            </div>
            <div class="cart-item-actions">
              <button class="cart-remove-link removeBtn" data-id="${i.id}" data-product-id="${i.product_id}" data-size="${i.size}">Remove</button>
            </div>
          </div>
        `
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
        <a href="${isGuest ? "login.html?next=checkout.html" : "checkout.html"}">
          <button class="btn-checkout">${isGuest ? "Log in to checkout" : "Proceed to checkout"}</button>
        </a>
        <p class="cart-secure-note">Secure checkout</p>
      </div>
    </div>
  `;

  el.querySelectorAll(".removeBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (isGuest) {
        removeFromGuestCart(Number(btn.dataset.productId), Number(btn.dataset.size));
        loadCart();
        renderNav();
      } else {
        await api.del(`/cart/${btn.dataset.id}/`);
        loadCart();
        renderNav();
      }
    });
  });
}