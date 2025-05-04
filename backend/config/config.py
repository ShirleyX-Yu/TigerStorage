from flask import Flask
from flask_cors import CORS
from flask import send_from_directory
import os

class Config:
    def __init__(self, app: Flask):
        # Configure CORS to allow requests from Render domains
        CORS(
            app,
            resources={
                r"/*": {
                    "origins": [
                        "https://tigerstorage-frontend.onrender.com",
                        "http://localhost:5173"
                    ],
                    "supports_credentials": True,
                    "allow_headers": [
                        "Content-Type",
                        "Authorization",
                        "X-Requested-With",
                        "X-User-Type",
                        "X-Username",
                        "Accept",
                        "Cache-Control",
                        "Pragma",
                        "Origin",
                        "X-CSRFToken",
                        "X-Session-Id",
                        "X-Auth-Token"
                    ],
                    "expose_headers": [
                        "Content-Type",
                        "Authorization",
                        "X-Requested-With",
                        "X-User-Type",
                        "X-Username",
                        "Accept",
                        "Cache-Control",
                        "Pragma",
                        "Origin",
                        "X-CSRFToken",
                        "X-Session-Id",
                        "X-Auth-Token"
                    ],
                    "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                    "max_age": 3600
                }
            }
        )

        # Configure session
        app.config['SESSION_COOKIE_SAMESITE'] = 'None'
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['SESSION_COOKIE_HTTPONLY'] = True

        # Load environment variables
        import dotenv
        dotenv.load_dotenv()

        # Set secret key
        app.secret_key = os.environ.get("APP_SECRET_KEY", "default-dev-key-replace-in-production")

        # Determine if this is production
        is_production = os.environ.get('FLASK_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
        # Set domain to None in dev, but in production set it to the root domain shared by frontend/backend
        app.config['SESSION_COOKIE_DOMAIN'] = '.onrender.com' if is_production else None
        app.config['PERMANENT_SESSION_LIFETIME'] = 3600 * 24 * 7  # 7 days in seconds

        # Configure upload folder
        UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
        ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
        app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

        # Create uploads directory if it doesn't exist
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

        # Add route to serve static files from frontend public directory
        @app.route('/public/<path:filename>')
        def serve_public(filename):
            return send_from_directory('../frontend/public', filename)