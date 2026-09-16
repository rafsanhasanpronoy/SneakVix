"""Order emails — confirmation on checkout, status updates from the admin
panel. Ported from the old mailer.php (PHPMailer) to Django's built-in
email backend, same bKash-payment-confirmation flow: every order needs a
manual ৳100 bKash "Send Money" payment, using the order ID as reference,
before it gets marked paid.

Uses django.conf.settings.EMAIL_* (already configured in settings.py) and
BKASH_NUMBER (add this — see the setup note at the bottom of this file).
Sending is best-effort: a failed email never blocks placing an order or
updating its status, it just gets logged.
"""
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

SITE_NAME = getattr(settings, "SITE_NAME", "SneakVix")
SUPPORT_EMAIL = getattr(settings, "SUPPORT_EMAIL", "support@sneakvix.com")
BKASH_NUMBER = getattr(settings, "BKASH_NUMBER", "01XXXXXXXXX")
BKASH_CONFIRM_AMOUNT = 100  # matches DELIVERY_CHARGE convention elsewhere — flat ৳100 to confirm


def _padded_id(order_id):
    return str(order_id).zfill(6)


def _items_rows_html(items):
    rows = ""
    for item in items:
        line_total = float(item.unit_price) * item.quantity
        rows += f"""
        <tr>
            <td style="padding:12px 10px;border-bottom:1px solid #f0f0f0;font-size:0.92rem;">{item.product.name}</td>
            <td style="padding:12px 10px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:0.92rem;color:#666;">EU {item.size}</td>
            <td style="padding:12px 10px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:0.92rem;">{item.quantity}</td>
            <td style="padding:12px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#c9a24d;">\u09F3 {line_total:,.2f}</td>
        </tr>"""
    return rows


