from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import *
from .payment_gateways import *

# +++++++++++++++++++++++++++++++++++++++++

urlpatterns = [
    # Public endpoints
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/", get_product, name="get_products"),
    path("categories/", get_category, name="get_category"),
    path("carousels/", get_carouselImg, name="get_carouselImg"),
    path("services/", get_services, name="get_services"),
    path("contact/", get_contact, name="get_contact"),
    path("tags/", get_tags, name="get_tags"),
    path(
        "admins/products/",
        ProductAdminViewSet.as_view({"get": "list", "post": "create"}),
        name="admin-product-list",
    ),
    path(
        "admins/products/<int:pk>/",
        ProductAdminViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="admin-product-detail",
    ),
    path(
        "admins/products/<int:pk>/gallery/<int:img_id>/",
        ProductGalleryImageDeleteView.as_view(),
        name="admin-product-gallery-image-delete",
    ),
    # Categories
    path(
        "admins/categories/",
        CategoryAdminViewSet.as_view({"get": "list", "post": "create"}),
        name="admin-category-list",
    ),
    path(
        "admins/categories/<int:pk>/",
        CategoryAdminViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="admin-category-detail",
    ),
    # Carousel
    path(
        "admins/carousels/",
        CarouselAdminViewSet.as_view({"get": "list", "post": "create"}),
        name="admin-carousel-list",
    ),
    path(
        "admins/carousels/<int:pk>/",
        CarouselAdminViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="admin-service-detail",
    ),
    # Services
    path(
        "admins/services/",
        ServiceAdminViewSet.as_view({"get": "list", "post": "create"}),
        name="admin-service-list",
    ),
    path(
        "admins/services/<int:pk>/",
        ServiceAdminViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="admin-service-detail",
    ),
    # Contacts
    path(
        "admins/contacts/",
        ContactAdminViewSet.as_view({"get": "list", "post": "create"}),
        name="admin-contact-list",
    ),
    path(
        "admins/contacts/<int:pk>/",
        ContactAdminViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="admin-contact-detail",
    ),
    # Tags
    path(
        "admins/tags/",
        TagsAdminViewSet.as_view({"get": "list", "post": "create"}),
        name="admin-tag-list",
    ),
    path(
        "admins/tags/<int:pk>/",
        TagsAdminViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="admin-tag-detail",
    ),
    # Order
    path(
        "admins/orders/",
        OrderAdminViewSet.as_view({"get": "list"}),
        name="admin-order-list",
    ),
    path(
        "admins/orders/<int:pk>/",
        OrderAdminViewSet.as_view({"get": "retrieve", "patch": "partial_update"}),
        name="admin-order-detail",
    ),
    # Sellers (admin moderation)
    path(
        "admins/sellers/",
        AdminSellerViewSet.as_view({"get": "list"}),
        name="admin-seller-list",
    ),
    path(
        "admins/sellers/<int:pk>/",
        AdminSellerViewSet.as_view({"get": "retrieve", "patch": "partial_update"}),
        name="admin-seller-detail",
    ),
    # Authentication endpoints
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # User endpoints
    path("user/register/", CreateUserView.as_view(), name="register"),
    path("user/myuser/", CurrentUserView.as_view(), name="get_user"),
    path("user/all/", get_all_users, name="get_all_users"),
    path("user/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("auth/password/change/", PasswordChangeView.as_view(), name="password-change"),
    path(
        "payments/create-intent/",
        CreatePaymentIntentView.as_view(),
        name="CreatePaymentIntentView",
    ),
    path("orders/create/", CreateOrderView.as_view(), name="create-order"),
    path("orders/mine/", MyOrdersView.as_view(), name="my-orders"),
    path("orders/<int:pk>/", MyOrderDetailView.as_view(), name="order-detail"),
    path("webhooks/stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
    # Analytics endpoints
    path(
        "analytics/new-users/",
        NewUsersAnalyticsView.as_view(),
        name="analytics-new-users",
    ),
    path(
        "analytics/top-products/",
        TopProductsAnalyticsView.as_view(),
        name="analytics-top-products",
    ),
    path(
        "analytics/purchases/",
        PurchasesAnalyticsView.as_view(),
        name="analytics-purchases",
    ),
    # ++++++++++++++++++++++++++++++++++++
    
    
    path("sellers/register/", SellerRegisterView.as_view(), name="seller-register"),
    path("sellers/upgrade/", SellerUpgradeView.as_view(), name="seller-upgrade"),
    path("sellers/me/", SellerMeView.as_view(), name="seller-me"),
 
    # --- Sellers: own product CRUD ---
    path(
        "sellers/products/",
        SellerProductViewSet.as_view({"get": "list", "post": "create"}),
        name="seller-product-list",
    ),
    path(
        "sellers/products/<int:pk>/",
        SellerProductViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="seller-product-detail",
    ),

    # --- Sellers: own advertisement videos ---
    path(
        "sellers/ads/",
        SellerAdVideoViewSet.as_view({"get": "list", "post": "create"}),
        name="seller-ad-list",
    ),
    path(
        "sellers/ads/<int:pk>/",
        SellerAdVideoViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="seller-ad-detail",
    ),
 
    # --- Sellers: Stripe Connect ---
    path("sellers/stripe/onboard/", SellerStripeOnboardView.as_view(), name="seller-stripe-onboard"),
    path("sellers/stripe/return/", SellerStripeReturnView.as_view(), name="seller-stripe-return"),
 
    # --- Admin: product moderation queue ---
    path(
        "admins/products/pending/",
        PendingProductsAdminView.as_view(),
        name="admin-products-pending",
    ),
    path(
        "admins/products/<int:pk>/review/",
        ProductApprovalView.as_view(),
        name="admin-product-review",
    ),

    # --- Coupons ---
    path("coupons/validate/", CouponValidateView.as_view(), name="coupon-validate"),
    path("coupons/apply/", CouponApplyView.as_view(), name="coupon-apply"),

    # --- Seller public profile ---
    path("sellers/search/", SellerSearchView.as_view(), name="seller-search"),
    path("sellers/<int:pk>/profile/", SellerPublicProfileView.as_view(), name="seller-public-profile"),

    # --- Seller offers ---
    path("sellers/offers/", SellerOfferListCreateView.as_view(), name="seller-offers-list"),
    path("sellers/offers/<int:pk>/", SellerOfferDetailView.as_view(), name="seller-offer-detail"),

    # --- Seller delivery type ---
    path("sellers/me/delivery-type/", SellerDeliveryUpdateView.as_view(), name="seller-delivery-update"),

    # --- Admin coupons ---
    path(
        "admins/coupons/",
        AdminCouponViewSet.as_view({"get": "list", "post": "create"}),
        name="admin-coupon-list",
    ),
    path(
        "admins/coupons/<int:pk>/",
        AdminCouponViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="admin-coupon-detail",
    ),

    # --- Admin commission / earnings ---
    path("admins/commission/", PlatformSettingsView.as_view(), name="admin-commission"),
    path("admins/sellers/earnings/", AdminSellerEarningsView.as_view(), name="admin-seller-earnings"),

    # --- Paymob ---
    path("payments/paymob/checkout/", PaymobCheckoutView.as_view(), name="paymob-checkout"),
    path("payments/paymob/init/", PaymobInitView.as_view(), name="paymob-init"),
    path("payments/paymob/pay/", PaymobPayView.as_view(), name="paymob-pay"),
    path("payments/paymob/wallet/", PaymobWalletPayView.as_view(), name="paymob-wallet"),
    path("payments/paymob/webhook/", paymob_webhook, name="paymob-webhook"),
    path("payments/paymob/callback/", PaymobCallbackView.as_view(), name="paymob-callback"),

    # --- Fawry ---
    path("payments/fawry/checkout/", FawryCheckoutView.as_view(), name="fawry-checkout"),
    path("payments/fawry/webhook/", fawry_webhook, name="fawry-webhook"),
    path("payments/fawry/status/", FawryStatusView.as_view(), name="fawry-status"),

    # --- Wishlist ---
    path("wishlist/", WishlistListView.as_view(), name="wishlist-list"),
    path("wishlist/add/", WishlistAddView.as_view(), name="wishlist-add"),
    path("wishlist/remove/", WishlistRemoveView.as_view(), name="wishlist-remove"),
    path("wishlist/check/", WishlistCheckView.as_view(), name="wishlist-check"),
    path("wishlist/bulk-check/", WishlistBulkCheckView.as_view(), name="wishlist-bulk-check"),

    # --- Reviews ---
    path("products/<int:product_id>/reviews/", ProductReviewListView.as_view(), name="product-reviews"),
    path("products/<int:product_id>/reviews/stats/", ProductReviewStatsView.as_view(), name="product-review-stats"),
    path("products/<int:product_id>/reviews/create/", ReviewCreateView.as_view(), name="review-create"),
    path("reviews/<int:review_id>/delete/", ReviewDeleteView.as_view(), name="review-delete"),

    # --- Notifications ---
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/count/", NotificationCountView.as_view(), name="notification-count"),
    path("notifications/mark-read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("admins/notifications/send/", AdminNotificationSendView.as_view(), name="admin-notification-send"),
    path("admins/users/", AdminUserListView.as_view(), name="admin-users-list"),

    # --- Delivery ---
    path("delivery/fee/", DeliveryFeeView.as_view(), name="delivery-fee"),

    # --- Product likes (love / heart) ---
    path("products/<int:product_id>/like/", ProductLikeToggleView.as_view(), name="product-like"),

    # --- Product dislikes (thumbs-down, buyers only) ---
    path("products/<int:product_id>/dislike/", ProductDislikeToggleView.as_view(), name="product-dislike"),

    # --- Product comments ---
    path("products/<int:product_id>/comments/", ProductCommentListView.as_view(), name="product-comments"),
    path("products/comments/create/", ProductCommentCreateView.as_view(), name="product-comment-create"),
    path("products/comments/<int:comment_id>/delete/", ProductCommentDeleteView.as_view(), name="product-comment-delete"),

    # --- Seller follow ---
    path("sellers/<int:seller_id>/follow/", SellerFollowToggleView.as_view(), name="seller-follow"),
    path("sellers/following/", FollowedSellersListView.as_view(), name="seller-following"),

    # --- Feeds ---
    path("feed/home/", HomeFeedView.as_view(), name="home-feed"),
    path("feed/followed/", FollowedSellersFeedView.as_view(), name="followed-feed"),
]
