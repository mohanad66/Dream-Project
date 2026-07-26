from django.contrib import admin
from unfold.admin import ModelAdmin, StackedInline

from .models import *

# Register your models here.

# admin.site.register(CarouselImg)
# admin.site.register(Product)
# admin.site.register(Category)
# admin.site.register(Service)
# admin.site.register(Contact)
# admin.site.register(Tag)


@admin.register(CarouselImg)
class CarouselImgAdmin(ModelAdmin):
    pass


class ProductImageInline(StackedInline):
    model = ProductImage
    extra = 1
    can_delete = True   # ← makes the delete checkbox always visible
    min_num = 0
    show_change_link = True


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    inlines = [ProductImageInline]
    list_display = ["name", "price", "is_active", "category", "created_at"]
    list_filter = ["is_active", "category"]
    search_fields = ["name"]


@admin.register(ProductImage)
class ProductImageAdmin(ModelAdmin):
    pass


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    pass


@admin.register(Service)
class ServiceAdmin(ModelAdmin):
    pass


@admin.register(Contact)
class ContactAdmin(ModelAdmin):
    pass


@admin.register(Tag)
class ContactAdmin(ModelAdmin):
    pass


@admin.register(Payment)
class ContactAdmin(ModelAdmin):
    pass


@admin.register(Order)
class ContactAdmin(ModelAdmin):
    pass


@admin.register(OrderItem)
class ContactAdmin(ModelAdmin):
    pass


# @admin.register(Product)
# class CustomAdminClass(Product):
#     pass

# @admin.register(Category)
# class CustomAdminClass(Category):
#     pass

# @admin.register(Service)
# class CustomAdminClass(Service):
#     pass

# @admin.register(Contact)
# class CustomAdminClass(Contact):
#     pass
