"""
Performance optimization utilities for caching and reducing database queries.
"""
from functools import wraps
from django.views.decorators.cache import cache_page
from django.views.decorators.http import condition
from django.core.cache import cache
from django.utils.decorators import method_decorator
from rest_framework.response import Response
from django.conf import settings

def cache_api_response(timeout=300):
    """
    Cache API responses based on user authentication and view parameters.
    Respects ENABLE_CACHING setting globally.
    
    Args:
        timeout: Cache duration in seconds (default: 5 minutes)
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Don't cache authenticated requests (user-specific data)
            if request.user.is_authenticated:
                return view_func(request, *args, **kwargs)
            
            # Build cache key from request path and query params
            cache_key = f"api_response:{request.path}:{request.GET.urlencode()}"
            
            # Try to get from cache (only if caching is enabled)
            if getattr(settings, 'ENABLE_CACHING', True):
                cached_response = cache.get(cache_key)
                if cached_response is not None:
                    return Response(cached_response)
            
            # Call the view
            response = view_func(request, *args, **kwargs)
            
            # Cache successful responses only (if enabled)
            if getattr(settings, 'ENABLE_CACHING', True):
                if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                    cache.set(cache_key, response.data, timeout)
            
            return response
        
        return wrapper
    return decorator


def invalidate_cache_pattern(pattern):
    """
    Invalidate all cache keys matching a pattern.
    Respects ENABLE_CACHING setting.
    
    Args:
        pattern: String pattern to match cache keys (e.g., 'api_response:*')
    """
    if not getattr(settings, 'ENABLE_CACHING', True):
        return
    
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern(pattern)
        return

    # Fallback for backends without pattern deletion.
    try:
        cache.clear()
    except Exception:
        pass


class CacheInvalidationMixin:
    """
    Mixin to automatically invalidate related caches when saving/deleting model instances.
    Respects ENABLE_CACHING setting.
    """
    cache_key_prefix = None
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._invalidate_cache()
    
    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self._invalidate_cache()
    
    def _invalidate_cache(self):
        if not getattr(settings, 'ENABLE_CACHING', True):
            return
        if self.cache_key_prefix:
            cache.delete(self.cache_key_prefix)
