"""
Email utility functions for sending transactional emails.
Uses Django's built-in email backend (console in dev, SMTP in production).
"""
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_order_confirmation_email(order):
    """Send order confirmation email to buyer."""
    try:
        subject = f"Order #{order.pk} Confirmed"
        message = f"""
Hi {order.owner.first_name or order.owner.username},

Your order #{order.pk} has been confirmed!

Order Total: {order.total_price} L.E
Items: {order.items.count()}

Thank you for shopping with us!

Best regards,
Dream Team
"""
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.owner.email],
            fail_silently=True,
        )
        logger.info(f"Order confirmation email sent for order #{order.pk}")
    except Exception as e:
        logger.error(f"Failed to send order confirmation email: {e}")


def send_order_status_email(order, old_status, new_status):
    """Send order status update email to buyer."""
    try:
        status_messages = {
            "confirmed": "Your order has been confirmed!",
            "shipped": "Your order has been shipped!",
            "delivered": "Your order has been delivered!",
            "cancelled": "Your order has been cancelled.",
        }

        if new_status not in status_messages:
            return

        subject = f"Order #{order.pk} - {new_status.title()}"
        message = f"""
Hi {order.owner.first_name or order.owner.username},

{status_messages[new_status]}

Order #{order.pk}
Status: {new_status.title()}

Best regards,
Dream Team
"""
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.owner.email],
            fail_silently=True,
        )
        logger.info(f"Order status email sent for order #{order.pk}")
    except Exception as e:
        logger.error(f"Failed to send order status email: {e}")


def send_seller_approval_email(seller_profile):
    """Send seller approval email."""
    try:
        subject = "Seller Account Approved"
        message = f"""
Hi {seller_profile.user.first_name or seller_profile.user.username},

Congratulations! Your seller account '{seller_profile.business_name}' has been approved.

You can now start listing products on Dream.

Best regards,
Dream Team
"""
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [seller_profile.user.email],
            fail_silently=True,
        )
        logger.info(f"Seller approval email sent for {seller_profile.business_name}")
    except Exception as e:
        logger.error(f"Failed to send seller approval email: {e}")


def send_seller_rejection_email(seller_profile, reason=""):
    """Send seller rejection email."""
    try:
        subject = "Seller Account Rejected"
        message = f"""
Hi {seller_profile.user.first_name or seller_profile.user.username},

We regret to inform you that your seller account '{seller_profile.business_name}' has been rejected.

Reason: {reason or 'Not specified'}

If you have any questions, please contact our support team.

Best regards,
Dream Team
"""
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [seller_profile.user.email],
            fail_silently=True,
        )
        logger.info(f"Seller rejection email sent for {seller_profile.business_name}")
    except Exception as e:
        logger.error(f"Failed to send seller rejection email: {e}")


def send_product_approval_email(product):
    """Send product approval email to seller."""
    try:
        subject = f"Product '{product.name}' Approved"
        message = f"""
Hi {product.seller.user.first_name or product.seller.user.username},

Your product '{product.name}' has been approved and is now live on Dream.

Best regards,
Dream Team
"""
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [product.seller.user.email],
            fail_silently=True,
        )
        logger.info(f"Product approval email sent for {product.name}")
    except Exception as e:
        logger.error(f"Failed to send product approval email: {e}")


def send_product_rejection_email(product, reason=""):
    """Send product rejection email to seller."""
    try:
        subject = f"Product '{product.name}' Rejected"
        message = f"""
Hi {product.seller.user.first_name or product.seller.user.username},

We regret to inform you that your product '{product.name}' has been rejected.

Reason: {reason or 'Not specified'}

Best regards,
Dream Team
"""
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [product.seller.user.email],
            fail_silently=True,
        )
        logger.info(f"Product rejection email sent for {product.name}")
    except Exception as e:
        logger.error(f"Failed to send product rejection email: {e}")