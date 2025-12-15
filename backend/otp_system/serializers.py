from rest_framework import serializers
from django.contrib.auth.models import User
from .models import OTP

class SendOTPSerialzer(serializers.Serializer):
    def validate(self, data):
        return data
    
class VerifyOTPSerialzer(serializers.Serializer):
    otp_code = serializers.CharField(max_length=6 , min_length=6)
    def validate_otp_code(self):
        otp_code = self.initial_data.get(otp_code)
        if not otp_code.isdigital():
            raise serializers.ValidationError("OTP must contain only digits")
        return otp_code