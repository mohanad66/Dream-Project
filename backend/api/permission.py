from rest_framework.permissions import BasePermission
 
 
class IsApprovedSeller(BasePermission):
    """
    Restricts access to users who have a SellerProfile that's approved
    and active. Use on every seller-dashboard endpoint from Phase 2 onward.
    """
 
    message = "You must be an approved seller to access this."
 
    def has_permission(self, request, view):
        profile = getattr(request.user, "seller_profile", None)
        return bool(
            request.user
            and request.user.is_authenticated
            and profile is not None
            and profile.is_approved
            and profile.is_active
        )
 
 
class IsProductOwner(BasePermission):
    """Object-level check: seller can only touch their own products."""
 
    def has_object_permission(self, request, view, obj):
        return obj.seller.user_id == request.user.id
 