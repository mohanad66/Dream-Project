from .settings import *

DEBUG = True

# Use a more robust database for production if available
# For example, PostgreSQL:
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': 'your_db_name',
#         'USER': 'your_db_user',
#         'PASSWORD': 'your_db_password',
#         'HOST': 'your_db_host',
#         'PORT': 'your_db_port',
#     }
# }

# It's recommended to set ALLOWED_HOSTS from an environment variable
# in your production environment.
# ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

# Add any other production-specific settings here
