// receipt.js — printable/downloadable SneakVix receipts.

function receiptData(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);
  const total = Number(order.total_amount || 0);
  const delivery = total - subtotal;
  return { items, subtotal, delivery, total, address: order.address || {} };
}

function receiptHtml(order, mode) {
  const d = receiptData(order);
  const orderNo = "#"+String(order.id).padStart(6, "0");
  const created = order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString();
  const itemRows = d.items.map(function(item) {
    return '<tr><td>'+escapeHtml(item.product_name || "Product")+'<br><small>Size '+escapeHtml(item.size || "—")+' × '+Number(item.quantity || 0)+'</small></td><td class="amount">'+formatPrice(Number(item.unit_price || 0) * Number(item.quantity || 0))+'</td></tr>';
  }).join("");

  const pos = mode === "pos";
  return '<!doctype html><html><head><meta charset="utf-8"><title>SneakVix Receipt '+escapeHtml(orderNo)+'</title><style>'+
    '@page{size:'+(pos ? '80mm auto' : 'A4')+';margin:'+(pos ? '4mm' : '12mm')+'}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff}.receipt{width:'+(pos ? '72mm' : '100%')+';max-width:100%;margin:0 auto}.brand{text-align:center;font-size:'+(pos ? '20px' : '26px')+';font-weight:800;letter-spacing:.04em}.muted{color:#666;font-size:11px}.center{text-align:center}.meta{margin:12px 0;padding:10px 0;border-top:1px dashed #888;border-bottom:1px dashed #888;font-size:12px}table{width:100%;border-collapse:collapse;font-size:'+(pos ? '11px' : '13px')+'}td{padding:6px 0;vertical-align:top;border-bottom:1px dotted #ccc}.amount{text-align:right;white-space:nowrap;font-weight:600}small{color:#666}.summary{margin-top:8px}.summary div{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}.total{margin-top:5px;padding-top:8px;border-top:2px solid #111;font-size:15px!important;font-weight:800}.customer{margin-top:14px;padding-top:10px;border-top:1px dashed #888;font-size:11px;line-height:1.5}.footer{margin-top:16px;text-align:center;font-size:10px;color:#666}<\/style></head><body><div class="receipt"><div class="brand">SNEAKVIX</div><div class="center muted">Sneaker Store</div><div class="meta"><strong>Order '+escapeHtml(orderNo)+'</strong><br>'+escapeHtml(created)+'<br>Status: '+escapeHtml(order.status || "pending")+'</div><table><tbody>'+(itemRows || '<tr><td>No items</td><td></td></tr>')+'</tbody></table><div class="summary"><div><span>Subtotal</span><span>'+formatPrice(d.subtotal)+'</span></div><div><span>Delivery</span><span>'+formatPrice(d.delivery)+'</span></div><div class="total"><span>Total</span><span>'+formatPrice(d.total)+'</span></div></div><div class="customer"><strong>Customer</strong><br>'+escapeHtml(d.address.full_name || "—")+'<br>'+escapeHtml(d.address.phone || "—")+'<br>'+escapeHtml(d.address.address_line1 || "")+(d.address.address_line2 ? ", "+escapeHtml(d.address.address_line2) : "")+'<br>'+escapeHtml(d.address.city || "")+(d.address.postal_code ? " - "+escapeHtml(d.address.postal_code) : "")+'</div><div class="footer">Thank you for shopping with SneakVix.</div></div></body></html>';
}

function printReceipt(order, mode) {
  const popup = window.open("", "_blank", "width=480,height=700");
  if (!popup) { if (typeof showToast === "function") showToast("Please allow pop-ups to print the receipt.", "error"); return; }
  popup.document.open();
  popup.document.write(receiptHtml(order, mode || "normal"));
  popup.document.close();
  popup.focus();
  setTimeout(function() { popup.print(); }, 250);
}

function downloadReceipt(order, mode) {
  const selectedMode = mode || "normal";
  const blob = new Blob([receiptHtml(order, selectedMode)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "SneakVix-Receipt-"+String(order.id).padStart(6, "0")+"-"+selectedMode+".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}
