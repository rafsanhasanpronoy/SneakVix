from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q


class User(AbstractUser):
    """Extends Django's built-in auth so you get password hashing,
    sessions, and admin login for free instead of hand-rolling it like
    the old password_hash column did."""
    ROLE_CHOICES = [("customer", "Customer"), ("admin", "Admin")]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="customer")

    class Meta:
        db_table = "users"


class Product(models.Model):
    BRAND_CHOICES = [
        ("nike", "Nike"),
        ("adidas", "Adidas"),
        ("puma", "Puma"),
        ("new_balance", "New Balance"),
        ("other", "Other"),
    ]  # mirrors the old USER-DEFINED enum type — adjust values to match your real enum

    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=50, choices=BRAND_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    image_main = models.CharField(max_length=500, blank=True, null=True)
    image2 = models.CharField(max_length=500, blank=True, null=True)
    image3 = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"

    def __str__(self):
        return self.name


class ProductSize(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="sizes")
    size = models.SmallIntegerField()
    stock = models.IntegerField(default=0)

    class Meta:
        db_table = "product_sizes"
        unique_together = ("product", "size")


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cart_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    size = models.SmallIntegerField()
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cart"
        unique_together = ("user", "product", "size")  # mirrors the old ON DUPLICATE KEY behavior


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"


class OrderAddress(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="address")
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order_addresses"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    size = models.SmallIntegerField()
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "order_items"


class Payment(models.Model):
    STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    reference = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="submitted")
    submitted_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "payments"
