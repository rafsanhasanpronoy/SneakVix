from django.contrib.auth import get_user_model
from django.db.models import Sum
from rest_framework import serializers

from .models import Cart, Order, OrderAddress, OrderItem, Product, ProductSize

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "date_joined"]


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )


class ProductSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSize
        fields = ["size", "stock"]


class ProductListSerializer(serializers.ModelSerializer):
    """Lighter payload for the /products grid — now also carries a computed
    total_stock so the admin products list (and any other list view) can
    show stock without needing the full sizes breakdown."""

    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "brand", "price", "image_main", "total_stock"]

    def get_total_stock(self, obj):
        return obj.sizes.aggregate(total=Sum("stock"))["total"] or 0


class ProductDetailSerializer(serializers.ModelSerializer):
    sizes = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "brand", "price", "description",
            "image_main", "image2", "image3", "sizes",
        ]

    def get_sizes(self, obj):
        # ALL sizes, including sold-out ones — the frontend shows out-of-
        # stock sizes as disabled rather than omitting them (a missing size
        # reads as "never existed", not "sold out").
        all_sizes = obj.sizes.order_by("size")
        return ProductSizeSerializer(all_sizes, many=True).data


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_price = serializers.DecimalField(source="product.price", max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.CharField(source="product.image_main", read_only=True)
    stock = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id", "product", "product_name", "product_price", "product_image",
            "size", "quantity", "stock", "added_at",
        ]

    def get_stock(self, obj):
        ps = obj.product.sizes.filter(size=obj.size).first()
        return ps.stock if ps else 0


class OrderAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderAddress
        fields = ["full_name", "phone", "address_line1", "address_line2", "city", "postal_code"]


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.CharField(source="product.image_main", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "product_image", "size", "quantity", "unit_price"]


class OrderSerializer(serializers.ModelSerializer):
    address = OrderAddressSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "total_amount", "status", "created_at", "updated_at", "address", "items"]


class CheckoutSerializer(serializers.Serializer):
    """Validates the shipping form + creates the order from the user's cart
    in one atomic step. See views.CheckoutView."""

    full_name = serializers.CharField(min_length=3, max_length=255)
    phone = serializers.RegexField(r"^[\+0-9\s\-]{10,15}$")
    address_line1 = serializers.CharField(min_length=5, max_length=255)
    address_line2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)