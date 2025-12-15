from django.shortcuts import render , redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .services import *
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from .serializers import *
from rest_framework.response import Response
from rest_framework import status

# Create your views here.

class SendOTPView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self , request):
        serializer = SendOTPSerialzer(data=request.data)
        if serializer.is_valid():
            otp , message = OTPService.create_and_send_otp(
                user=request.user,
                method="email"
            )
            if otp:
                return Response({
                    'success':True,
                    'message':message
                } , status = status.HTTP_200_ok)
            else:
                return Response({
                    "success":False,
                    "message": message
                } , status = status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyOTPView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        
        if serializer.is_valid():
            otp_code = serializer.validated_data['otp_code']
            success, message = OTPService.verify_otp(request.user, otp_code)
            
            if success:
                return Response({
                    'success': True,
                    'message': message
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'message': message
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            