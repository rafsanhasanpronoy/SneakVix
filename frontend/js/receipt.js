// receipt.js — professional, branded, printable and downloadable SneakVix receipts.

function receiptData(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);
  const total = Number(order.total_amount || 0);
  const delivery = Math.max(0, total - subtotal);
  return { items, subtotal, delivery, total, address: order.address || {} };
}

function receiptHtml(order, mode) {
  const d = receiptData(order);
  const orderNo = "#" + String(order.id).padStart(6, "0");
  const created = order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString();
  const pos = mode === "pos";
  const logoUrl = new URL("favicon.svg", window.location.href).href;

  const itemRows = d.items.map(function (item) {
    const qty = Number(item.quantity || 0);
    const unit = Number(item.unit_price || 0);
    return '<tr><td><strong>' + escapeHtml(item.product_name || "Product") + '</strong><br><small>Size ' +
      escapeHtml(item.size || "—") + ' &middot; Qty ' + qty + ' &middot; ' + formatPrice(unit) + ' each</small></td>' +
      '<td class="amount">' + formatPrice(unit * qty) + '</td></tr>';
  }).join("");

  const paymentStatus = order.payment?.status || (order.status === "paid" ? "verified" : "pending");
  const paymentReference = order.payment?.reference || "—";

  return '<!doctype html><html><head><meta charset="utf-8"><title>SneakVix Receipt ' + escapeHtml(orderNo) + '</title><style>' +
    '@page{size:' + (pos ? "80mm auto" : "A4") + ';margin:' + (pos ? "4mm" : "12mm") + '}' +
    '*{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#171717;font-family:Inter,Arial,Helvetica,sans-serif}' +
    '.receipt{width:' + (pos ? "72mm" : "760px") + ';max-width:100%;margin:24px auto;background:#fff;border:1px solid #e5e7eb;border-radius:' + (pos ? "0" : "16px") + ';overflow:hidden;box-shadow:' + (pos ? "none" : "0 8px 30px rgba(0,0,0,.08)") + '}' +
    '.top{background:#111;color:#fff;padding:' + (pos ? "14px" : "28px 32px") + '}.brand{display:flex;align-items:center;gap:10px}.logo{width:' + (pos ? "30px" : "42px") + 'px;height:' + (pos ? "30px" : "42px") + 'px;border-radius:9px}.brand-name{font-size:' + (pos ? "18px" : "25px") + 'px;font-weight:800;letter-spacing:.05em}.tagline{color:#b8b8b8;font-size:' + (pos ? "9px" : "12px") + 'px;margin-top:3px}' +
    '.content{padding:' + (pos ? "12px" : "28px 32px") + '}.order-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}.order-no{font-size:' + (pos ? "14px" : "20px") + 'px;font-weight:800}.muted{color:#6b7280;font-size:11px}.status{display:inline-block;margin-top:5px;padding:4px 9px;border-radius:999px;background:#f3f4f6;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}' +
    '.section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#777;margin:18px 0 8px}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#fafafa;border:1px solid #eee;border-radius:10px;padding:13px}.meta-grid div{font-size:11px;line-height:1.5}.meta-grid strong{display:block;font-size:9px;text-transform:uppercase;color:#888;letter-spacing:.06em}' +
    'table{width:100%;border-collapse:collapse;font-size:' + (pos ? "10px" : "12px") + 'px}th{text-align:left;padding:8px 0;color:#777;font-size:9px;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #ddd}th:last-child{text-align:right}td{padding:10px 0;border-bottom:1px solid #eee;vertical-align:top}td small{color:#777}.amount{text-align:right;white-space:nowrap;font-weight:700}' +
    '.summary{margin-left:auto;width:' + (pos ? "100%" : "300px") + ';margin-top:16px}.summary div{display:flex;justify-content:space-between;padding:5px 0;font-size:12px}.total{margin-top:7px;padding-top:10px;border-top:2px solid #111;font-size:16px!important;font-weight:800}.payment{margin-top:20px;padding:13px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;font-size:11px}.payment-row{display:flex;justify-content:space-between;padding:3px 0}.customer{margin-top:18px;padding-top:15px;border-top:1px solid #e5e7eb;font-size:11px;line-height:1.55}.footer{text-align:center;padding:' + (pos ? "12px" : "18px 32px") + ';border-top:1px solid #eee;color:#777;font-size:10px}.footer strong{color:#222}.print-note{display:none}' +
    '</style></head><body><div class="receipt">' +
    '<div class="top"><div class="brand"><img class="logo" src="' + escapeHtml(logoUrl) + '" alt="SneakVix"><div><div class="brand-name">SNEAKVIX</div><div class="tagline">Premium sneakers. Curated drops.</div></div></div></div>' +
    '<div class="content"><div class="order-head"><div><div class="order-no">Receipt ' + escapeHtml(orderNo) + '</div><div class="muted">' + escapeHtml(created) + '</div></div><div style="text-align:right"><div class="muted">Order status</div><span class="status">' + escapeHtml(order.status || "pending") + '</span></div></div>' +
    '<div class="section-title">Order Items</div><table><thead><tr><th>Product</th><th>Amount</th></tr></thead><tbody>' + (itemRows || '<tr><td>No items</td><td></td></tr>') + '</tbody></table>' +
    '<div class="summary"><div><span>Subtotal</span><span>' + formatPrice(d.subtotal) + '</span></div><div><span>Delivery</span><span>' + formatPrice(d.delivery) + '</span></div><div class="total"><span>Total</span><span>' + formatPrice(d.total) + '</span></div></div>' +
    '<div class="payment"><div class="section-title" style="margin-top:0">Payment</div><div class="payment-row"><span>Method</span><strong>bKash</strong></div><div class="payment-row"><span>Status</span><strong>' + escapeHtml(paymentStatus) + '</strong></div><div class="payment-row"><span>Transaction ID</span><strong>' + escapeHtml(paymentReference) + '</strong></div></div>' +
    '<div class="customer"><strong>Delivery Information</strong><br>' + escapeHtml(d.address.full_name || "—") + '<br>' + escapeHtml(d.address.phone || "—") + '<br>' + escapeHtml(d.address.address_line1 || "") + (d.address.address_line2 ? ", " + escapeHtml(d.address.address_line2) : "") + '<br>' + escapeHtml(d.address.city || "") + (d.address.postal_code ? " - " + escapeHtml(d.address.postal_code) : "") + '</div></div>' +
    '<div class="footer"><strong>Thank you for shopping with SneakVix.</strong><br>Keep this receipt for your records.</div></div></body></html>';
}

function printReceipt(order, mode) {
  const popup = window.open("", "_blank", "width=480,height=800");
  if (!popup) {
    window.alert("Please allow pop-ups to print the receipt.");
    return;
  }
  popup.document.open();
  popup.document.write(receiptHtml(order, mode || "normal"));
  popup.document.close();
  popup.focus();
  setTimeout(function () { popup.print(); }, 350);
}

function downloadReceipt(order, mode) {
  const selectedMode = mode || "normal";
  const blob = new Blob([receiptHtml(order, selectedMode)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "SneakVix-Receipt-" + String(order.id).padStart(6, "0") + "-" + selectedMode + ".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}
