# Dream-Project/backend/start.py
import os
from waitress import serve
# *** IMPORTANT: Change this line to the correct module path ***
from backend.backend.wsgi import application 

port = int(os.environ.get('PORT', 8000))
serve(application, host='0.0.0.0', port=port)
