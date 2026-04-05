from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse
import re

class CacheControlMiddleware(MiddlewareMixin):
    """
    Middleware to add appropriate cache headers to responses
    """

    def process_response(self, request, response):
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Don't cache API responses that require authentication or are dynamic
        if hasattr(request, 'user') and request.user.is_authenticated:
            # For authenticated users, don't cache personal data
            if '/api/' in request.path:
                response['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
                response['Pragma'] = 'no-cache'
                response['Expires'] = '0'
            return response

        # Cache static files aggressively
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            response['Cache-Control'] = 'public, max-age=31536000, immutable'  # 1 year
            response['Expires'] = 'Mon, 01 Jan 2028 00:00:00 GMT'  # Far future
            return response

        # Cache public API endpoints for a short time
        if '/api/' in request.path and request.method == 'GET':
            # Different cache times for different endpoints
            if any(endpoint in request.path for endpoint in ['/categories/', '/tags/', '/services/']):
                # Static data that changes rarely
                response['Cache-Control'] = 'public, max-age=3600'  # 1 hour
            elif '/products/' in request.path:
                # Product data changes more frequently
                response['Cache-Control'] = 'public, max-age=300'  # 5 minutes
            else:
                # Other API endpoints - short cache
                response['Cache-Control'] = 'public, max-age=60'  # 1 minute

        # Cache pages for a short time
        elif request.method == 'GET' and not request.path.startswith('/admin/'):
            response['Cache-Control'] = 'public, max-age=300'  # 5 minutes

        return response