from flask import Flask, jsonify, send_from_directory, session, redirect, url_for, request, render_template
from flask_cors import CORS
import dotenv
import os
import psycopg2
import argparse
import auth
import json
import uuid
from werkzeug.utils import secure_filename
from decimal import Decimal
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Set up command-line argument parsing
parser = argparse.ArgumentParser(description="Run Flask app")
parser.add_argument(
    "--production", action="store_true", help="Run in production mode (disables debug)"
)

app = Flask(
    __name__,
    template_folder=os.path.abspath("templates"),
    static_folder=os.path.abspath("static"),
)

# Configure CORS to allow requests from Render domains
# --- CORS CONFIGURATION ---
# Explicitly allow all necessary headers and credentials for frontend integration
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
                "Cache-Control"
            ]
        }
    }
)

# --- SESSION COOKIE CONFIGURATION ---
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True

# Utility: Add CORS headers to all responses for cross-origin credentialed requests
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    allowed_origins = [
        "https://tigerstorage-frontend.onrender.com",
        "http://localhost:5173"
    ]
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response



# Function to add CORS headers to responses
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    if origin and (origin == 'https://tigerstorage-frontend.onrender.com' or origin.startswith('http://localhost')):
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Pragma, Cache-Control, Origin, Accept, X-CSRFToken, X-Session-Id, X-Auth-Token, X-User-Type, X-Username'
    response.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization, X-Requested-With, Pragma, Cache-Control, Origin, Accept, X-CSRFToken, X-Session-Id, X-Auth-Token, X-User-Type, X-Username'
    return response

# Register the after_request function to add CORS headers to all responses
@app.after_request
def after_request(response):
    return add_cors_headers(response)

# Load environment variables and set secret key
dotenv.load_dotenv()
app.secret_key = os.environ.get("APP_SECRET_KEY", "default-dev-key-replace-in-production")

# Configure session cookie settings for proper cross-domain support
app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # String 'None' not Python None
app.config['SESSION_COOKIE_SECURE'] = True     # Require HTTPS for SameSite=None
app.config['SESSION_COOKIE_HTTPONLY'] = True

