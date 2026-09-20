from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("paid", "Paid"),
                    ("processing", "Processing"),
                    ("shipped", "Shipped"),
                    ("delivered", "Delivered"),
                    ("cancelled", "Cancelled"),
                    ("refunded", "Refunded"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reference", models.CharField(max_length=100, unique=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("status", models.CharField(choices=[("submitted", "Submitted"), ("verified", "Verified"), ("rejected", "Rejected")], default="submitted", max_length=20)),
                ("submitted_at", models.DateTimeField(auto_now_add=True)),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("order", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="payment", to="store.order")),
            ],
            options={"db_table": "payments"},
        ),
    ]
