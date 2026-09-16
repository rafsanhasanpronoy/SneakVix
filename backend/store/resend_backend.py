"""Django email backend that sends mail through the Resend HTTPS API."""

import logging
import os

import resend
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)


class EmailBackend(BaseEmailBackend):
    """Send Django EmailMessage objects through Resend instead of SMTP."""

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        api_key = os.environ.get("RESEND_API_KEY")
        if not api_key:
            logger.error("RESEND_API_KEY is not configured")
            return 0

        resend.api_key = api_key
        sent = 0

        for message in email_messages:
            if not message.recipients():
                continue

            try:
                html_body = None
                for content, mimetype in getattr(message, "alternatives", []):
                    if mimetype == "text/html":
                        html_body = content
                        break

                params = {
                    "from": message.from_email or os.environ.get(
                        "DEFAULT_FROM_EMAIL", "onboarding@resend.dev"
                    ),
                    "to": message.recipients(),
                    "subject": message.subject,
                    "html": html_body or message.body,
                    "text": message.body,
                }

                resend.Emails.send(params)
                sent += 1
            except Exception:
                logger.exception(
                    "Failed to send email through Resend to %s",
                    message.recipients(),
                )
                if not self.fail_silently:
                    raise

        return sent
