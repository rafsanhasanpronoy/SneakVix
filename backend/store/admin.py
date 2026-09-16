from django.contrib import admin

from .models import Cart, Order, OrderAddress, OrderItem, Product, ProductSize, User

admin.site.register(User)
admin.site.register(Product)
admin.site.register(ProductSize)
admin.site.register(Cart)
admin.site.register(Order)
admin.site.register(OrderAddress)
admin.site.register(OrderItem)
