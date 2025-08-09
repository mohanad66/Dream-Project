from django.urls import path, include # +++ ADD include
from rest_framework.routers import DefaultRouter # +++ ADD DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView
)
from .views import *

# ++++++++++ SETUP ADMIN ROUTER ++++++++++
admin_router = DefaultRouter()
admin_router.register(r'products', ProductAdminViewSet, basename='admin-product')
admin_router.register(r'categories', CategoryAdminViewSet, basename='admin-category')
admin_router.register(r'services', ServiceAdminViewSet, basename='admin-service')
admin_router.register(r'contacts', ContactAdminViewSet, basename='admin-contact')
# +++++++++++++++++++++++++++++++++++++++++

urlpatterns = [
    # Public endpoints
    path("products/", get_product, name="get_products"),
    path("categories/", get_category, name="get_category"),
    path("carousels/", get_carouselImg, name="get_carouselImg"),
    path("services/", get_services, name="get_services"),
    path("contact/", get_contact, name="get_contact"),
    
    # Authentication endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'), # <--- ADD THIS LINE

    # User endpoints
    path("user/register/", CreateUserView.as_view(), name="register"),
    path("user/myuser/", get_current_user, name="get_user"),
    path('user/all/', get_all_users, name='get_all_users'),
    path("user/<int:pk>/", UserDetailView.as_view() , name="user-detail"),
    path('auth/password/change/', PasswordChangeView.as_view(), name='password-change'),

    # ++++++++++ PAYMENT ENDPOINTS ++++++++++
    path("payments/", PaymentListView.as_view(), name="payment-list"),
    path("payments/create-intent/", CreatePaymentIntentView.as_view(), name="create-payment-intent"),
    # +++++++++++++++++++++++++++++++++++++++

    # ++++++++++ ADD ADMIN URLS ++++++++++
    # This includes all the URLs for the admin viewsets (e.g., /api/admin/products/)
    path("admin/", include(admin_router.urls)),
    # ++++++++++++++++++++++++++++++++++++
]
