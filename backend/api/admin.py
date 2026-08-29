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
    list_display = ["name", "price", "is_active", "approval_status", "category", "created_at"]
    list_filter = ["is_active", "approval_status", "category"]
    search_fields = ["name"]
    actions = ["approve_products", "reject_products"]

    @admin.action(description="Approve selected products")
    def approve_products(self, request, queryset):
        updated = queryset.update(
            approval_status=Product.ApprovalStatus.APPROVED, rejection_reason=""
        )
        self.message_user(request, f"{updated} product(s) approved.")

    @admin.action(description="Reject selected products")
    def reject_products(self, request, queryset):
        updated = queryset.update(
            approval_status=Product.ApprovalStatus.REJECTED,
            rejection_reason="Rejected by admin.",
        )
        self.message_user(request, f"{updated} product(s) rejected.")
@admin.register(SellerProfile)
class SellerProfileAdmin(ModelAdmin):
    list_display = ["business_name", "user", "verification_status", "is_active", "created_at"]
    list_filter = ["verification_status", "is_active"]
    search_fields = ["business_name", "contact_email"]
    actions = ["approve_sellers", "reject_sellers"]

    @admin.action(description="Approve selected sellers")
    def approve_sellers(self, request, queryset):
        updated = queryset.update(
            verification_status=SellerProfile.VerificationStatus.APPROVED,
            rejection_reason="",
        )
        self.message_user(request, f"{updated} seller(s) approved.")

    @admin.action(description="Reject selected sellers")
    def reject_sellers(self, request, queryset):
        updated = queryset.update(
            verification_status=SellerProfile.VerificationStatus.REJECTED,
            rejection_reason="Rejected by admin.",
        )
        self.message_user(request, f"{updated} seller(s) rejected.")
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
    list_display = ["name", "contact_type", "value", "display_order", "is_active"]
    list_filter = ["contact_type", "is_active"]
    list_editable = ["display_order", "is_active"]
    search_fields = ["name", "value"]


@admin.register(Tag)
class TagAdmin(ModelAdmin):
    pass


@admin.register(Payment)
class PaymentAdmin(ModelAdmin):
    pass


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    pass


@admin.register(OrderItem)
class OrderItemAdmin(ModelAdmin):
    pass


@admin.register(Coupon)
class CouponAdmin(ModelAdmin):
    list_display = ["code", "discount_type", "discount_value", "times_used", "is_active", "expires_at"]
    list_filter = ["is_active", "discount_type"]
    search_fields = ["code"]
    list_editable = ["is_active"]
    readonly_fields = ["times_used"]


@admin.register(SellerOffer)
class SellerOfferAdmin(ModelAdmin):
    list_display = ["title", "seller", "offer_type", "discount_percent", "is_active", "expires_at"]
    list_filter = ["is_active", "offer_type"]
    search_fields = ["title"]
    list_editable = ["is_active"]


@admin.register(SellerPayoutRecord)
class SellerPayoutAdmin(ModelAdmin):
    list_display = ["seller", "order", "gross_amount", "commission_amount", "net_amount", "status"]
    list_filter = ["status", "delivery_type"]
    search_fields = ["seller__business_name"]
    readonly_fields = ["gross_amount", "commission_amount", "net_amount"]


@admin.register(WishlistItem)
class WishlistItemAdmin(ModelAdmin):
    list_display = ["user", "product", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__username", "product__name"]


@admin.register(Review)
class ReviewAdmin(ModelAdmin):
    list_display = ["user", "product", "rating", "is_active", "created_at"]
    list_filter = ["is_active", "rating"]
    search_fields = ["user__username", "product__name", "title"]
    list_editable = ["is_active"]


@admin.register(SellerEarning)
class SellerEarningAdmin(ModelAdmin):
    list_display = ["seller", "order", "amount", "platform_fee", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["seller__business_name"]
    readonly_fields = ["amount", "platform_fee"]


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ["user", "notification_type", "title", "is_read", "created_at"]
    list_filter = ["is_read", "notification_type"]
    search_fields = ["user__username", "title"]
    list_editable = ["is_read"]


@admin.register(ProductLike)
class ProductLikeAdmin(ModelAdmin):
    list_display = ["user", "product", "created_at"]
    search_fields = ["user__username", "product__name"]


@admin.register(ProductComment)
class ProductCommentAdmin(ModelAdmin):
    list_display = ["user", "product", "created_at"]
    search_fields = ["user__username", "product__name", "content"]


@admin.register(SellerFollower)
class SellerFollowerAdmin(ModelAdmin):
    list_display = ["user", "seller", "created_at"]
    search_fields = ["user__username", "seller__business_name"]
