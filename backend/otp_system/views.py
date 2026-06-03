from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from .services import OTPService
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if not all([username, email, password]):
        return Response({'error': 'All fields required'}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username taken'}, status=400)

    # Create inactive user — can't log in until email verified
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        is_active=False   # ← key part
    )

    # Send OTP right after account creation
    otp, message = OTPService.create_and_send_otp(user, method='email')
    if not otp:
        user.delete()  # roll back if email fails
        return Response({'error': 'Failed to send verification email'}, status=500)

    return Response({
        'success': True,
        'message': 'Account created. Check your email for the verification code.',
        'user_id': user.id   # needed for the verify step
    }, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    user_id = request.data.get('user_id')
    otp_code = request.data.get('otp_code')

    if not all([user_id, otp_code]):
        return Response({'error': 'user_id and otp_code required'}, status=400)

    try:
        user = User.objects.get(id=user_id, is_active=False)
    except User.DoesNotExist:
        return Response({'error': 'User not found or already verified'}, status=404)

    success, message = OTPService.verify_otp(user, otp_code)

    if success:
        user.is_active = True   # ← activate the account
        user.save()
        return Response({'success': True, 'message': 'Email verified! You can now log in.'})

    return Response({'error': message}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    user_id = request.data.get('user_id')

    try:
        user = User.objects.get(id=user_id, is_active=False)
    except User.DoesNotExist:
        return Response({'error': 'User not found or already verified'}, status=404)

    otp, message = OTPService.create_and_send_otp(user, method='email')
    if otp:
        return Response({'success': True, 'message': 'New code sent'})
    return Response({'error': message}, status=500)





@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email required'}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't reveal if email exists or not — security best practice
        return Response({'success': True, 'message': 'If this email exists, a code was sent.'})

    otp, message = OTPService.create_and_send_otp(user, method='email')
    if not otp:
        return Response({'error': 'Failed to send email'}, status=500)

    return Response({
        'success': True,
        'message': 'If this email exists, a code was sent.',
        'user_id': user.id   # needed for next step
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_reset_otp(request):
    user_id = request.data.get('user_id')
    otp_code = request.data.get('otp_code')

    if not all([user_id, otp_code]):
        return Response({'error': 'user_id and otp_code required'}, status=400)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    success, message = OTPService.verify_otp(user, otp_code)
    if not success:
        return Response({'error': message}, status=400)

    # Store a reset token in cache so only verified users can reset
    from django.core.cache import cache
    import secrets
    reset_token = secrets.token_urlsafe(32)
    cache.set(f"reset_token_{user.id}", reset_token, 600)  # 10 min expiry

    return Response({
        'success': True,
        'user_id': user.id,
        'reset_token': reset_token   # frontend stores this temporarily
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    user_id = request.data.get('user_id')
    reset_token = request.data.get('reset_token')
    new_password = request.data.get('new_password')

    if not all([user_id, reset_token, new_password]):
        return Response({'error': 'All fields required'}, status=400)

    # Verify the reset token
    from django.core.cache import cache
    stored_token = cache.get(f"reset_token_{user_id}")
    if not stored_token or stored_token != reset_token:
        return Response({'error': 'Invalid or expired reset session'}, status=400)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    # Validate password strength
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response({'error': list(e.messages)}, status=400)

    user.set_password(new_password)
    user.is_active = True
    user.save()
    cache.delete(f"reset_token_{user_id}")  # invalidate token after use

    return Response({'success': True, 'message': 'Password reset. You can now log in.'})