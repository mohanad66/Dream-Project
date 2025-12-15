from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import random
import string

# Create your models here.

class OTP(models.Model):
    user = models.ForeignKey(User , on_delete=models.CASCADE)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    
    class Meta:
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.user.username} - {self.otp_code}"
    
    def is_valid(self):
        return not self.is_verified and timezone.now() < self.expires_at
    
    @staticmethod
    def genereate_otp():
        return ''.join(random.choices(string.digits, k=6))
     
    def save(self , *args , **kwargs):
        if not self.otp_code:
            self.otp_code = self.genereate_otp()
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=5)
        super().save(*args , **kwargs)