# Determine if this is production based on environment variables
is_production = os.environ.get('FLASK_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
# Set domain to None in dev, but in production set it to the root domain shared by frontend/backend
app.config['SESSION_COOKIE_DOMAIN'] = '.onrender.com' if is_production else None
app.config['PERMANENT_SESSION_LIFETIME'] = 3600 * 24 * 7  # 7 days in seconds

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Initialize CAS authentication
auth.init_auth(app)

# Initialize database tables
def init_db():
    """Initialize database tables if they don't exist"""
    try:
        conn = get_db_connection()
        if not conn:
            print("Failed to connect to database for initialization")
            return
            
        try:
            with conn.cursor() as cur:
                # Check if storage_listings table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'storage_listings'
                    );
                """)
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    print("Creating storage_listings table")
                    cur.execute("""
                        CREATE TABLE storage_listings (
                            listing_id SERIAL PRIMARY KEY,
                            location VARCHAR(255) NOT NULL,
                            address VARCHAR(255),
                            cost NUMERIC,
                            cubic_ft INTEGER,
                            description TEXT,
                            latitude FLOAT,
                            longitude FLOAT,
                            start_date DATE,
                            end_date DATE,
                            image_url VARCHAR(255),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            owner_id VARCHAR(255)
                        );
                    """)
                    conn.commit()
                    print("storage_listings table created successfully")
                else:
                    print("storage_listings table already exists")
                    
                    # Check if contract_start_date column exists and add it if it doesn't
                    try:
                        cur.execute("""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name = 'storage_listings' AND column_name = 'contract_start_date';
                        """)
                        start_date_exists = cur.fetchone() is not None
                        
                        if not start_date_exists:
                            print("Adding contract_start_date column to storage_listings table")
                            cur.execute("ALTER TABLE storage_listings ADD COLUMN contract_start_date DATE;")
                            conn.commit()
                            print("contract_start_date column added successfully")
                        else:
                            print("contract_start_date column already exists")
                    except Exception as column_err:
                        print(f"Error checking or adding contract_start_date column: {column_err}")
                        conn.rollback()

                    # Check if contract_end_date column exists and add it if it doesn't
                    try:
                        cur.execute("""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name = 'storage_listings' AND column_name = 'contract_end_date';
                        """)
                        end_date_exists = cur.fetchone() is not None
                        
                        if not end_date_exists:
                            print("Adding contract_end_date column to storage_listings table")
                            cur.execute("ALTER TABLE storage_listings ADD COLUMN contract_end_date DATE;")
                            conn.commit()
                            print("contract_end_date column added successfully")
                        else:
                            print("contract_end_date column already exists")
                    except Exception as column_err:
                        print(f"Error checking or adding contract_end_date column: {column_err}")
                        conn.rollback()

                    # Check if address column exists and add it if it doesn't
                    try:
                        cur.execute("""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name = 'storage_listings' AND column_name = 'address';
                        """)
                        address_column_exists = cur.fetchone() is not None
                        
                        if not address_column_exists:
                            print("Adding address column to storage_listings table")
                            cur.execute("ALTER TABLE storage_listings ADD COLUMN address VARCHAR(255);")
                            conn.commit()
                            print("Address column added successfully")
                        else:
                            print("Address column already exists")
                            
                        # Check if we need to convert contract_length_months to start_date and end_date
                        cur.execute("""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name = 'storage_listings' 
                            AND column_name = 'contract_length_months';
                        """)
                        contract_length_exists = cur.fetchone() is not None
                        
                        if contract_length_exists:
                            print("Converting contract_length_months to start_date and end_date")
                            # Add new columns
                            cur.execute("""
                                ALTER TABLE storage_listings 
                                ADD COLUMN start_date DATE,
                                ADD COLUMN end_date DATE;
                            """)
                            # Update existing rows to have default dates
                            cur.execute("""
                                UPDATE storage_listings 
                                SET start_date = CURRENT_DATE,
                                    end_date = CURRENT_DATE + (contract_length_months || ' months')::interval
                                WHERE start_date IS NULL;
                            """)
                            # Drop the old column
                            cur.execute("ALTER TABLE storage_listings DROP COLUMN contract_length_months;")
                            conn.commit()
                            print("Successfully converted contract_length_months to start_date and end_date")
                            
                        # Check and add latitude/longitude columns if they don't exist
                        cur.execute("""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name = 'storage_listings' 
                            AND column_name IN ('latitude', 'longitude');
                        """)
                        lat_long_columns = [col[0] for col in cur.fetchall()]
                        
                        print(f"Existing lat/long columns: {lat_long_columns}")
                        
                        if 'latitude' not in lat_long_columns:
                            print("Adding latitude column to storage_listings")
                            cur.execute("ALTER TABLE storage_listings ADD COLUMN latitude FLOAT;")
                            conn.commit()
                            print("latitude column added successfully")
                        
                        if 'longitude' not in lat_long_columns:
                            print("Adding longitude column to storage_listings")
                            cur.execute("ALTER TABLE storage_listings ADD COLUMN longitude FLOAT;")
                            conn.commit()
                            print("longitude column added successfully")
                    except Exception as e:
                        print(f"Error adding latitude/longitude columns: {e}")
                        conn.rollback()

                # Check if interested_listings table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'interested_listings'
                    );
                """)
                interested_table_exists = cur.fetchone()[0]
                
                if not interested_table_exists:
                    print("Creating interested_listings table")
                    cur.execute("""
                        CREATE TABLE interested_listings (
                            interest_id SERIAL PRIMARY KEY,
                            listing_id INTEGER REFERENCES storage_listings(listing_id) ON DELETE CASCADE,
                            lender_username VARCHAR(255) NOT NULL,
                            renter_username VARCHAR(255) NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            status VARCHAR(50) DEFAULT 'pending',
                            UNIQUE(listing_id, renter_username)
                        );
                    """)
                    conn.commit()
                    print("interested_listings table created successfully")
                else:
                    print("interested_listings table already exists")
                    
                    # Check if the interested_listings table has all required columns
                    cur.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'interested_listings';
                    """)
                    interested_columns = [col[0] for col in cur.fetchall()]
                    print(f"Interested listings columns: {interested_columns}")
                    
                    # Check for each required column
                    required_columns = ['interest_id', 'listing_id', 'lender_username', 'renter_username', 'created_at', 'status']
                    missing_columns = [col for col in required_columns if col not in interested_columns]
                    
                    if missing_columns:
                        print(f"Missing columns in interested_listings table: {missing_columns}")
                        # Add missing columns
                        for col in missing_columns:
                            if col == 'interest_id':
                                try:
                                    cur.execute("ALTER TABLE interested_listings ADD COLUMN interest_id SERIAL PRIMARY KEY;")
                                    print("Added interest_id column")
                                except Exception as e:
                                    print(f"Error adding interest_id column: {e}")
                                    conn.rollback()
                            elif col == 'listing_id':
                                try:
                                    cur.execute("ALTER TABLE interested_listings ADD COLUMN listing_id INTEGER REFERENCES storage_listings(listing_id) ON DELETE CASCADE;")
                                    print("Added listing_id column")
                                except Exception as e:
                                    print(f"Error adding listing_id column: {e}")
                                    conn.rollback()
                            elif col == 'lender_username':
                                try:
                                    cur.execute("ALTER TABLE interested_listings ADD COLUMN lender_username VARCHAR(255) NOT NULL;")
                                    print("Added lender_username column")
                                except Exception as e:
                                    print(f"Error adding lender_username column: {e}")
                                    conn.rollback()
                            elif col == 'renter_username':
                                try:
                                    cur.execute("ALTER TABLE interested_listings ADD COLUMN renter_username VARCHAR(255) NOT NULL;")
                                    print("Added renter_username column")
                                except Exception as e:
                                    print(f"Error adding renter_username column: {e}")
                                    conn.rollback()
                            elif col == 'created_at':
                                try:
                                    cur.execute("ALTER TABLE interested_listings ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
                                    print("Added created_at column")
                                except Exception as e:
                                    print(f"Error adding created_at column: {e}")
                                    conn.rollback()
                            elif col == 'status':
                                try:
                                    cur.execute("ALTER TABLE interested_listings ADD COLUMN status VARCHAR(50) DEFAULT 'pending';")
                                    print("Added status column")
                                except Exception as e:
                                    print(f"Error adding status column: {e}")
                                    conn.rollback()
                        conn.commit()
        finally:
            conn.close()
    except Exception as e:
        print(f"Error initializing database: {e}")
        import traceback
        traceback.print_exc()

# Add custom URL rule to serve React files from the build directory
app.add_url_rule(
    "/build/<path:filename>",
    endpoint="build",
    view_func=lambda filename: send_from_directory("build", filename),
)

@app.route('/api/debug-session')
def debug_session():
    """Debug endpoint to check session state and cookies"""
    try:
        # Check what's in the session
        session_data = {k: str(v) for k, v in session.items()}
        # Check if user is authenticated according to our auth module
        is_auth = auth.is_authenticated()
        # Return all the debug information
        return jsonify({
            'session_data': session_data,
            'is_authenticated': is_auth,
            'cookies': {k: v for k, v in request.cookies.items()},
            'headers': {k: v for k, v in request.headers.items()},
            'user_type': session.get('user_type', 'not set')
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'session_exists': 'session' in globals()
        }), 500

# Add route to serve static files from frontend public directory
@app.route('/public/<path:filename>')
def serve_public(filename):
    return send_from_directory('../frontend/public', filename)

def get_asset_path(entry: str) -> str:
    try:
        with open("build/.vite/manifest.json", "r") as f:
            manifest = json.load(f)
            return manifest[f"src/{entry}/main.jsx"]["file"]
    except:
        return f"assets/{entry}.js"

@app.route('/')
def index():
    auth_status = {'authenticated': False}
    if auth.is_authenticated():
        auth_status = {
            'authenticated': True,
            'username': session['user_info']['user']
        }
    asset_path = get_asset_path("main")
    return render_template(
        "index.html",
        app_name="main",
        debug=app.debug,
        asset_path=asset_path,
        auth_status=auth_status
    )

@app.route('/map')
def map():
    auth.authenticate()  # This will redirect to CAS if not authenticated
    asset_path = get_asset_path("main")
    return render_template(
        "index.html",
        app_name="main",
        debug=app.debug,
        asset_path=asset_path
    )

@app.route('/welcome')
def welcome():
    auth.authenticate()  # This will redirect to CAS if not authenticated
    asset_path = get_asset_path("main")
    return render_template(
        "index.html",
        app_name="main",
        debug=app.debug,
        asset_path=asset_path
    )

@app.route('/api/auth/login')
def login():
    try:
        # Get the user type from the query parameter
        user_type = request.args.get('userType')
        redirect_uri = request.args.get('redirectUri')
        
        # Store the user type in the session for later retrieval
        if user_type:
            session['user_type'] = user_type
            session.permanent = True  # Ensure session cookie is persistent and sent cross-origin
            print(f"Stored user_type in session: {user_type}")
            
        # Determine the frontend URL based on request origin or environment variable
        frontend_url = os.environ.get('FRONTEND_URL')
        
        # If FRONTEND_URL is not set, try to determine it from the request origin
        if not frontend_url:
            # Get the origin (scheme + host + port) from where the request came
            origin = request.headers.get('Origin')
            if origin:
                frontend_url = origin
            else:
                # Default to localhost:5173 if we can't determine the origin
                frontend_url = 'http://localhost:5173'
        
        # Remove trailing slash if present
        frontend_url = frontend_url.rstrip('/')
        
        print(f"Redirecting to frontend URL: {frontend_url}")
        
        # Authenticate the user
        user_info = auth.authenticate()
        
        # Store the full CAS user_info dict in the session if available
        if isinstance(user_info, dict):
            session['user_info'] = user_info
        elif user_info:
            session['user_info'] = {'user': user_info}
        
        # At this point, the user should be authenticated and have a session
        # Get the user type from the session if it exists
        user_type = session.get('user_type', user_type)
        
        # Determine username for debug logging
        if isinstance(user_info, dict):
            username = user_info.get('user', 'unknown')
        else:
            username = user_info if user_info else 'unknown'
        # Log the session data to help with debugging
        print(f"Session after auth: {session}")
        print(f"Authenticated as: {username}")
        print(f"User type: {user_type}")
        
        # Redirect to the appropriate dashboard based on user type
        if redirect_uri:
            # Use the provided redirect URI if available
            return redirect(redirect_uri)
        elif user_type == 'renter':
            return redirect(f"{frontend_url}/map")
        elif user_type == 'lender':
            return redirect(f"{frontend_url}/lender-dashboard")
        else:
            return redirect(frontend_url)
    except Exception as e:
        if hasattr(e, 'response') and e.response.status_code == 302:
            # This is the CAS redirect
            # Preserve the user type in the redirect
            user_type = request.args.get('userType')
            if user_type:
                session['user_type'] = user_type
                
            redirect_url = e.response.location
            if user_type and '?' not in redirect_url:
                redirect_url += f'?userType={user_type}'
            elif user_type:
                redirect_url += f'&userType={user_type}'
            return redirect(redirect_url)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/auth/logout')
def logout():
    return redirect('/api/logoutcas')

@app.route('/api/auth/status')
def auth_status():
    # Add CORS headers for this critical endpoint
    response_headers = {
        'Access-Control-Allow-Origin': request.headers.get('Origin', '*'),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Pragma, Cache-Control, Origin, Accept, X-CSRFToken, X-Session-Id, X-Auth-Token, X-User-Type, X-Username',
        'Access-Control-Expose-Headers': 'Content-Type, Authorization, X-Requested-With, Pragma, Cache-Control, Origin, Accept, X-CSRFToken, X-Session-Id, X-Auth-Token, X-User-Type, X-Username'
    }
    
    if auth.is_authenticated():
        # Add debug information to help troubleshoot
        print("User is authenticated. Session info:", session.get('user_info', {}))
        user_info = session.get('user_info', {})
        user_type = session.get('user_type', 'unknown')
        
        response = jsonify({
            'authenticated': True,
            'username': user_info.get('user', ''),
            'userType': user_type,
            'session_id': session.get('_id', 'unknown')
        })
        
        # Add CORS headers
        for key, value in response_headers.items():
            response.headers[key] = value
            
        return response
    
    print("User is not authenticated")
    response = jsonify({
        'authenticated': False
    })
    
    # Add CORS headers
    for key, value in response_headers.items():
        response.headers[key] = value
        
    return response

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Generate unique filename to prevent collisions
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        # Return relative URL for the uploaded file
        return jsonify({'url': f'/uploads/{unique_filename}'}), 200
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Database connection function to handle reconnection
def get_db_connection():
    """Get a fresh database connection"""
    try:
        # Print the database URL (with password masked) for debugging
        db_url = os.environ.get("DATABASE_URL", "")
        masked_url = db_url.replace(db_url.split('@')[0].split(':', 2)[2], '****') if '@' in db_url and ':' in db_url else "No DATABASE_URL found"
        print(f"Connecting to database: {masked_url}")
        
        conn = psycopg2.connect(db_url)
        print("Database connection successful")
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# Custom JSON encoder to handle Decimal values
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

app.json_encoder = CustomJSONEncoder

# API to create a new listing
@app.route('/api/listings', methods=['POST'])
def create_listing():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['location', 'cost', 'description', 'latitude', 'longitude', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
                
        # Special check for cubic feet (handle both cubicFeet and cubic_feet)
        if 'cubicFeet' not in data and 'cubic_feet' not in data:
            return jsonify({"error": "Missing required field: cubic feet"}), 400

        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            # Convert data to correct types
            cost = float(data['cost']) if data['cost'] else 0
            
            # Handle both cubicFeet and cubic_feet field names
            if 'cubicFeet' in data:
                total_sq_ft = int(data['cubicFeet']) if data['cubicFeet'] else 0
            elif 'cubic_feet' in data:
                total_sq_ft = int(data['cubic_feet']) if data['cubic_feet'] else 0
            else:
                total_sq_ft = 0
                
            latitude = float(data['latitude'])
            longitude = float(data['longitude'])
            start_date = data['start_date']  # Already in ISO format from frontend
            end_date = data['end_date']      # Already in ISO format from frontend
            image_url = data.get('image_url', '')  # Get image URL if provided
            
            with conn.cursor() as cur:
                # Prepare column values
                column_values = {
                    'location': data['location'],
                    'cubic_ft': total_sq_ft,
                    'cost': cost,
                    'start_date': start_date,
                    'end_date': end_date,
                    'latitude': latitude,
                    'longitude': longitude,
                    'description': data['description'],
                    'image_url': image_url,
                    'remaining_volume': total_sq_ft  # Set remaining_volume to cubic_ft on creation
                }
                
                # Add address if provided
                if 'address' in data:
                    column_values['address'] = data['address']
                
                # Associate the listing with the current user (lender)
                if auth.is_authenticated():
                    user_info = session['user_info']
                    column_values['owner_id'] = user_info.get('user', 'unknown')
                    print(f"Setting owner_id to {user_info.get('user', 'unknown')}")
                
                # Build the SQL query dynamically
                columns_str = ', '.join(column_values.keys())
                placeholders = ', '.join(['%s'] * len(column_values))
                
                query = f"""INSERT INTO storage_listings ({columns_str}) 
                         VALUES ({placeholders}) RETURNING listing_id;"""
                
                try:
                    cur.execute(query, list(column_values.values()))
                    listing_id = cur.fetchone()[0]
                    conn.commit()
                    print(f"Successfully created listing with ID: {listing_id}")
                except Exception as e:
                    conn.rollback()  # Roll back on error
                    print(f"Error executing insert query: {e}")
                    raise  # Re-raise the exception to be caught by the outer try/except
                
                return jsonify({
                    "success": True,
                    "listing_id": listing_id
                }), 201
        finally:
            conn.close()

    except Exception as e:
        print("Error creating listing:", str(e))
        import traceback
        traceback.print_exc()
        
        # Check for specific PostgreSQL errors
        if "current transaction is aborted" in str(e):
            error_message = "Database error: The operation could not be completed. Please try again."
        else:
            error_message = str(e)
            
        return jsonify({"error": error_message}), 500

# API to get all listings
@app.route('/api/listings', methods=['GET'])
def get_listings():
    try:
        print("Received request for /api/listings")
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            print("Database connection failed")
            return jsonify({"error": "Database connection failed"}), 500
        try:
            with conn.cursor() as cur:
                # First check if the storage_listings table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'storage_listings'
                    );
                """)
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    # Create the table if it doesn't exist
                    print("Creating storage_listings table")
                    cur.execute("""
                        CREATE TABLE storage_listings (
                            listing_id SERIAL PRIMARY KEY,
                            location VARCHAR(255) NOT NULL,
                            address VARCHAR(255),
                            cost NUMERIC,
                            cubic_ft INTEGER,
                            description TEXT,
                            latitude FLOAT,
                            longitude FLOAT,
                            start_date DATE,
                            end_date DATE,
                            image_url VARCHAR(255),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            owner_id VARCHAR(255)
                        );
                    """)
                    conn.commit()
                
                # First, make sure any previous failed transaction is rolled back
                conn.rollback()
                
                # Get the actual column names from the table to ensure we query correctly
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns 
                    WHERE table_name = 'storage_listings' 
                    ORDER BY ordinal_position;
                """)
                columns = [column[0] for column in cur.fetchall()]
                
                # Build the query dynamically based on available columns
                select_parts = []
                essential_columns = ['listing_id', 'location', 'cost', 'cubic_ft', 'description', 
                                     'created_at', 'owner_id']
                
                # Add all essential columns that exist
                for col in essential_columns:
                    if col in columns:
                        select_parts.append(col)
                
                # Add optional columns if they exist
                optional_columns = ['latitude', 'longitude', 'start_date', 'end_date', 'image_url', 'address']
                for col in optional_columns:
                    if col in columns:
                        select_parts.append(col)
                
                # Create the SELECT statement
                select_columns = ", ".join(select_parts)
                
                query = f"""
                    SELECT {select_columns}
                    FROM storage_listings
                    ORDER BY created_at DESC;
                """
                
                print(f"Executing query: {query}")
                cur.execute(query)
                
                listings = cur.fetchall()
                print(f"Found {len(listings)} listings")
                
                # Get column names from cursor description
                column_names = [desc[0] for desc in cur.description]
                
                # Convert to list of dictionaries
                formatted_listings = []
                for listing in listings:
                    try:
                        listing_dict = {}
                        for i, col_name in enumerate(column_names):
                            listing_dict[col_name] = listing[i]
                        
                        # If no latitude/longitude, set default values for Princeton with random offsets
                        if not listing_dict.get('latitude') or not listing_dict.get('longitude'):
                            print(f"Setting default location for listing {listing_dict.get('listing_id')}")
                            # Princeton coordinates plus small random offset
                            import random
                            princeton_lat = 40.3437
                            princeton_lng = -74.6517
                            lat_offset = random.uniform(-0.005, 0.005)
                            lng_offset = random.uniform(-0.005, 0.005)
                            listing_dict['latitude'] = princeton_lat + lat_offset
                            listing_dict['longitude'] = princeton_lng + lng_offset
                        
                        formatted_listing = {
                            "id": listing_dict.get('listing_id'),
                            "location": listing_dict.get('location', ''),
                            "address": listing_dict.get('address', ''),
                            "cost": float(listing_dict.get('cost', 0)) if listing_dict.get('cost') is not None else 0,
                            "cubic_feet": listing_dict.get('cubic_ft', 0),
                            "description": listing_dict.get('description', ''),
                            "latitude": float(listing_dict.get('latitude', 0)) if listing_dict.get('latitude') is not None else None,
                            "longitude": float(listing_dict.get('longitude', 0)) if listing_dict.get('longitude') is not None else None,
                            "start_date": listing_dict.get('start_date').isoformat() if listing_dict.get('start_date') else None,
                            "end_date": listing_dict.get('end_date').isoformat() if listing_dict.get('end_date') else None,
                            "image_url": listing_dict.get('image_url', '/assets/placeholder.jpg'),
                            "created_at": listing_dict.get('created_at').isoformat() if listing_dict.get('created_at') else None,
                            "owner_id": listing_dict.get('owner_id', '')
                        }

                        # Ensure latitude and longitude have values for map display
                        if formatted_listing["latitude"] is None or formatted_listing["longitude"] is None:
                            # Princeton coordinates plus small random offset
                            import random
                            princeton_lat = 40.3437
                            princeton_lng = -74.6517
                            lat_offset = random.uniform(-0.005, 0.005)
                            lng_offset = random.uniform(-0.005, 0.005)
                            formatted_listing["latitude"] = princeton_lat + lat_offset
                            formatted_listing["longitude"] = princeton_lng + lng_offset
                            print(f"Set default lat/lng for listing {formatted_listing['id']}: {formatted_listing['latitude']}, {formatted_listing['longitude']}")
                        
                        formatted_listings.append(formatted_listing)
                    except Exception as e:
                        print(f"DEBUG: Error formatting listing: {e}")
                        print(f"DEBUG: Listing data: {listing}")
                        continue
                
                print(f"Returning {len(formatted_listings)} formatted listings")
                return jsonify(formatted_listings), 200
        finally:
            conn.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/rentals/current', methods=['GET'])
def get_current_rentals():
    try:
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        # Implement real DB logic here or return 404 if not implemented
        return jsonify({"error": "Not implemented"}), 404
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Failed to fetch current rentals"}), 500

@app.route('/api/rentals/history', methods=['GET'])
def get_rental_history():
    try:
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        # Implement real DB logic here or return 404 if not implemented
        return jsonify({"error": "Not implemented"}), 404
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Failed to fetch rental history"}), 500

# API to get a specific listing by ID
@app.route('/api/listings/<int:listing_id>', methods=['GET'])
def get_listing_by_id(listing_id):
    try:
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        try:
            with conn.cursor() as cur:
                # Check if the table exists
                cur.execute("""SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'storage_listings'
                )""")
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    # Return mock data instead
                    return get_mock_listing(listing_id)
                
                # Try to find the listing in the database
                # First get the available columns
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'storage_listings' 
                    ORDER BY ordinal_position;
                """)
                columns = [col[0] for col in cur.fetchall()]
                print(f"Available columns: {columns}")
                
                # Build a dynamic SELECT statement
                select_clause = "*"  # Use * since we're fetching a single row
                
                # Only use listing_id as that's the column name in the database
                cur.execute(f"SELECT {select_clause} FROM storage_listings WHERE listing_id = %s;", (listing_id,))
                listing = cur.fetchone()
                
                if not listing:
                    # If no listing found with that ID, check in the mock data
                    if listing_id in [101, 102, 103]:
                        # Return mock data for these IDs
                        return get_mock_listing(listing_id)
                    else:
                        # If no listing found with that ID, return 404
                        return jsonify({"error": "Listing not found"}), 404
                
                # Get column names from cursor description
                column_names = [desc[0] for desc in cur.description]
                
                # Convert data to dictionary
                listing_dict = {}
                for i, col_name in enumerate(column_names):
                    listing_dict[col_name] = listing[i]
                
                # Map to frontend expected format
                formatted_listing = {
                    "id": listing_id,  # Use the requested listing_id for consistency
                    "listing_id": listing_dict.get('listing_id'),  # Also include the original listing_id
                    "location": listing_dict.get('location', ''),
                    "address": listing_dict.get('address', ''),
                    "cost": listing_dict.get('cost', 0),
                    "cubic_feet": listing_dict.get('cubic_ft', 0),
                    "description": listing_dict.get('description') or "Storage space available at " + listing_dict.get('location', ''),
                    "is_available": listing_dict.get('is_available', True),
                    "created_at": listing_dict.get('created_at', "2025-04-01"),
                    "contract_length_months": listing_dict.get('contract_length_months', 12),
                    "owner_id": listing_dict.get('owner_id', 1000),
                    "latitude": listing_dict.get('latitude'),
                    "longitude": listing_dict.get('longitude'),
                    "image_url": listing_dict.get('image_url', '/assets/placeholder.jpg')
                }
                
                return jsonify(formatted_listing), 200
        finally:
            conn.close()
    except Exception as e:
        print("Error fetching listing by ID:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch listing: " + str(e)}), 500

