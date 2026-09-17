from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extends Django's built-in auth."""
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
    ]

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
        unique_together = ("user", "product", "size")


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="orders")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_reference = models.CharField(max_length=100, unique=True, null=True, blank=True)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_submitted_at = models.DateTimeField(null=True, blank=True)
    payment_verified_at = models.DateTimeField(null=True, blank=True)
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
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    size = models.SmallIntegerField()
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "order_items"
