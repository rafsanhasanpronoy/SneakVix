import logging

import django_filters
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Cart, Order, OrderAddress, OrderItem, Product, ProductSize
from .emails import BKASH_NUMBER, send_order_confirmation_email, send_order_status_email
from .serializers import (
    CartItemSerializer, CheckoutSerializer, OrderSerializer,
    ProductDetailSerializer, ProductListSerializer, SignupSerializer, UserSerializer,
)

DELIVERY_CHARGE = 100
logger = logging.getLogger(__name__)


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


def validate_size_rows(rows):
    if not isinstance(rows, list) or not rows:
        raise ValidationError({"sizes": "At least one size is required."})

    seen = set()
    cleaned = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValidationError({"sizes": f"Size row {index + 1} is invalid."})
        try:
            size = int(row.get("size"))
            stock = int(row.get("stock"))
        except (TypeError, ValueError):
            raise ValidationError({"sizes": f"Size row {index + 1} must contain numeric size and stock."})
        if not 35 <= size <= 50:
            raise ValidationError({"sizes": f"EU size must be between 35 and 50 (row {index + 1})."})
        if stock < 0:
            raise ValidationError({"sizes": f"Stock cannot be negative (row {index + 1})."})
        if size in seen:
            raise ValidationError({"sizes": f"Duplicate EU size {size} is not allowed."})
        seen.add(size)
        cleaned.append({"size": size, "stock": stock})
    return cleaned


# ---------- Auth ----------

class SignupView(generics.CreateAPIView):
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({"user": UserSerializer(user).data, "access": str(refresh.access_token), "refresh": str(refresh)}, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ProductFilter(django_filters.FilterSet):
    brand = django_filters.CharFilter(method="filter_brand")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")

    class Meta:
        model = Product
        fields = ["brand", "min_price", "max_price"]

    def filter_brand(self, queryset, name, value):
        brands = [b.strip() for b in value.split(",") if b.strip()]
        return queryset.filter(brand__in=brands) if brands else queryset


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-created_at")
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["price", "created_at", "name"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        return ProductListSerializer if self.action == "list" else ProductDetailSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [IsAdmin()]

    @transaction.atomic
    def perform_create(self, serializer):
        sizes = validate_size_rows(self.request.data.get("sizes"))
        product = serializer.save()
        ProductSize.objects.bulk_create([ProductSize(product=product, **row) for row in sizes])

    @transaction.atomic
    def perform_update(self, serializer):
        sizes = self.request.data.get("sizes")
        product = serializer.save()
        if sizes is not None:
            sizes = validate_size_rows(sizes)
            product.sizes.all().delete()
            ProductSize.objects.bulk_create([ProductSize(product=product, **row) for row in sizes])

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        if OrderItem.objects.filter(product=product).exists():
            return Response(
                {"error": "This product cannot be deleted because it is referenced by an existing order."},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


# ---------- Cart ----------

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).select_related("product")

    def create(self, request, *args, **kwargs):
        product_id = request.data.get("product_id")
        try:
            size = int(request.data.get("size", 0))
        except (TypeError, ValueError):
            return Response({"error": "Invalid size."}, status=400)
        product = get_object_or_404(Product, id=product_id)
        ps = ProductSize.objects.filter(product=product, size=size).first()
        if not ps or ps.stock < 1:
            return Response({"error": "Product is out of stock."}, status=400)

        item, created = Cart.objects.get_or_create(user=request.user, product=product, size=size, defaults={"quantity": 1})
        if not created:
            if item.quantity >= ps.stock:
                return Response({"error": f"Only {ps.stock} items are available."}, status=400)
            item.quantity += 1
            item.save(update_fields=["quantity"])
        return Response(CartItemSerializer(item).data, status=201)


# ---------- Checkout ----------

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            items = list(Cart.objects.filter(user=request.user).select_related("product"))
            if not items:
                return Response({"error": "Your cart is empty"}, status=400)

            subtotal = sum(i.product.price * i.quantity for i in items)
            total = subtotal + DELIVERY_CHARGE
            order = Order.objects.create(user=request.user, total_amount=total, status="pending")
            OrderAddress.objects.create(order=order, **data)

            for i in items:
                updated = ProductSize.objects.filter(
                    product=i.product,
                    size=i.size,
                    stock__gte=i.quantity,
                ).update(stock=F("stock") - i.quantity)
                if updated != 1:
                    raise ValidationError({"stock": f"Insufficient stock for {i.product.name}, size {i.size}."})

                OrderItem.objects.create(
                    order=order, product=i.product, size=i.size,
                    quantity=i.quantity, unit_price=i.product.price,
                )

            Cart.objects.filter(user=request.user).delete()

        email_sent = False
        try:
            email_sent = send_order_confirmation_email(order)
        except Exception:
            logger.exception("Order confirmation email failed for order %s", order.id)

        response_data = OrderSerializer(order).data
        response_data["email_sent"] = email_sent
        response_data["bkash_number"] = BKASH_NUMBER
        return Response(response_data, status=201)


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by("-created_at")


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by("-created_at")
    serializer_class = OrderSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "patch"]
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["address__full_name", "address__phone", "address__city"]
    ordering_fields = ["created_at", "total_amount"]
    ordering = ["-created_at"]

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        new_status = request.data.get("status")
        valid = dict(Order.STATUS_CHOICES)
        if new_status not in valid:
            return Response({"error": "This order cannot be moved to that status."}, status=400)
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        try:
            send_order_status_email(order, new_status)
        except Exception:
            logger.exception("Order status email failed for order %s", order.id)
        return Response(OrderSerializer(order).data)


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "patch", "delete"]

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        new_role = request.data.get("role")
        if new_role is not None:
            valid_roles = dict(get_user_model().ROLE_CHOICES)
            if new_role not in valid_roles:
                return Response({"error": "Invalid role"}, status=400)
            user.role = new_role
            user.save(update_fields=["role"])
        return Response(UserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"error": "You can't delete your own account."}, status=400)
        return super().destroy(request, *args, **kwargs)


class ImageSearchView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser]

    def post(self, request):
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image received."}, status=400)
        if image.size > 10 * 1024 * 1024:
            return Response({"error": "File too large. Maximum size is 10MB."}, status=400)

        try:
            resp = requests.post(
                settings.IMAGE_SEARCH_FLASK_URL,
                files={"image": (image.name, image.read(), image.content_type)},
                timeout=30,
            )
            resp.raise_for_status()
            matches = resp.json()
            if not isinstance(matches, dict) or not isinstance(matches.get("results", []), list):
                raise ValueError("Invalid image-search response format")
            product_ids = []
            for match in matches["results"]:
                if isinstance(match, dict) and match.get("product_id") is not None:
                    try:
                        product_ids.append(int(match["product_id"]))
                    except (TypeError, ValueError):
                        continue
        except (requests.RequestException, ValueError) as exc:
            logger.exception("Image search failed")
            return Response({"error": f"Image search service unavailable: {exc}"}, status=502)

        products = Product.objects.filter(id__in=product_ids)
        return Response(ProductListSerializer(products, many=True).data)