# API to get listings by owner (for lender dashboard)
@app.route('/api/my-listings', methods=['GET'])
def get_my_listings():
    try:
        print("Received request for /api/my-listings")
        # Check if user is authenticated
        authenticated = auth.is_authenticated()
        
        # Get the owner ID from different possible sources
        owner_id = None
        
        if authenticated:
            # Get from session if authenticated
            print("User authenticated via session")
            user_info = session.get('user_info', {})
            owner_id = user_info.get('user', '').lower()
            print(f"Authenticated username from session: {owner_id}")
        else:
            # If not authenticated via session, check headers
            print("User not authenticated via session, checking headers")
            username_header = request.headers.get('X-Username')
            user_type_header = request.headers.get('X-User-Type')
            
            if username_header:
                owner_id = username_header.lower()
                print(f"Using username from X-Username header: {owner_id}")
            elif user_type_header == 'lender':
                # If user type header indicates lender, use it as fallback
                owner_id = 'lender'
                print(f"Using default owner_id 'lender' from X-User-Type header")
            else:
                # No authentication found
                print("No authentication found in session or headers")
                # Add CORS headers to error response
                response = jsonify({"error": "Not authenticated"})
                response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                return response, 401
        
        if not owner_id:
            print("Owner ID not found in session or headers")
            return jsonify({"error": "User ID not found"}), 400
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            print("Database connection failed")
            # In dev mode, return mock data if DB connection fails
            is_dev = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEBUG') == 'true'
            if is_dev:
                mock_listings = [
                    {
                        "id": 101,
                        "location": "Butler College Storage",
                        "cost": 65,
                        "cubic_feet": 90,
                        "description": "Secure storage space near Butler College.",
                        "created_at": "2023-05-01T10:00:00",
                        "latitude": 40.344,
                        "longitude": -74.656
                    },
                    {
                        "id": 102,
                        "location": "Whitman College Basement",
                        "cost": 55,
                        "cubic_feet": 75,
                        "description": "Climate-controlled storage in basement.",
                        "created_at": "2023-05-05T14:30:00",
                        "latitude": 40.343,
                        "longitude": -74.657
                    }
                ]
                print("Returning mock data for development")
                return jsonify(mock_listings), 200
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # First check if the storage_listings table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'storage_listings'
                    );
                """)
                table_exists = cur.fetchone()[0]
                print("storage_listings table exists:", table_exists)
                
                if not table_exists:
                    # Create the table if it doesn't exist
                    print("Creating storage_listings table")
                    cur.execute("""
                        CREATE TABLE storage_listings (
                            listing_id SERIAL PRIMARY KEY,
                            location VARCHAR(255) NOT NULL,
                            address VARCHAR(255),
                            cost NUMERIC,
                            cubic_ft INTEGER,
                            description TEXT,
                            latitude FLOAT,
                            longitude FLOAT,
                            start_date DATE,
                            end_date DATE,
                            image_url VARCHAR(255),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            owner_id VARCHAR(255)
                        );
                    """)
                    conn.commit()
                
                # Get listings by owner_id
                print("Executing query to get listings for owner_id:", owner_id)
                
                # First, make sure any previous failed transaction is rolled back
                conn.rollback()
                
                # Get the actual column names from the table to ensure we query correctly
                cur.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns 
                    WHERE table_name = 'storage_listings' 
                    ORDER BY ordinal_position;
                """)
                column_info = cur.fetchall()
                columns = [col[0] for col in column_info]
                data_types = {col[0]: col[1] for col in column_info}
                
                print(f"Available columns with data types: {data_types}")
                
                # Check owner_id data type to handle possible type mismatch
                owner_id_type = data_types.get('owner_id', 'varchar').lower()
                print(f"Owner ID data type: {owner_id_type}")
                
                # Build the query dynamically based on available columns
                select_parts = []
                essential_columns = ['listing_id', 'location', 'cost', 'cubic_ft', 'description', 
                                    'created_at', 'owner_id']
                
                # Add all essential columns that exist
                for col in essential_columns:
                    if col in columns:
                        select_parts.append(col)
                
                # Add optional columns if they exist
                optional_columns = ['latitude', 'longitude', 'start_date', 'end_date', 'image_url', 'address']
                for col in optional_columns:
                    if col in columns:
                        select_parts.append(col)
                
                # Create the SELECT statement
                select_columns = ", ".join(select_parts)
                
                try:
                    # Handle owner_id type conversion based on database type
                    query = ""
                    if 'int' in owner_id_type:
                        # If owner_id is an integer type in the database
                        try:
                            # Try to convert owner_id to integer
                            owner_id_int = int(owner_id)
                            query = f"""
                                SELECT {select_columns}
                                FROM storage_listings
                                WHERE owner_id = %s
                                ORDER BY created_at DESC;
                            """
                            print(f"Using integer owner_id for query: {owner_id_int}")
                            cur.execute(query, (owner_id_int,))
                        except ValueError:
                            # If conversion fails, return mock data for development or an empty list
                            print(f"Cannot convert owner_id '{owner_id}' to integer, returning mock/empty data")
                            if os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEBUG') == 'true':
                                mock_listings = [
                                    {
                                        "id": 101,
                                        "location": "Butler College Storage",
                                        "cost": 65,
                                        "cubic_feet": 90,
                                        "description": "Secure storage space near Butler College.",
                                        "created_at": "2023-05-01T10:00:00",
                                        "latitude": 40.344,
                                        "longitude": -74.656,
                                        "owner_id": owner_id
                                    }
                                ]
                                return jsonify(mock_listings), 200
                            else:
                                return jsonify([]), 200
                    else:
                        # If owner_id is a string type in the database
                        query = f"""
                            SELECT {select_columns}
                            FROM storage_listings
                            WHERE LOWER(owner_id) = %s
                            ORDER BY created_at DESC;
                        """
                        print(f"Using string owner_id for query: {owner_id}")
                        cur.execute(query, (str(owner_id).lower(),))
                    
                    listings = cur.fetchall()
                    print(f"Found {len(listings)} listings for owner_id: {owner_id}")
                    
                    # Get column names from cursor description
                    column_names = [desc[0] for desc in cur.description]
                    print(f"Query returned columns: {column_names}")
                    
                    # Convert to list of dictionaries
                    formatted_listings = []
                    for listing in listings:
                        try:
                            listing_dict = {}
                            for i, col_name in enumerate(column_names):
                                listing_dict[col_name] = listing[i]
                            
                            # If no latitude/longitude, set default values for Princeton
                            if not listing_dict.get('latitude') or not listing_dict.get('longitude'):
                                print(f"Setting default location for listing {listing_dict.get('listing_id')}")
                                # Princeton coordinates plus small random offset
                                import random
                                princeton_lat = 40.3437
                                princeton_lng = -74.6517
                                lat_offset = random.uniform(-0.005, 0.005)
                                lng_offset = random.uniform(-0.005, 0.005)
                                listing_dict['latitude'] = princeton_lat + lat_offset
                                listing_dict['longitude'] = princeton_lng + lng_offset
                            
                            formatted_listing = {
                                "id": listing_dict.get('listing_id'),
                                "location": listing_dict.get('location', ''),
                                "address": listing_dict.get('address', ''),
                                "cost": float(listing_dict.get('cost', 0)) if listing_dict.get('cost') is not None else 0,
                                "cubic_feet": listing_dict.get('cubic_ft', 0),
                                "description": listing_dict.get('description', ''),
                                "latitude": float(listing_dict.get('latitude', 0)) if listing_dict.get('latitude') is not None else None,
                                "longitude": float(listing_dict.get('longitude', 0)) if listing_dict.get('longitude') is not None else None, 
                                "start_date": listing_dict.get('start_date').isoformat() if listing_dict.get('start_date') else None,
                                "end_date": listing_dict.get('end_date').isoformat() if listing_dict.get('end_date') else None,
                                "image_url": listing_dict.get('image_url', '/assets/placeholder.jpg'),
                                "created_at": listing_dict.get('created_at').isoformat() if listing_dict.get('created_at') else None,
                                "owner_id": listing_dict.get('owner_id', '')
                            }
                            formatted_listings.append(formatted_listing)
                        except Exception as e:
                            print(f"DEBUG: Error formatting listing: {e}")
                            print(f"DEBUG: Listing data: {listing}")
                            continue
                    
                    # Add CORS headers to the response
                    response = jsonify(formatted_listings)
                    response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    
                    print(f"Returning {len(formatted_listings)} formatted listings")
                    return response, 200
                except Exception as e:
                    print(f"Error executing query: {e}")
                    conn.rollback()
                    raise
        finally:
            conn.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# API to update a listing
