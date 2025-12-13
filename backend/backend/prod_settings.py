from .settings import *
import dj_database_url

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
  "default": dj_database_url.config(
    default=os.environ.get("DATABASE_URL"),
    conn_max_age=600,
    ssl_require=True,
  )
}

# It's recommended to set ALLOWED_HOSTS from an environment variable
# in your production environment.
# ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

# Add any other production-specific settings here
CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = ['https://*']
