from django.core.mail import send_mail
from django.conf import settings
from .models import OTP

class OTPService:
    
    @staticmethod
    def send_otp_via_email(user, otp_code):
        """Send OTP via email with HTML template"""
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.utils.html import strip_tags
        
        subject = f'{settings.SITE_NAME} - Verification Code'
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #4CAF50; color: white; padding: 20px; text-align: center; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 5px; margin: 20px 0; }}
                .otp-code {{ font-size: 32px; font-weight: bold; color: #4CAF50; 
                            letter-spacing: 5px; text-align: center; padding: 20px; 
                            background: white; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; padding: 20px; }}
                .warning {{ color: #f44336; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{settings.SITE_NAME}</h1>
                </div>
                <div class="content">
                    <h2>Hello {user.first_name or user.username},</h2>
                    <p>You requested a verification code. Please use the code below to verify your identity:</p>
                    
                    <div class="otp-code">{otp_code}</div>
                    
                    <p>This code will expire in <strong>5 minutes</strong>.</p>
                    
                    <p class="warning">⚠️ If you didn't request this code, please ignore this email or contact support.</p>
                </div>
                <div class="footer">
                    <p>© 2024 {settings.SITE_NAME}. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_content = f"""
        Hello {user.first_name or user.username},
        
        You requested a verification code. Please use the code below:
        
        {otp_code}
        
        This code will expire in 5 minutes.
        
        If you didn't request this code, please ignore this email.
        
        © 2024 {settings.SITE_NAME}
        """
        
        try:
            msg = EmailMultiAlternatives(
                subject, 
                text_content, 
                settings.DEFAULT_FROM_EMAIL, 
                [user.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            return True
        except Exception as e:
            print(f"Error sending email: {e}")
            return False
    
    # @staticmethod
    # def send_otp_via_sms(phone_number, otp_code):
    #     """Send OTP via SMS using Twilio"""
    #     try:
    #         client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    #         message = client.messages.create(
    #             body=f'{settings.SITE_NAME}: Your verification code is {otp_code}. Valid for 5 minutes. Do not share this code.',
    #             from_=settings.TWILIO_PHONE_NUMBER,
    #             to=phone_number
    #         )
    #         return True
    #     except Exception as e:
    #         print(f"Error sending SMS: {e}")
    #         return False
    
    @staticmethod
    def create_and_send_otp(user, method='email', phone_number=None):
        """Create OTP and send via specified method"""
        # Invalidate previous OTPs
        OTP.objects.filter(user=user, is_verified=False).update(is_verified=True)
        
        # Create new OTP
        otp = OTP.objects.create(user=user)
        
        # Send OTP
        if method == 'email':
            success = OTPService.send_otp_via_email(user, otp.otp_code)
        elif method == 'sms' and phone_number:
            success = OTPService.send_otp_via_sms(phone_number, otp.otp_code)
        else:
            return None, "Invalid method"
        
        if success:
            return otp, "OTP sent successfully"
        else:
            return None, "Failed to send OTP"
    
    @staticmethod
    def verify_otp(user, otp_code):
        """Verify OTP code"""
        try:
            otp = OTP.objects.filter(
                user=user,
                otp_code=otp_code,
                is_verified=False
            ).first()
            
            if not otp:
                return False, "Invalid OTP"
            
            if not otp.is_valid():
                return False, "OTP has expired"
            
            otp.is_verified = True
            otp.save()
            return True, "OTP verified successfully"
            
        except Exception as e:
            return False, str(e)