@app.route('/api/listings/<int:listing_id>', methods=['PUT'])
def update_listing(listing_id):
    try:
        # Check authentication from different possible sources
        authenticated = auth.is_authenticated()
        owner_id = None
        
        if authenticated:
            # Get from session if authenticated
            print("User authenticated via session for update")
            user_info = session.get('user_info', {})
            owner_id = user_info.get('user', '').lower()
            print(f"Authenticated username from session: {owner_id}")
        else:
            # If not authenticated via session, check headers
            print("User not authenticated via session, checking headers for update")
            username_header = request.headers.get('X-Username')
            user_type_header = request.headers.get('X-User-Type')
            
            if username_header:
                owner_id = username_header.lower()
                print(f"Using username from X-Username header for listing update: {owner_id}")
            else:
                # No authentication found
                print("No authentication found in session or headers")
                return jsonify({"error": "Not authenticated"}), 401
        
        if not owner_id:
            print("Owner ID not found in session or headers")
            return jsonify({"error": "User ID not found"}), 400
        
        # Get the updated data
        data = request.get_json()
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # First verify that the listing belongs to the current user
                print(f"Checking if listing {listing_id} belongs to {owner_id} for update")
                cur.execute("SELECT owner_id FROM storage_listings WHERE listing_id = %s", (listing_id,))
                listing = cur.fetchone()
                
                if not listing:
                    print(f"Listing {listing_id} not found for update")
                    return jsonify({"error": "Listing not found"}), 404
                    
                # Check if the current user is the owner
                db_owner_id = listing[0]
                print(f"Listing owner is: {db_owner_id}, update request from: {owner_id}")
                if db_owner_id != owner_id:
                    print(f"Permission denied: {owner_id} is not owner of listing {listing_id}")
                    return jsonify({"error": "You don't have permission to update this listing"}), 403
                
                # Prepare update data
                update_values = {}
                
                # Only update fields that are provided
                if 'location' in data:
                    update_values['location'] = data['location']
                if 'cost' in data:
                    update_values['cost'] = float(data['cost'])
                if 'cubicFeet' in data:
                    update_values['cubic_ft'] = int(data['cubicFeet'])
                if 'description' in data:
                    update_values['description'] = data['description']
                if 'latitude' in data:
                    update_values['latitude'] = float(data['latitude'])
                if 'longitude' in data:
                    update_values['longitude'] = float(data['longitude'])
                if 'start_date' in data:
                    update_values['start_date'] = data['start_date']
                if 'end_date' in data:
                    update_values['end_date'] = data['end_date']
                if 'image_url' in data:
                    update_values['image_url'] = data['image_url']
                
                if not update_values:
                    return jsonify({"error": "No valid fields to update"}), 400
                
                # Build the SQL update query
                set_clause = ", ".join([f"{key} = %s" for key in update_values.keys()])
                query = f"UPDATE storage_listings SET {set_clause} WHERE listing_id = %s"
                
                # Execute the update
                cur.execute(query, list(update_values.values()) + [listing_id])
                conn.commit()
                print(f"Listing {listing_id} updated successfully")
                
                return jsonify({"success": True, "message": "Listing updated successfully"}), 200
        finally:
            conn.close()
    except Exception as e:
        print("Error updating listing:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# API to delete a listing
@app.route('/api/listings/<int:listing_id>', methods=['DELETE'])
def delete_listing(listing_id):
    try:
        # Check authentication from different possible sources
        authenticated = auth.is_authenticated()
        owner_id = None
        
        if authenticated:
            # Get from session if authenticated
            print("User authenticated via session")
            user_info = session.get('user_info', {})
            owner_id = user_info.get('user', '').lower()
            print(f"Authenticated username from session: {owner_id}")
        else:
            # If not authenticated via session, check headers
            print("User not authenticated via session, checking headers")
            username_header = request.headers.get('X-Username')
            user_type_header = request.headers.get('X-User-Type')
            
            if username_header:
                owner_id = username_header.lower()
                print(f"Using username from X-Username header for listing deletion: {owner_id}")
            else:
                # No authentication found
                print("No authentication found in session or headers")
                return jsonify({"error": "Not authenticated"}), 401
        
        if not owner_id:
            print("Owner ID not found in session or headers")
            return jsonify({"error": "User ID not found"}), 400
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # First verify that the listing belongs to the current user
                print(f"Checking if listing {listing_id} belongs to {owner_id}")
                cur.execute("SELECT owner_id FROM storage_listings WHERE listing_id = %s", (listing_id,))
                listing = cur.fetchone()
                
                if not listing:
                    print(f"Listing {listing_id} not found")
                    return jsonify({"error": "Listing not found"}), 404
                    
                # Check if the current user is the owner
                db_owner_id = listing[0]
                print(f"Listing owner is: {db_owner_id}, request from: {owner_id}")
                if db_owner_id != owner_id:
                    print(f"Permission denied: {owner_id} is not owner of listing {listing_id}")
                    return jsonify({"error": "You don't have permission to delete this listing"}), 403
                
                # Delete the listing
                print(f"Deleting listing {listing_id}")
                cur.execute("DELETE FROM storage_listings WHERE listing_id = %s", (listing_id,))
                conn.commit()
                print(f"Listing {listing_id} deleted successfully")
                
                return jsonify({"success": True, "message": "Listing deleted successfully"}), 200
        except Exception as e:
            conn.rollback()
            print("Database error while deleting listing:", str(e))
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        finally:
            conn.close()
    except Exception as e:
        print("Error deleting listing:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# API to handle interest in a listing
@app.route('/api/listings/<int:listing_id>/interest', methods=['POST', 'DELETE', 'OPTIONS'])
def handle_interest(listing_id):
    # Handle OPTIONS requests for CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
        response.headers['Access-Control-Allow-Methods'] = 'POST, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-User-Type, X-Username, Accept, Cache-Control'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '3600'  # Cache preflight request for 1 hour
        return response, 200
        
    try:
        print(f"Received interest request for listing {listing_id}")
        # Check if user is logged in
        authenticated = auth.is_authenticated()
        renter_username = None
        
        if authenticated:
            # Get from session if authenticated
            print("User authenticated via session")
            user_info = session['user_info']
            renter_username = user_info.get('user', '').lower()
            print(f"Authenticated username from session: {renter_username}")
        else:
            # If not authenticated via session, check headers
            print("User not authenticated via session, checking headers")
            username_header = request.headers.get('X-Username')
            user_type_header = request.headers.get('X-User-Type')
            
            if username_header:
                renter_username = username_header.lower()
                print(f"Using username from X-Username header: {renter_username}")
            else:
                # No authentication found
                print("No authentication found in session or headers")
                return jsonify({"error": "Not authenticated"}), 401
        
        if not renter_username:
            print("Renter username not found in session or headers")
            return jsonify({"error": "User not found"}), 400
            
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            print("Failed to get database connection")
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # First get the listing to get the lender's username
                print(f"Fetching listing {listing_id} to get lender info")
                cur.execute("""
                    SELECT owner_id FROM storage_listings 
                    WHERE listing_id = %s
                """, (listing_id,))
                
                listing = cur.fetchone()
                if not listing:
                    print(f"Listing {listing_id} not found")
                    return jsonify({"error": "Listing not found"}), 404
                    
                lender_username = listing[0]
                if not lender_username:
                    print(f"Listing {listing_id} has no owner")
                    return jsonify({"error": "This listing is not available for interest as it has no owner"}), 400
                    
                print(f"Found lender username: {lender_username}")
                
                if request.method == 'POST':
                    # Check if the user has already shown interest
                    print(f"Checking if user {renter_username} has already shown interest in listing {listing_id}")
                    cur.execute("""
                        SELECT interest_id FROM interested_listings 
                        WHERE listing_id = %s AND renter_username = %s
                    """, (listing_id, renter_username))
                    
                    existing_interest = cur.fetchone()
                    if existing_interest:
                        print(f"User {renter_username} has already shown interest in listing {listing_id}")
                        return jsonify({"error": "You have already shown interest in this listing"}), 400
                    
                    # Check if interested_listings table exists
                    cur.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = 'interested_listings'
                        );
                    """)
                    table_exists = cur.fetchone()[0]
                    
                    if not table_exists:
                        print("Creating interested_listings table")
                        cur.execute("""
                            CREATE TABLE interested_listings (
                                interest_id SERIAL PRIMARY KEY,
                                listing_id INTEGER REFERENCES storage_listings(listing_id) ON DELETE CASCADE,
                                lender_username VARCHAR(255) NOT NULL,
                                renter_username VARCHAR(255) NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                status VARCHAR(50) DEFAULT 'pending',
                                UNIQUE(listing_id, renter_username)
                            );
                        """)
                        conn.commit()
                        print("interested_listings table created successfully")
                    
                    # Show interest in listing
                    print(f"Inserting new interest record for listing {listing_id}, renter {renter_username}, lender {lender_username}")
                    try:
                        cur.execute("""
                            INSERT INTO interested_listings 
                            (listing_id, lender_username, renter_username, status) 
                            VALUES (%s, %s, %s, 'pending')
                        """, (listing_id, lender_username, renter_username))
                        conn.commit()
                        print(f"Interest in listing {listing_id} recorded successfully")
                        
                        # Create response with CORS headers
                        response = jsonify({
                            "success": True,
                            "message": "Interest recorded successfully"
                        })
                        
                        # Add CORS headers with specific origin
                        origin = request.headers.get('Origin')
                        if origin:
                            response.headers['Access-Control-Allow-Origin'] = origin
                        else:
                            response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
                        response.headers['Access-Control-Allow-Methods'] = 'POST, DELETE, OPTIONS'
                        response.headers['Access-Control-Allow-Credentials'] = 'true'
                        
                        return response, 200
                    except Exception as insert_error:
                        print(f"Error adding interest: {insert_error}")
                        conn.rollback()
                        import traceback
                        traceback.print_exc()
                        return jsonify({"error": f"Failed to record interest: {str(insert_error)}"}), 500
                elif request.method == 'DELETE':
                    # Remove interest in listing
                    print(f"Removing interest for listing {listing_id}, renter {renter_username}")
                    cur.execute("""
                        DELETE FROM interested_listings 
                        WHERE listing_id = %s AND renter_username = %s
                    """, (listing_id, renter_username))
                    conn.commit()
                    print(f"Interest in listing {listing_id} removed successfully")
                    
                    # Create response with CORS headers
                    response = jsonify({
                        "success": True,
                        "message": "Interest removed successfully"
                    })
                    
                    # Add CORS headers with specific origin
                    origin = request.headers.get('Origin')
                    if origin:
                        response.headers['Access-Control-Allow-Origin'] = origin
                    else:
                        response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
                    response.headers['Access-Control-Allow-Methods'] = 'POST, DELETE, OPTIONS'
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    
                    return response, 200
        finally:
            conn.close()
    except Exception as e:
        print("Error handling interest:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# API to get interested renters for a listing
@app.route('/api/listings/<int:listing_id>/interested-renters', methods=['GET'])
def get_interested_renters(listing_id):
    try:
        # Check if user is logged in
        if not auth.is_authenticated():
            return jsonify({"error": "Not authenticated"}), 401
            
        # Get user info from session
        user_info = session['user_info']
        owner_id = user_info.get('user', '').lower()
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # Verify that the listing belongs to the current user
                cur.execute("""
                    SELECT owner_id FROM storage_listings 
                    WHERE listing_id = %s
                """, (listing_id,))
                
                listing = cur.fetchone()
                if not listing:
                    return jsonify({"error": "Listing not found"}), 404
                    
                if listing[0] != owner_id:
                    return jsonify({"error": "You don't have permission to view interested renters for this listing"}), 403
                
                # Get interested renters with their details
                cur.execute("""
                    SELECT 
                        il.interest_id,
                        il.renter_username,
                        il.created_at,
                        il.status
                    FROM interested_listings il
                    WHERE il.listing_id = %s
                    ORDER BY il.created_at DESC
                """, (listing_id,))
                
                interested_renters = []
                for row in cur.fetchall():
                    interested_renters.append({
                        "id": row[0],
                        "username": row[1],
                        "dateInterested": row[2].isoformat(),
                        "status": row[3]
                    })
                
                return jsonify(interested_renters), 200
        finally:
            conn.close()
    except Exception as e:
        print("Error getting interested renters:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# API to get a renter's interested listings
@app.route('/api/my-interested-listings', methods=['GET', 'OPTIONS'])
def get_my_interested_listings():
    # Handle OPTIONS requests for CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-User-Type, X-Username, Accept, Cache-Control'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '3600'  # Cache preflight request for 1 hour
        return response, 200
        
    try:
        # Check if user is logged in
        authenticated = auth.is_authenticated()
        renter_username = None
        
        if authenticated:
            # Get from session if authenticated
            print("User authenticated via session")
            user_info = session.get('user_info', {})
            renter_username = user_info.get('user', '').lower()
            print(f"Authenticated username from session: {renter_username}")
        else:
            # If not authenticated via session, check headers
            print("User not authenticated via session, checking headers")
            username_header = request.headers.get('X-Username')
            user_type_header = request.headers.get('X-User-Type')
            
            if username_header:
                renter_username = username_header.lower()
                print(f"Using username from X-Username header: {renter_username}")
            else:
                # No authentication found
                print("No authentication found in session or headers")
                return jsonify({"error": "Not authenticated"}), 401
        
        if not renter_username:
            print("Renter username not found in session or headers")
            return jsonify({"error": "User not found"}), 400
            
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            print("Database connection failed")
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # Check if the interested_listings table exists
                print("Checking if interested_listings table exists")
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'interested_listings'
                    );
                """)
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    print("interested_listings table does not exist, returning empty array")
                    response = jsonify([])
                    # Add CORS headers with specific origin
                    origin = request.headers.get('Origin')
                    if origin:
                        response.headers['Access-Control-Allow-Origin'] = origin
                    else:
                        response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    return response, 200
                    
                # Check if the storage_listings table exists
                print("Checking if storage_listings table exists")
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'storage_listings'
                    );
                """)
                listings_table_exists = cur.fetchone()[0]
                
                if not listings_table_exists:
                    print("storage_listings table does not exist, returning empty array")
                    response = jsonify([])
                    # Add CORS headers with specific origin
                    origin = request.headers.get('Origin')
                    if origin:
                        response.headers['Access-Control-Allow-Origin'] = origin
                    else:
                        response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    return response, 200
                
                # Get interested listings with their details
                print(f"Fetching interested listings for renter: {renter_username}")
                
                try:
                    # Get the actual column names from the table to ensure we query correctly
                    cur.execute("""
                        SELECT column_name
                        FROM information_schema.columns 
                        WHERE table_name = 'interested_listings' 
                        ORDER BY ordinal_position;
                    """)
                    interested_columns = [column[0] for column in cur.fetchall()]
                    print(f"interested_listings columns: {interested_columns}")
                    
                    cur.execute("""
                        SELECT column_name
                        FROM information_schema.columns 
                        WHERE table_name = 'storage_listings' 
                        ORDER BY ordinal_position;
                    """)
                    listing_columns = [column[0] for column in cur.fetchall()]
                    print(f"storage_listings columns: {listing_columns}")
                    
                    # Now we can build a query that is guaranteed to work with the available columns
                    query = """
                        SELECT 
                            il.interest_id,
                            sl.listing_id,
                            sl.location,
                            sl.cost,
                            sl.owner_id as lender,
                            il.created_at,
                            il.status
                        FROM interested_listings il
                        JOIN storage_listings sl ON il.listing_id = sl.listing_id
                        WHERE il.renter_username = %s
                        ORDER BY il.created_at DESC
                    """
                    print(f"Executing query: {query}")
                    cur.execute(query, (renter_username,))
                    
                    interested_listings = []
                    rows = cur.fetchall()
                    print(f"Query returned {len(rows)} rows")
                    
                    for row in rows:
                        interested_listings.append({
                            "id": row[1],  # listing_id
                            "title": row[2],
                            "address": row[3],
                            "lender": row[4],
                            "dateInterested": row[5].isoformat(),
                            "status": row[6],
                            "nextStep": "Waiting for lender response" if row[6] == 'pending' else "In Discussion"
                        })
                    
                    print(f"Found {len(interested_listings)} interested listings for user {renter_username}")
                    
                    # Create response with CORS headers
                    response = jsonify(interested_listings)
                    # Add CORS headers with specific origin
                    origin = request.headers.get('Origin')
                    if origin:
                        response.headers['Access-Control-Allow-Origin'] = origin
                    else:
                        response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    
                    return response, 200
                except Exception as query_error:
                    print(f"SQL error during query: {query_error}")
                    import traceback
                    traceback.print_exc()
                    
                    # Return empty list instead of error if tables exist but join fails
                    response = jsonify([])
                    # Add CORS headers with specific origin
                    origin = request.headers.get('Origin')
                    if origin:
                        response.headers['Access-Control-Allow-Origin'] = origin
                    else:
                        response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    return response, 200
        finally:
            conn.close()
    except Exception as e:
        print("Error getting interested listings:", str(e))
        import traceback
        traceback.print_exc()
        
        # Even in error case, add CORS headers
        response = jsonify({"error": str(e)})
        # Add CORS headers with specific origin
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = 'https://tigerstorage-frontend.onrender.com'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 500

# API to get listings by username (emergency workaround for cross-domain cookie issues)
@app.route('/api/listings/by-username/<username>', methods=['GET'])
def get_listings_by_username(username):
    try:
        print(f"Received request for listings by username: {username}")
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            print("Database connection failed")
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                print(f"Fetching listings for username: {username}")
                
                # Get listings by owner_id
                cur.execute("""
                    SELECT listing_id, location, cost, cubic_ft, description, latitude, longitude,
                           start_date, end_date, image_url, created_at, owner_id
                    FROM storage_listings
                    WHERE LOWER(owner_id) = %s
                    ORDER BY created_at DESC;
                """, (username.lower(),))
                
                listings = cur.fetchall()
                print(f"Found {len(listings)} listings for {username}")
                
                # Get column names from cursor description
                column_names = [desc[0] for desc in cur.description]
                
                # Convert to list of dictionaries
                formatted_listings = []
                for listing in listings:
                    try:
                        formatted_listing = {
                            "id": listing[0],
                            "title": listing[1],
                            "address": listing[2],
                            "cost": float(listing[3]) if listing[3] is not None else 0,
                            "cubic_feet": listing[4] if listing[4] is not None else 0,
                            "description": listing[5] if listing[5] is not None else "",
                            "latitude": float(listing[6]) if listing[6] is not None else None,
                            "longitude": float(listing[7]) if listing[7] is not None else None,
                            "start_date": listing[8].isoformat() if listing[8] else None,
                            "end_date": listing[9].isoformat() if listing[9] else None,
                            "image_url": listing[10] if listing[10] is not None else "/assets/placeholder.jpg",
                            "created_at": listing[11].isoformat() if listing[11] else None,
                            "owner_id": listing[12] if listing[12] is not None else "unknown"
                        }
                        formatted_listings.append(formatted_listing)
                    except Exception as e:
                        print(f"Error formatting listing: {e}")
                        continue
                
                # If no listings found, return a default empty array
                if not formatted_listings:
                    print("No listings found, returning empty array")
                
                # Add CORS headers to allow cross-domain access
                response = jsonify(formatted_listings)
                response.headers['Access-Control-Allow-Origin'] = '*'
                response.headers['Access-Control-Allow-Methods'] = 'GET'
                
                return response, 200
        finally:
            conn.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Initialize database on startup
init_db()

# --- RESERVATION REQUEST ENDPOINTS ---

# 1. Renter requests a reservation for a specific volume
@app.route('/api/listings/<int:listing_id>/reserve', methods=['POST'])
def reserve_space(listing_id):
    try:
        authenticated = auth.is_authenticated()
        renter_username = None
        if authenticated:
            user_info = session.get('user_info', {})
            renter_username = user_info.get('user', '').lower()
        else:
            renter_username = request.headers.get('X-Username', '').lower()
        if not renter_username:
            return jsonify({'error': 'Not authenticated'}), 401
        data = request.get_json()
        requested_volume = float(data.get('requested_volume', 0))
        if requested_volume <= 0:
            return jsonify({'error': 'Requested volume must be positive'}), 400
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Duplicate check: does a pending request already exist for this renter and listing?
                cur.execute("""
                    SELECT 1 FROM reservation_requests
                    WHERE listing_id = %s AND renter_username = %s AND status = 'pending'
                    LIMIT 1
                """, (listing_id, renter_username))
                if cur.fetchone():
                    return jsonify({'error': 'You already have a pending reservation request for this listing.'}), 400
                # Get listing and check remaining_volume
                cur.execute("SELECT remaining_volume, is_available FROM storage_listings WHERE listing_id = %s", (listing_id,))
                row = cur.fetchone()
                if not row:
                    return jsonify({'error': 'Listing not found'}), 404
                remaining_volume, is_available = row
                if not is_available or remaining_volume is None or remaining_volume < requested_volume:
                    return jsonify({'error': 'Not enough space available'}), 400
                # Insert reservation request
                cur.execute("""
                    INSERT INTO reservation_requests (listing_id, renter_username, requested_volume, status)
                    VALUES (%s, %s, %s, 'pending') RETURNING request_id
                """, (listing_id, renter_username, requested_volume))
                request_id = cur.fetchone()[0]
                conn.commit()
                return jsonify({'success': True, 'request_id': request_id}), 201
        finally:
            conn.close()
    except Exception as e:
        print('Error in reserve_space:', e)
        return jsonify({'error': str(e)}), 500

# 2. Lender views all reservation requests for their listing
@app.route('/api/listings/<int:listing_id>/reservation-requests', methods=['GET'])
def get_reservation_requests(listing_id):
    try:
        authenticated = auth.is_authenticated()
        owner_id = None
        if authenticated:
            user_info = session.get('user_info', {})
            owner_id = user_info.get('user', '').lower()
        else:
            owner_id = request.headers.get('X-Username', '').lower()
        if not owner_id:
            return jsonify({'error': 'Not authenticated'}), 401
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Check ownership
                cur.execute("SELECT owner_id FROM storage_listings WHERE listing_id = %s", (listing_id,))
                row = cur.fetchone()
                if not row or row[0] != owner_id:
                    return jsonify({'error': 'Not authorized'}), 403
                # Get all reservation requests
                cur.execute("""
                    SELECT request_id, renter_username, requested_volume, approved_volume, status, created_at, updated_at
                    FROM reservation_requests WHERE listing_id = %s ORDER BY created_at DESC
                """, (listing_id,))
                requests = [
                    {
                        'request_id': r[0],
                        'renter_username': r[1],
                        'requested_volume': r[2],
                        'approved_volume': r[3],
                        'status': r[4],
                        'created_at': r[5].isoformat() if r[5] else None,
                        'updated_at': r[6].isoformat() if r[6] else None
                    } for r in cur.fetchall()
                ]
                return jsonify(requests), 200
        finally:
            conn.close()
    except Exception as e:
        print('Error in get_reservation_requests:', e)
        return jsonify({'error': str(e)}), 500

# 3. Lender approves/rejects/partially approves a reservation request
@app.route('/api/reservation-requests/<int:request_id>', methods=['PATCH'])
def update_reservation_request(request_id):
    try:
        authenticated = auth.is_authenticated()
        owner_id = None
        if authenticated:
            user_info = session.get('user_info', {})
            owner_id = user_info.get('user', '').lower()
        else:
            owner_id = request.headers.get('X-Username', '').lower()
        if not owner_id:
            return jsonify({'error': 'Not authenticated'}), 401
        data = request.get_json()
        new_status = data.get('status')
        approved_volume = data.get('approved_volume')
        if new_status not in ['approved_full', 'approved_partial', 'rejected', 'cancelled_by_renter', 'expired']:
            return jsonify({'error': 'Invalid status'}), 400
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Get reservation request and listing
                cur.execute("SELECT listing_id, requested_volume, status FROM reservation_requests WHERE request_id = %s", (request_id,))
                req = cur.fetchone()
                if not req:
                    return jsonify({'error': 'Request not found'}), 404
                listing_id, requested_volume, current_status = req
                if current_status not in ['pending']:
                    return jsonify({'error': 'Request already processed'}), 400
                # Check ownership
                cur.execute("SELECT owner_id, remaining_volume FROM storage_listings WHERE listing_id = %s", (listing_id,))
                row = cur.fetchone()
                if not row or row[0] != owner_id:
                    return jsonify({'error': 'Not authorized'}), 403
                remaining_volume = row[1]
                # Approve full
                if new_status == 'approved_full':
                    if remaining_volume < requested_volume:
                        return jsonify({'error': 'Not enough space for full approval'}), 400
                    cur.execute("""
                        UPDATE reservation_requests SET status = %s, approved_volume = %s, updated_at = %s WHERE request_id = %s
                    """, ('approved_full', requested_volume, datetime.utcnow(), request_id))
                    cur.execute("UPDATE storage_listings SET remaining_volume = 0, is_available = FALSE WHERE listing_id = %s", (listing_id,))
                # Approve partial
                elif new_status == 'approved_partial':
                    if not approved_volume or float(approved_volume) <= 0 or float(approved_volume) > remaining_volume:
                        return jsonify({'error': 'Invalid approved volume'}), 400
                    cur.execute("""
                        UPDATE reservation_requests SET status = %s, approved_volume = %s, updated_at = %s WHERE request_id = %s
                    """, ('approved_partial', approved_volume, datetime.utcnow(), request_id))
                    new_remaining = remaining_volume - float(approved_volume)
                    is_available = new_remaining > 0
                    cur.execute("UPDATE storage_listings SET remaining_volume = %s, is_available = %s WHERE listing_id = %s", (new_remaining, is_available, listing_id))
                # Reject/cancel/expire
                else:
                    cur.execute("""
                        UPDATE reservation_requests SET status = %s, updated_at = %s WHERE request_id = %s
                    """, (new_status, datetime.utcnow(), request_id))
                conn.commit()
                return jsonify({'success': True}), 200
        finally:
            conn.close()
    except Exception as e:
        print('Error in update_reservation_request:', e)
        return jsonify({'error': str(e)}), 500

# 4. Renter views all their reservation requests
@app.route('/api/my-reservation-requests', methods=['GET'])
def my_reservation_requests():
    try:
        authenticated = auth.is_authenticated()
        renter_username = None
        if authenticated:
            user_info = session.get('user_info', {})
            renter_username = user_info.get('user', '').lower()
        else:
            renter_username = request.headers.get('X-Username', '').lower()
        if not renter_username:
            return jsonify({'error': 'Not authenticated'}), 401
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT request_id, listing_id, requested_volume, approved_volume, status, created_at, updated_at
                    FROM reservation_requests WHERE renter_username = %s ORDER BY created_at DESC
                """, (renter_username,))
                requests = [
                    {
                        'request_id': r[0],
                        'listing_id': r[1],
                        'requested_volume': r[2],
                        'approved_volume': r[3],
                        'status': r[4],
                        'created_at': r[5].isoformat() if r[5] else None,
                        'updated_at': r[6].isoformat() if r[6] else None
                    } for r in cur.fetchall()
                ]
                return jsonify(requests), 200
        finally:
            conn.close()
    except Exception as e:
        print('Error in my_reservation_requests:', e)
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    args = parser.parse_args()
    app.debug = not args.production
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
