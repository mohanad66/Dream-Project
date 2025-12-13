from .settings import *
import dj_database_url

DEBUG = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get("PGDATABASE"),
        'USER': os.environ.get("PGUSER"),
        'PASSWORD': os.environ.get("PGPASSWORD"),
        'HOST': os.environ.get("PGHOST"),
        'PORT': os.environ.get("PGPORT", "5432"),
    }
}

# IS_RAILWAY = os.environ.get('RAILWAY_ENVIRONMENT') is not None

# if IS_RAILWAY:
#     # Production: Use Railway's PostgreSQL
#     DATABASES = {
#         'default': dj_database_url.config(
#             default="postgresql://postgres:kzXKIBXKuJzFowdfxDQdQlTKVExgsbBb@crossover.proxy.rlwy.net:49225/railway",
#             conn_max_age=600,
#             conn_health_checks=True,
#         )
#     }
# else:
#     # Local Development: Use SQLite
#     DATABASES = {
#         'default': {
#             'ENGINE': 'django.db.backends.sqlite3',
#             'NAME': BASE_DIR / 'db.sqlite3',
#         }
#     }

# It's recommended to set ALLOWED_HOSTS from an environment variable
# in your production environment.
# ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

# Add any other production-specific settings here
CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = ['https://*']
