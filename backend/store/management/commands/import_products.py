"""
Stub for importing legacy product data.
Usage: python manage.py import_products path/to/products.csv path/to/product_sizes.csv
Fill in the column mapping to match your exported CSV headers.
"""
import csv
from django.core.management.base import BaseCommand
from store.models import Product, ProductSize


class Command(BaseCommand):
    help = "Import legacy products + sizes from CSV exports"

    def add_arguments(self, parser):
        parser.add_argument("products_csv")
        parser.add_argument("sizes_csv")

    def handle(self, *args, **options):
        with open(options["products_csv"], newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                Product.objects.update_or_create(
                    id=row["id"],
                    defaults={
                        "name": row["name"],
                        "brand": row["brand"],
                        "price": row["price"],
                        "description": row.get("description", ""),
                        "image_main": row.get("image_main"),
                        "image2": row.get("image2"),
                        "image3": row.get("image3"),
                    },
                )
        with open(options["sizes_csv"], newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                ProductSize.objects.update_or_create(
                    product_id=row["product_id"],
                    size=row["size"],
                    defaults={"stock": row["stock"]},
                )
        self.stdout.write(self.style.SUCCESS("Import complete."))
