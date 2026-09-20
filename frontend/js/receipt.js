// receipt.js — branded SneakVix receipts + real PDF downloads.

const RECEIPT_LOGO_URL = "https://gargfwngcvmoggilbvfl.supabase.co/storage/v1/object/public/sneaker/logo-light.png";
const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

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
  const paymentStatus = order.payment?.status || (order.status === "paid" ? "Verified" : "Awaiting Payment");
  const paymentReference = order.payment?.reference || "—";

  const itemRows = d.items.map(function (item) {
    const qty = Number(item.quantity || 0);
    const unit = Number(item.unit_price || 0);
    return '<tr><td><div class="product">' + escapeHtml(item.product_name || "Product") + '</div><div class="detail">Size: ' +
      escapeHtml(item.size || "—") + ' &nbsp;·&nbsp; Qty: ' + qty + '</div></td><td class="money">' +
      formatPrice(unit * qty) + '</td></tr>';
  }).join("");

  return '<!doctype html><html><head><meta charset="utf-8"><title>SneakVix Receipt ' + escapeHtml(orderNo) + '</title><style>' +
    '@page{size:' + (pos ? "80mm auto" : "A4") + ';margin:' + (pos ? "3mm" : "14mm") + '}' +
    '*{box-sizing:border-box}body{margin:0;background:#fff;color:#181818;font-family:Arial,Helvetica,sans-serif}' +
    '.receipt{width:' + (pos ? "74mm" : "720px") + ';max-width:100%;margin:0 auto}' +
    '.header{padding:' + (pos ? "10px 0 12px" : "0 0 18px") + ';border-bottom:2px solid #111;display:flex;align-items:center;justify-content:space-between;gap:18px}' +
    '.logo{display:block;width:' + (pos ? "105px" : "170px") + ';height:auto;object-fit:contain}.company{text-align:right;color:#777;font-size:' + (pos ? "8px" : "10px") + ';line-height:1.5}' +
    '.title-row{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin:24px 0 18px}.title{font-size:' + (pos ? "17px" : "24px") + ';font-weight:700}.order-no{margin-top:4px;color:#666;font-size:' + (pos ? "9px" : "12px") + '}.date{text-align:right;color:#666;font-size:' + (pos ? "9px" : "11px") + ';line-height:1.6}' +
    '.info{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}.box{border:1px solid #ddd;padding:12px;border-radius:6px}.label{font-size:' + (pos ? "8px" : "9px") + ';font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#777;margin-bottom:6px}.value{font-size:' + (pos ? "9px" : "11px") + ';line-height:1.55}' +
    'table{width:100%;border-collapse:collapse}th{padding:8px 0;text-align:left;border-top:1px solid #111;border-bottom:1px solid #ddd;font-size:' + (pos ? "8px" : "10px") + ';text-transform:uppercase;color:#555}th:last-child{text-align:right}td{padding:11px 0;border-bottom:1px solid #e5e5e5;vertical-align:top}.product{font-size:' + (pos ? "9px" : "12px") + ';font-weight:700}.detail{font-size:' + (pos ? "8px" : "10px") + ';color:#777;margin-top:3px}.money{text-align:right;white-space:nowrap;font-size:' + (pos ? "9px" : "12px") + ';font-weight:600}' +
    '.totals{width:' + (pos ? "100%" : "300px") + ';margin:16px 0 0 auto}.line{display:flex;justify-content:space-between;padding:4px 0;font-size:' + (pos ? "9px" : "11px") + '}.grand{border-top:2px solid #111;margin-top:6px;padding-top:9px;font-size:' + (pos ? "12px" : "15px") + ';font-weight:700}' +
    '.payment{margin-top:24px;padding:12px 14px;border:1px solid #ddd;border-radius:6px}.payment-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.payment .value{word-break:break-word}.status{font-weight:700;text-transform:capitalize}' +
    '.footer{margin-top:28px;padding-top:14px;border-top:1px solid #ddd;text-align:center;color:#777;font-size:' + (pos ? "8px" : "10px") + ';line-height:1.6}' +
    '</style></head><body><main class="receipt">' +
    '<header class="header"><img class="logo" src="' + RECEIPT_LOGO_URL + '" alt="SneakVix"><div class="company">SNEAKVIX<br>Premium Sneakers</div></header>' +
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

function loadJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (window.__sneakvixJsPdfPromise) return window.__sneakvixJsPdfPromise;
  window.__sneakvixJsPdfPromise = new Promise(function (resolve, reject) {
    const script = document.createElement("script");
    script.src = JSPDF_URL;
    script.async = true;
    script.onload = function () {
      if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error("PDF library loaded but jsPDF is unavailable."));
    };
    script.onerror = function () { reject(new Error("Could not load the PDF generator.")); };
    document.head.appendChild(script);
  });
  return window.__sneakvixJsPdfPromise;
}

