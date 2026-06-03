from django.urls import path
from .views import *


urlpatterns = [
    path('api/auth/register/', register, name='register'),
    path('api/otp/verify/', verify_otp, name='verify_otp'),
    path('api/otp/resend/', resend_otp, name='resend_otp'),

    # Forgot password
    path('api/auth/forgot-password/', forgot_password, name='forgot_password'),
    path('api/auth/verify-reset-otp/', verify_reset_otp, name='verify_reset_otp'),
    path('api/auth/reset-password/', reset_password, name='reset_password'),
]