// receipt.js — clean, branded SneakVix receipts.

function receiptData(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);
  const total = Number(order.total_amount || 0);
  return { items, subtotal, delivery: Math.max(0, total - subtotal), total, address: order.address || {} };
}

function receiptHtml(order, mode) {
  const d = receiptData(order);
  const orderNo = "#" + String(order.id).padStart(6, "0");
  const created = order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString();
  const pos = mode === "pos";
  const logoUrl = "https://gargfwngcvmoggilbvfl.supabase.co/storage/v1/object/public/sneaker/logo-light.png";

  const itemRows = d.items.map(function (item) {
    const qty = Number(item.quantity || 0);
    const unit = Number(item.unit_price || 0);
    return '<tr><td><div class="product">' + escapeHtml(item.product_name || "Product") + '</div><div class="detail">Size: ' +
      escapeHtml(item.size || "—") + ' &nbsp;·&nbsp; Qty: ' + qty + '</div></td><td class="money">' +
      formatPrice(unit * qty) + '</td></tr>';
  }).join("");

  const paymentStatus = order.payment?.status || (order.status === "paid" ? "Verified" : "Awaiting Payment");
  const paymentReference = order.payment?.reference || "—";

  return '<!doctype html><html><head><meta charset="utf-8"><title>SneakVix Receipt ' + escapeHtml(orderNo) + '</title><style>' +
    '@page{size:' + (pos ? "80mm auto" : "A4") + ';margin:' + (pos ? "3mm" : "14mm") + '}' +
    '*{box-sizing:border-box}body{margin:0;background:#fff;color:#181818;font-family:Arial,Helvetica,sans-serif}' +
    '.receipt{width:' + (pos ? "74mm" : "720px") + ';max-width:100%;margin:0 auto}' +
    '.header{padding:' + (pos ? "10px 0 12px" : "0 0 18px") + ';border-bottom:2px solid #111;display:flex;align-items:center;justify-content:space-between;gap:18px}' +
    '.logo{display:block;width:' + (pos ? "105px" : "170px") + ';height:auto;object-fit:contain}.company{text-align:right;color:#777;font-size:' + (pos ? "8px" : "10px") + ';line-height:1.5}' +
    '.title-row{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin:24px 0 18px}.title{font-size:' + (pos ? "17px" : "24px") + ';font-weight:700;letter-spacing:-.02em}.order-no{margin-top:4px;color:#666;font-size:' + (pos ? "9px" : "12px") + '}.date{text-align:right;color:#666;font-size:' + (pos ? "9px" : "11px") + ';line-height:1.6}' +
    '.info{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}.box{border:1px solid #ddd;padding:12px;border-radius:6px}.label{font-size:' + (pos ? "8px" : "9px") + ';font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#777;margin-bottom:6px}.value{font-size:' + (pos ? "9px" : "11px") + ';line-height:1.55}' +
    'table{width:100%;border-collapse:collapse}th{padding:8px 0;text-align:left;border-top:1px solid #111;border-bottom:1px solid #ddd;font-size:' + (pos ? "8px" : "10px") + ';text-transform:uppercase;letter-spacing:.06em;color:#555}th:last-child{text-align:right}td{padding:11px 0;border-bottom:1px solid #e5e5e5;vertical-align:top}.product{font-size:' + (pos ? "9px" : "12px") + ';font-weight:700}.detail{font-size:' + (pos ? "8px" : "10px") + ';color:#777;margin-top:3px}.money{text-align:right;white-space:nowrap;font-size:' + (pos ? "9px" : "12px") + ';font-weight:600}' +
    '.totals{width:' + (pos ? "100%" : "300px") + ';margin:16px 0 0 auto}.line{display:flex;justify-content:space-between;padding:4px 0;font-size:' + (pos ? "9px" : "11px") + '}.grand{border-top:2px solid #111;margin-top:6px;padding-top:9px;font-size:' + (pos ? "12px" : "15px") + ';font-weight:700}' +
    '.payment{margin-top:24px;padding:12px 14px;border:1px solid #ddd;border-radius:6px}.payment-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.payment .value{word-break:break-word}.status{font-weight:700;text-transform:capitalize}' +
    '.footer{margin-top:28px;padding-top:14px;border-top:1px solid #ddd;text-align:center;color:#777;font-size:' + (pos ? "8px" : "10px") + ';line-height:1.6}.footer strong{color:#222}.pos-hide{display:' + (pos ? "none" : "block") + '}' +
    '@media print{body{background:#fff}.receipt{margin:0;box-shadow:none}}' +
    '</style></head><body><main class="receipt">' +
    '<header class="header"><img class="logo" src="' + logoUrl + '" alt="SneakVix"><div class="company">SNEAKVIX<br>Premium Sneakers</div></header>' +
    '<section class="title-row"><div><div class="title">Order Receipt</div><div class="order-no">Order ' + escapeHtml(orderNo) + '</div></div><div class="date">' + escapeHtml(created) + '<br><strong>' + escapeHtml((order.status || "pending").toUpperCase()) + '</strong></div></section>' +
    '<section class="info"><div class="box"><div class="label">Bill To</div><div class="value"><strong>' + escapeHtml(d.address.full_name || "—") + '</strong><br>' + escapeHtml(d.address.phone || "—") + '</div></div><div class="box"><div class="label">Delivery Address</div><div class="value">' + escapeHtml(d.address.address_line1 || "—") + (d.address.address_line2 ? ", " + escapeHtml(d.address.address_line2) : "") + '<br>' + escapeHtml(d.address.city || "") + (d.address.postal_code ? " - " + escapeHtml(d.address.postal_code) : "") + '</div></div></section>' +
    '<table><thead><tr><th>Item</th><th>Amount</th></tr></thead><tbody>' + (itemRows || '<tr><td>No items</td><td></td></tr>') + '</tbody></table>' +
    '<section class="totals"><div class="line"><span>Subtotal</span><span>' + formatPrice(d.subtotal) + '</span></div><div class="line"><span>Delivery</span><span>' + formatPrice(d.delivery) + '</span></div><div class="line grand"><span>Total</span><span>' + formatPrice(d.total) + '</span></div></section>' +
    '<section class="payment"><div class="label">Payment Information</div><div class="payment-grid"><div><div class="label">Method</div><div class="value">bKash</div></div><div><div class="label">Status</div><div class="value status">' + escapeHtml(paymentStatus) + '</div></div><div><div class="label">Transaction ID</div><div class="value">' + escapeHtml(paymentReference) + '</div></div></div></section>' +
    '<footer class="footer"><strong>Thank you for shopping with SneakVix.</strong><br>For your records · ' + escapeHtml(orderNo) + '</footer></main></body></html>';
}

function printReceipt(order, mode) {
  const popup = window.open("", "_blank", "width=800,height=900");
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
