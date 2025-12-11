from .settings import *

DEBUG = True

# Use a more robust database for production if available
# For example, PostgreSQL:
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': os.environ.get("PGDATABASE"),
#         'USER': os.environ.get("PGUSER"),
#         'PASSWORD': os.environ.get("PGPASSWORD"),
#         'HOST': os.environ.get("PGHOST"),
#         'PORT': os.environ.get("PGPORT", "5432"),
#     }
# }
DATABASES = {
    
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# It's recommended to set ALLOWED_HOSTS from an environment variable
# in your production environment.
# ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

# Add any other production-specific settings here
CORS_ALLOW_ALL_ORIGINS = True
