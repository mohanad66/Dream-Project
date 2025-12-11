from .settings import *

DEBUG = True

Use a more robust database for production if available
For example, PostgreSQL:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get("DB_NAME", ""),
        'USER': os.environ.get("DB_USER", ""),
        'PASSWORD': os.environ.get("DB_PASS", ""),
        'HOST': os.environ.get("DB_HOST", ""),
        'PORT': os.environ.get("DB_PORT", ""),
    }
}

# It's recommended to set ALLOWED_HOSTS from an environment variable
# in your production environment.
# ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

# Add any other production-specific settings here
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS" , "").split(',')
