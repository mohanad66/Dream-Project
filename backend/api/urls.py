from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView
)


from .views import *


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
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    
    # User endpoints
    path("user/register/", CreateUserView.as_view(), name="register"),
    path("user/myuser/", get_current_user, name="get_user"),
    path("user/verify-token/", verify_token, name="verify_token"),
    path('user/all/', get_all_users, name='get_all_users'),
    path("user/<int:pk>/", UserDetailView.as_view() , name="get-all")

]