function imageBlobToDataUrl(blob) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadReceiptLogo() {
  try {
    const response = await fetch(RECEIPT_LOGO_URL, { mode: "cors" });
    if (!response.ok) throw new Error("Logo request failed");
    return await imageBlobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}

function pdfMoney(value) {
  return "BDT " + Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function downloadReceipt(order, mode) {
  const selectedMode = mode || "normal";
  const button = document.activeElement;
  if (button && button.tagName === "BUTTON") {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "Preparing PDF...";
  }

  try {
    const JsPDF = await loadJsPdf();
    const d = receiptData(order);
    const pos = selectedMode === "pos";
    const doc = new JsPDF({
      orientation: "portrait",
      unit: "mm",
      format: pos ? [80, Math.max(170, 92 + d.items.length * 12)] : "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = pos ? 5 : 16;
    const contentWidth = pageWidth - margin * 2;
    let y = pos ? 8 : 14;

    const logo = await loadReceiptLogo();
    if (logo) {
      try {
        const logoWidth = pos ? 30 : 42;
        doc.addImage(logo, "PNG", margin, y, logoWidth, logoWidth * 0.27);
      } catch {}
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pos ? 14 : 18);
    doc.text("SNEAKVIX", pageWidth - margin, y + 4, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(pos ? 7 : 9);
    doc.setTextColor(105);
    doc.text("Premium Sneakers", pageWidth - margin, y + 8, { align: "right" });
    doc.setTextColor(24);
    y += pos ? 17 : 23;

    doc.setDrawColor(30);
    doc.line(margin, y, pageWidth - margin, y);
    y += 9;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(pos ? 13 : 18);
    doc.text("Order Receipt", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(pos ? 8 : 10);
    doc.setTextColor(100);
    doc.text("Order #" + String(order.id).padStart(6, "0"), margin, y + 5);
    doc.text(order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString(), pageWidth - margin, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text((order.status || "pending").toUpperCase(), pageWidth - margin, y + 5, { align: "right" });
    doc.setTextColor(24);
    y += pos ? 17 : 23;

    doc.setFontSize(pos ? 7 : 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(105);
    doc.text("BILL TO", margin, y);
    doc.text("DELIVERY ADDRESS", margin + contentWidth / 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24);
    const half = contentWidth / 2 - 3;
    const a = d.address;
    const bill = [a.full_name || "—", a.phone || "—"];
    const delivery = [
      a.address_line1 || "—",
      a.address_line2 || "",
      [a.city || "", a.postal_code || ""].filter(Boolean).join(" - "),
    ].filter(Boolean);
    doc.text(doc.splitTextToSize(bill.join("\n"), half), margin, y + 5);
    doc.text(doc.splitTextToSize(delivery.join("\n"), half), margin + contentWidth / 2, y + 5);
    y += pos ? 18 : 22;

    doc.setDrawColor(210);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(pos ? 7 : 8);
    doc.setTextColor(90);
    doc.text("ITEM", margin, y);
    doc.text("AMOUNT", pageWidth - margin, y, { align: "right" });
    doc.setTextColor(24);
    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(pos ? 8 : 10);
    d.items.forEach(function (item) {
      const name = item.product_name || "Product";
      const qty = Number(item.quantity || 0);
      const unit = Number(item.unit_price || 0);
      const lines = doc.splitTextToSize(name + " · Size " + (item.size || "—") + " · Qty " + qty, contentWidth - 30);
      doc.text(lines, margin, y);
      doc.text(pdfMoney(unit * qty), pageWidth - margin, y, { align: "right" });
      y += Math.max(7, lines.length * 4.5);
      doc.setDrawColor(232);
      doc.line(margin, y - 2, pageWidth - margin, y - 2);
      y += 3;
    });

    const totalStart = pageWidth - margin - (pos ? 44 : 62);
    y += 3;
    doc.setFontSize(pos ? 8 : 10);
    doc.text("Subtotal", totalStart, y);
    doc.text(pdfMoney(d.subtotal), pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.text("Delivery", totalStart, y);
    doc.text(pdfMoney(d.delivery), pageWidth - margin, y, { align: "right" });
    y += 4;
    doc.setDrawColor(30);
    doc.line(totalStart, y, pageWidth - margin, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pos ? 10 : 13);
    doc.text("Total", totalStart, y);
    doc.text(pdfMoney(d.total), pageWidth - margin, y, { align: "right" });
    y += 12;

    const paymentStatus = order.payment?.status || (order.status === "paid" ? "Verified" : "Awaiting Payment");
    const paymentReference = order.payment?.reference || "—";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pos ? 7 : 8);
    doc.setTextColor(105);
    doc.text("PAYMENT INFORMATION", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24);
    doc.setFontSize(pos ? 8 : 10);
    doc.text("Method: bKash", margin, y);
    doc.text("Status: " + paymentStatus, margin + contentWidth * 0.42, y);
    y += 6;
    doc.text("Transaction ID: " + paymentReference, margin, y);
    y += 12;

    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setFontSize(pos ? 7 : 9);
    doc.setTextColor(110);
    doc.text("Thank you for shopping with SneakVix.", pageWidth / 2, y, { align: "center" });
    y += 4;
    doc.text("For your records · Order #" + String(order.id).padStart(6, "0"), pageWidth / 2, y, { align: "center" });

    doc.save("SneakVix-Receipt-" + String(order.id).padStart(6, "0") + "-" + selectedMode + ".pdf");
  } catch (error) {
    window.alert(error.message || "Could not create the PDF receipt. Please try again.");
  } finally {
    if (button && button.tagName === "BUTTON") {
      button.disabled = false;
      button.textContent = button.dataset.originalText || "Download Receipt";
      delete button.dataset.originalText;
    }
  }
}
