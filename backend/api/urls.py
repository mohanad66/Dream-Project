from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView
)
# Make sure to import the new class-based view and remove the old one
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

    path('admins/products/', ProductAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-product-list'),
    path('admins/products/<int:pk>/', ProductAdminViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='admin-product-detail'),
    
    # Categories
    path('admins/categories/', CategoryAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-category-list'),
    path('admins/categories/<int:pk>/', CategoryAdminViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='admin-category-detail'),
    
    path('admins/categorys/', CategoryAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-category-list'),
    path('admins/categorys/<int:pk>/', CategoryAdminViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='admin-category-detail'),
    # Services
    path('admins/services/', ServiceAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-service-list'),
    path('admins/services/<int:pk>/', ServiceAdminViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='admin-service-detail'),
    
    # Contacts
    path('admins/contacts/', ContactAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-contact-list'),
    path('admins/contacts/<int:pk>/', ContactAdminViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='admin-contact-detail'),

    # Authentication endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    
    # User endpoints
    path("user/register/", CreateUserView.as_view(), name="register"),
    
    # +++ THIS IS THE CORRECTED LINE +++
    path("user/myuser/", CurrentUserView.as_view(), name="get_user"),
    
    path('user/all/', get_all_users, name='get_all_users'),
    path('user/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('auth/password/change/', PasswordChangeView.as_view(), name='password-change'),
    path("payments/create-intent/", CreatePaymentIntentView.as_view(), name="CreatePaymentIntentView"),
    # ++++++++++ ADD ADMIN URLS ++++++++++
    path("admin/", include(admin_router.urls)),
    # ++++++++++++++++++++++++++++++++++++
]