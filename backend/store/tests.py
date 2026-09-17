from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Cart, Order, OrderItem, Product, ProductSize


class SQARegressionTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.customer = User.objects.create_user(username="customer", password="StrongPass123")
        self.admin = User.objects.create_user(username="admin", password="StrongPass123", role="admin")
        self.product = Product.objects.create(
            name="Test Sneaker", brand="nike", price=Decimal("1500.00")
        )
        self.size42 = ProductSize.objects.create(product=self.product, size=42, stock=5)
        self.size43 = ProductSize.objects.create(product=self.product, size=43, stock=8)
        self.checkout_url = reverse("checkout")

    def checkout(self, user=None, extra=None):
        self.client.force_authenticate(user=user or self.customer)
        data = {
            "full_name": "Test Customer",
            "phone": "+8801712345678",
            "address_line1": "123 Test Street",
            "city": "Dhaka",
            "postal_code": "1207",
        }
        if extra:
            data.update(extra)
        return self.client.post(self.checkout_url, data, format="json")

    def test_checkout_ignores_client_total_and_uses_server_total(self):
        Cart.objects.create(user=self.customer, product=self.product, size=42, quantity=2)
        response = self.checkout(extra={"total": "1.00", "amount": "1.00"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data["total_amount"]), Decimal("3100.00"))

    def test_checkout_rejects_invalid_cart_quantity_without_partial_stock_change(self):
        Cart.objects.create(user=self.customer, product=self.product, size=42, quantity=0)
        response = self.checkout()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.size42.refresh_from_db()
        self.assertEqual(self.size42.stock, 5)
        self.assertFalse(OrderItem.objects.exists())

    def test_product_update_preserves_omitted_existing_sizes(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("product-detail", args=[self.product.id])
        response = self.client.patch(url, {"sizes": [{"size": 42, "stock": 20}]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(ProductSize.objects.filter(product=self.product, size=43, stock=8).exists())
        self.assertTrue(ProductSize.objects.filter(product=self.product, size=42, stock=20).exists())

    def test_customer_cannot_access_admin_order_endpoint(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get("/api/admin/orders/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_order_status_cannot_skip_forward_or_move_backward(self):
        Cart.objects.create(user=self.customer, product=self.product, size=42, quantity=1)
        self.checkout()
        order = self.customer.orders.first()
        self.client.force_authenticate(user=self.admin)
        url = reverse("admin-order-detail", args=[order.id])
        response = self.client.patch(url, {"status": "shipped"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        response = self.client.patch(url, {"status": "paid"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_paid_requires_payment_reference(self):
        Cart.objects.create(user=self.customer, product=self.product, size=42, quantity=1)
        self.checkout()
        order = self.customer.orders.first()
        self.client.force_authenticate(user=self.admin)
        url = reverse("admin-order-detail", args=[order.id])
        response = self.client.patch(url, {"status": "paid"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_payment_submission_rejects_wrong_amount(self):
        Cart.objects.create(user=self.customer, product=self.product, size=42, quantity=1)
        self.checkout()
        order = self.customer.orders.first()
        url = reverse("order-payment", args=[order.id])
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(url, {"payment_reference": "TXN123456", "payment_amount": "1.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_payment_reference_is_rejected(self):
        for username in ("customer2",):
            get_user_model().objects.create_user(username=username, password="StrongPass123")
        Cart.objects.create(user=self.customer, product=self.product, size=42, quantity=1)
        self.checkout()
        order1 = self.customer.orders.first()
        self.client.force_authenticate(user=self.customer)
        url1 = reverse("order-payment", args=[order1.id])
        response = self.client.post(url1, {"payment_reference": "TXN123456", "payment_amount": "1600.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        customer2 = get_user_model().objects.get(username="customer2")
        Cart.objects.create(user=customer2, product=self.product, size=43, quantity=1)
        self.checkout(user=customer2)
        order2 = customer2.orders.first()
        self.client.force_authenticate(user=customer2)
        url2 = reverse("order-payment", args=[order2.id])
        response = self.client.post(url2, {"payment_reference": "TXN123456", "payment_amount": "1600.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_cancellation_restores_reserved_stock(self):
        Cart.objects.create(user=self.customer, product=self.product, size=42, quantity=2)
        self.checkout()
        order = self.customer.orders.first()
        self.size42.refresh_from_db()
        self.assertEqual(self.size42.stock, 3)
        self.client.force_authenticate(user=self.admin)
        url = reverse("admin-order-detail", args=[order.id])
        response = self.client.patch(url, {"status": "cancelled"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.size42.refresh_from_db()
        self.assertEqual(self.size42.stock, 5)

    def test_user_with_orders_cannot_be_deleted(self):
        Cart.objects.create(user=self.customer, product=self.product, size=42, quantity=1)
        self.checkout()
        self.client.force_authenticate(user=self.admin)
        url = reverse("admin-user-detail", args=[self.customer.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
