from django.urls import path
from . import views

urlpatterns = [    
    # OTP
    path('api/otp/send/', views.send_otp, name='send_otp'),
    path('api/otp/verify/', views.verify_otp, name='verify_otp'),
]