from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from store.models import Order, Payment, ProductSize


class Command(BaseCommand):
    help = "Cancel pending orders older than 24 hours and restore reserved inventory."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=24)
        orders = Order.objects.filter(status="pending", created_at__lt=cutoff).prefetch_related("items")
        cancelled = 0

        for order in orders:
            with transaction.atomic():
                locked = Order.objects.select_for_update().get(pk=order.pk)
                if locked.status != "pending" or locked.created_at >= cutoff:
                    continue

                for item in locked.items.all():
                    ProductSize.objects.filter(
                        product=item.product,
                        size=item.size,
                    ).update(stock=F("stock") + item.quantity)

                payment = getattr(locked, "payment", None)
                if payment and payment.status == "submitted":
                    payment.status = "rejected"
                    payment.save(update_fields=["status"])

                locked.status = "cancelled"
                locked.save(update_fields=["status", "updated_at"])
                cancelled += 1

        self.stdout.write(self.style.SUCCESS(f"Cancelled {cancelled} expired order(s)."))
