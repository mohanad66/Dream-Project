from rest_framework import serializers
from django.contrib.auth.models import User
from .models import OTP

class SendOTPSerialzer(serializers.Serializer):
    pass
    
class VerifyOTPSerializer(serializers.Serializer):
    otp_code = serializers.CharField(max_length=6, min_length=6)

    def validate_otp_code(self, value):  # ← was missing `value` parameter
        if not value.isdigit():          # ← isdigital() doesn't exist → isdigit()
            raise serializers.ValidationError("OTP must contain only digits")
        return value    