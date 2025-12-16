from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
from rest_framework import status
from .serializers import *
from .services import *
import random

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_otp(request):
    user = request.user
    if not user.email:
        return Response({'error': 'Email required'}, status=400)
    
    otp = str(random.randint(100000, 999999))
    cache.set(f"otp_{user.id}", otp, 300)
    
    # SEND EMAIL (not just print)
    send_mail(
        'Your OTP Code',
        f'Your OTP is: {otp}. Expires in 5 minutes.',
        settings.EMAIL_HOST_USER,
        [user.email],
        fail_silently=False,
    )
    
    print(f"OTP sent to {user.email}: {otp}")
    return Response({'success': True})

@api_view(['POST'])
def verify_otp(request):
    otp = request.data.get('otp')
    user_id = request.user.id  # From JWT token
    
    if not otp:
        return Response({'error': 'OTP required'}, status=400)
    
    stored_otp = cache.get(f"otp_{user_id}")
    
    if not stored_otp:
        return Response({'error': 'OTP expired or invalid'}, status=400)
    
    if otp == stored_otp:
        cache.delete(f"otp_{user_id}")  # Clear used OTP
        return Response({'success': True, 'message': 'Verified!'})
    else:
        return Response({'error': 'Invalid OTP'}, status=400)