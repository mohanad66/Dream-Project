import os
from waitress import serve
from backend.backend.wsgi import application

port = int(os.environ.get('PORT', 8000))
# Change host to '0.0.0.0'
serve(application, host='0.0.0.0', port=port)
