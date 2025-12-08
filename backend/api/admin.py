from django.contrib import admin
from .models import *
from unfold.admin import ModelAdmin

# Register your models here.

# admin.site.register(CarouselImg)
# admin.site.register(Product)
# admin.site.register(Category)
# admin.site.register(Service)
# admin.site.register(Contact)

@admin.register(CarouselImg)
class CarouselImgAdmin(ModelAdmin):
    pass

@admin.register(Product)
class ProductAdmin(ModelAdmin):
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
