from django.contrib import admin
from .models import *
from unfold.admin import ModelAdmin

# Register your models here.

@admin.register(OTP)
class CarouselImgAdmin(ModelAdmin):
    pass