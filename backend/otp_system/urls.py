from django.urls import path
from . import views

urlpatterns = [    
    # OTP
    path('api/otp/send/', views.SendOTPView.as_view(), name='send_otp'),
    path('api/otp/verify/', views.VerifyOTPView.as_view(), name='verify_otp'),
]