def _email_shell(inner_html):
    """Shared wrapper: dark header matching the SneakVix site theme, footer."""
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,sans-serif;">
    <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="background:#0a0a0a;padding:28px 36px;">
            <h1 style="color:#f3efe6;margin:0;font-size:1.5rem;letter-spacing:-0.5px;font-style:italic;">{SITE_NAME}</h1>
            <p style="color:#c9a24d;margin:5px 0 0;font-size:0.85rem;">Order Update</p>
        </div>
        {inner_html}
        <div style="background:#f9f9f9;padding:18px 36px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0 0 6px;color:#aaa;font-size:0.8rem;">Questions? <a href="mailto:{SUPPORT_EMAIL}" style="color:#c9a24d;text-decoration:none;">{SUPPORT_EMAIL}</a></p>
            <p style="margin:0;color:#ccc;font-size:0.75rem;">&copy; {SITE_NAME}</p>
        </div>
    </div>
    </body>
    </html>"""


def send_order_confirmation_email(order):
    """Sent immediately after an order is placed — includes the bKash
    payment instructions needed to confirm it. Returns True/False for
    whether it actually sent (never raises)."""
    try:
        to_email = order.user.email
        to_name = order.user.username
        if not to_email:
            return False

        padded_id = _padded_id(order.id)
        items = list(order.items.select_related("product").all())
        subtotal = sum(float(i.unit_price) * i.quantity for i in items)
        delivery = float(order.total_amount) - subtotal

        inner = f"""
        <div style="padding:32px 36px 0;">
            <h2 style="margin:0 0 8px;font-size:1.35rem;color:#1a1a1a;">Thanks, {to_name}!</h2>
            <p style="color:#666;margin:0 0 24px;font-size:0.95rem;line-height:1.6;">
                Your order has been received. Please complete the bKash payment below to confirm your order.
            </p>
            <div style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0;font-size:0.75rem;color:#999;text-transform:uppercase;letter-spacing:0.6px;">Your Order ID</p>
                <p style="margin:5px 0 0;font-size:2rem;font-weight:800;letter-spacing:-1px;color:#1a1a1a;">#{padded_id}</p>
                <p style="margin:4px 0 0;font-size:0.8rem;color:#999;">Keep this ID \u2014 you'll need it for bKash payment</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
                <thead>
                    <tr style="background:#f9f9f9;">
                        <th style="padding:10px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#999;">Item</th>
                        <th style="padding:10px;text-align:center;font-size:0.75rem;text-transform:uppercase;color:#999;">Size</th>
                        <th style="padding:10px;text-align:center;font-size:0.75rem;text-transform:uppercase;color:#999;">Qty</th>
                        <th style="padding:10px;text-align:right;font-size:0.75rem;text-transform:uppercase;color:#999;">Price</th>
                    </tr>
                </thead>
                <tbody>{_items_rows_html(items)}</tbody>
            </table>
            <div style="border-top:2px solid #f0f0f0;padding:16px 0 24px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="color:#666;font-size:0.92rem;">Subtotal</span>
                    <span style="font-size:0.92rem;">\u09F3 {subtotal:,.2f}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
                    <span style="color:#666;font-size:0.92rem;">Delivery Charge</span>
                    <span style="font-size:0.92rem;">\u09F3 {delivery:,.2f}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span style="font-size:1.1rem;font-weight:700;">Total</span>
                    <span style="font-size:1.2rem;font-weight:800;color:#c9a24d;">\u09F3 {float(order.total_amount):,.2f}</span>
                </div>
            </div>
        </div>
        <div style="margin:0 36px 32px;background:#fdf8ee;border:2px solid #c9a24d;border-radius:12px;overflow:hidden;">
            <div style="background:#c9a24d;padding:14px 20px;">
                <h3 style="margin:0;color:#14110a;font-size:1rem;">Pay via bKash to Confirm Your Order</h3>
            </div>
            <div style="padding:20px;">
                <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:18px;">
                    <tr>
                        <td style="padding:12px 16px;border-bottom:1px solid #f0e9d6;color:#888;font-size:0.85rem;">bKash Number</td>
                        <td style="padding:12px 16px;border-bottom:1px solid #f0e9d6;font-weight:700;font-size:1.1rem;color:#a67f2e;text-align:right;">{BKASH_NUMBER}</td>
                    </tr>
                    <tr>
                        <td style="padding:12px 16px;border-bottom:1px solid #f0e9d6;color:#888;font-size:0.85rem;">Amount</td>
                        <td style="padding:12px 16px;border-bottom:1px solid #f0e9d6;font-weight:700;font-size:1.1rem;text-align:right;">\u09F3 {BKASH_CONFIRM_AMOUNT}</td>
                    </tr>
                    <tr style="background:#fdf8ee;">
                        <td style="padding:12px 16px;color:#888;font-size:0.85rem;">Reference (IMPORTANT)</td>
                        <td style="padding:12px 16px;font-weight:800;font-size:1.2rem;color:#1a1a1a;text-align:right;">#{padded_id}</td>
                    </tr>
                    <tr>
                        <td style="padding:12px 16px;color:#888;font-size:0.85rem;">Payment Type</td>
                        <td style="padding:12px 16px;font-weight:600;text-align:right;">Send Money</td>
                    </tr>
                </table>
                <p style="margin:0 0 10px;font-weight:700;font-size:0.88rem;color:#555;text-transform:uppercase;">How to pay:</p>
                <ol style="margin:0;padding-left:1.4rem;color:#555;font-size:0.9rem;line-height:2;">
                    <li>Open bKash app &rarr; tap <strong>Send Money</strong></li>
                    <li>Number: <strong style="color:#a67f2e;">{BKASH_NUMBER}</strong></li>
                    <li>Amount: <strong>{BKASH_CONFIRM_AMOUNT} Taka</strong></li>
                    <li>Reference field: type <strong>#{padded_id}</strong></li>
                    <li>Complete the payment</li>
                </ol>
                <div style="margin-top:16px;padding:12px;background:#fff3cd;border-radius:8px;font-size:0.85rem;color:#856404;">
                    Important: your order will only be processed after we verify the bKash payment with reference #{padded_id}.
                </div>
            </div>
        </div>"""

        subject = f"Order #{padded_id} Confirmed \u2013 {SITE_NAME}"
        text_body = (
            f"Order #{padded_id} confirmed!\n"
            f"Send \u09F3{BKASH_CONFIRM_AMOUNT} to bKash: {BKASH_NUMBER}\n"
            f"Reference: #{padded_id}\nType: Send Money"
        )
        _send(to_email, to_name, subject, text_body, _email_shell(inner))
        return True
    except Exception:
        logger.exception("Failed to send order confirmation email for order %s", getattr(order, "id", "?"))
        return False


STATUS_CONFIG = {
    "paid": {
        "color": "#16a34a", "bg": "#f0fdf4", "border": "#86efac",
        "headline": "Payment Confirmed!",
        "message": "We've received and verified your bKash payment. Your order is now confirmed and will be processed shortly.",
    },
    "processing": {
        "color": "#2563eb", "bg": "#eff6ff", "border": "#93c5fd",
        "headline": "Order Being Processed",
        "message": "Great news \u2014 your order is currently being prepared and packed by our team.",
    },
    "shipped": {
        "color": "#7c3aed", "bg": "#faf5ff", "border": "#c4b5fd",
        "headline": "Your Order is On the Way!",
        "message": "Your order has been handed off to our delivery partner and is on its way to you.",
    },
    "delivered": {
        "color": "#059669", "bg": "#ecfdf5", "border": "#6ee7b7",
        "headline": "Order Delivered!",
        "message": "Your order has been delivered. We hope you love your new sneakers!",
    },
    "cancelled": {
        "color": "#dc2626", "bg": "#fef2f2", "border": "#fca5a5",
        "headline": "Order Cancelled",
        "message": "Your order has been cancelled. If you paid via bKash, contact us to arrange a refund.",
    },
}


def send_order_status_email(order, new_status):
    """Sent when an admin changes an order's status. Skipped for statuses
    with no configured template (e.g. 'pending', which is the default state
    every order already starts in — no update to announce there)."""
    cfg = STATUS_CONFIG.get(new_status)
    if not cfg:
        return False
    try:
        to_email = order.user.email
        to_name = order.user.username
        if not to_email:
            return False

        padded_id = _padded_id(order.id)
        items = list(order.items.select_related("product").all())
        status_label = new_status.capitalize()

        extra_note = ""
        if new_status == "shipped":
            extra_note = """
            <div style="background:#faf5ff;border:1px solid #c4b5fd;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
                <p style="margin:0;font-size:0.9rem;color:#6d28d9;">
                    Delivery in progress. Your order should arrive within 1\u20133 business days.
                </p>
            </div>"""
        elif new_status == "cancelled":
            extra_note = f"""
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
                <p style="margin:0;font-size:0.9rem;color:#dc2626;">
                    If you made a bKash payment, please contact us at
                    <a href="mailto:{SUPPORT_EMAIL}" style="color:#dc2626;">{SUPPORT_EMAIL}</a> to arrange a refund.
                </p>
            </div>"""

        inner = f"""
        <div style="background:{cfg['bg']};border-bottom:3px solid {cfg['border']};padding:24px 36px;">
            <h2 style="margin:0 0 8px;font-size:1.4rem;color:{cfg['color']};">{cfg['headline']}</h2>
            <p style="margin:0;color:#555;font-size:0.95rem;line-height:1.6;">{cfg['message']}</p>
        </div>
        <div style="padding:28px 36px;">
            <div style="display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap;">
                <div style="flex:1;min-width:140px;background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px;padding:14px 18px;">
                    <p style="margin:0;font-size:0.72rem;color:#999;text-transform:uppercase;">Order ID</p>
                    <p style="margin:5px 0 0;font-size:1.5rem;font-weight:800;color:#1a1a1a;">#{padded_id}</p>
                </div>
                <div style="flex:1;min-width:140px;background:{cfg['bg']};border:1px solid {cfg['border']};border-radius:10px;padding:14px 18px;">
                    <p style="margin:0;font-size:0.72rem;color:#999;text-transform:uppercase;">Status</p>
                    <p style="margin:5px 0 0;font-size:1.5rem;font-weight:800;color:{cfg['color']};">{status_label}</p>
                </div>
            </div>
            <p style="margin:0 0 10px;font-size:0.78rem;font-weight:700;text-transform:uppercase;color:#999;">Your Items</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
                <thead>
                    <tr style="background:#f9f9f9;">
                        <th style="padding:9px 10px;text-align:left;font-size:0.73rem;text-transform:uppercase;color:#bbb;">Item</th>
                        <th style="padding:9px 10px;text-align:center;font-size:0.73rem;text-transform:uppercase;color:#bbb;">Size</th>
                        <th style="padding:9px 10px;text-align:center;font-size:0.73rem;text-transform:uppercase;color:#bbb;">Qty</th>
                        <th style="padding:9px 10px;text-align:right;font-size:0.73rem;text-transform:uppercase;color:#bbb;">Price</th>
                    </tr>
                </thead>
                <tbody>{_items_rows_html(items)}</tbody>
                <tfoot>
                    <tr style="background:#f9f9f9;">
                        <td colspan="3" style="padding:12px 10px;text-align:right;font-size:0.8rem;color:#aaa;font-weight:600;text-transform:uppercase;">Total</td>
                        <td style="padding:12px 10px;text-align:right;font-weight:800;font-size:1rem;color:#c9a24d;">\u09F3 {float(order.total_amount):,.2f}</td>
                    </tr>
                </tfoot>
            </table>
            {extra_note}
            <p style="color:#bbb;font-size:0.82rem;text-align:center;margin:8px 0 0;">
                Questions? <a href="mailto:{SUPPORT_EMAIL}" style="color:#c9a24d;text-decoration:none;">{SUPPORT_EMAIL}</a>
            </p>
        </div>"""

        subject = f"Order #{padded_id} \u2013 {status_label} | {SITE_NAME}"
        text_body = f"Order #{padded_id} status updated to: {status_label}."
        _send(to_email, to_name, subject, text_body, _email_shell(inner))
        return True
    except Exception:
        logger.exception("Failed to send status email for order %s", getattr(order, "id", "?"))
        return False


def _send(to_email, to_name, subject, text_body, html_body):
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None) or settings.EMAIL_HOST_USER or "no-reply@sneakvix.com",
        to=[to_email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)