from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

router = DefaultRouter()
router.register("products", views.ProductViewSet, basename="product")
router.register("cart", views.CartViewSet, basename="cart")
router.register("admin/orders", views.AdminOrderViewSet, basename="admin-order")
router.register("admin/users", views.AdminUserViewSet, basename="admin-user")

urlpatterns = [
    path("auth/signup/", views.SignupView.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    path("checkout/", views.CheckoutView.as_view()),
    path("orders/", views.OrderListView.as_view()),
    path("image-search/", views.ImageSearchView.as_view()),
    path("", include(router.urls)),
]