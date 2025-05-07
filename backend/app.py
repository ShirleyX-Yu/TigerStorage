from flask import Flask, jsonify, send_from_directory, session, redirect, url_for, request, render_template, abort, after_this_request
from backend.config.config import Config
import dotenv
import os
import psycopg2
import argparse
import backend.auth as auth
import json
from werkzeug.utils import secure_filename
from decimal import Decimal
from psycopg2.extras import RealDictCursor
from datetime import datetime, date
import cloudinary
import cloudinary.uploader
import cloudinary.api
from flask_cas import CAS, login_required
from flask_wtf.csrf import CSRFProtect, CSRFError, generate_csrf



# set up command-line argument parsing
parser = argparse.ArgumentParser(description="Run Flask app")
parser.add_argument(
    "--production", action="store_true", help="Run in production mode (disables debug)"
)
 
app = Flask(
    __name__,
    template_folder=os.path.abspath("templates"),
    static_folder=os.path.abspath("static")
)

# Register CAS authentication routes
auth.init_auth(app)

# Initialize flask-cas
cas = CAS(app)
app.config['CAS_SERVER'] = 'https://fed.princeton.edu/cas'
app.config['CAS_AFTER_LOGIN'] = 'catch_all'

# --- SESSION COOKIE CONFIGURATION ---
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True

# Load environment variables and set secret key
dotenv.load_dotenv()
app.secret_key = os.environ.get("APP_SECRET_KEY", "default-dev-key-replace-in-production")

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

# Initialize configuration
Config(app)

# Register blueprints
# app.register_blueprint(listings_bp)
# app.register_blueprint(reservations_bp)

# Add custom URL rule to serve React files from the build directory
app.add_url_rule(
    "/build/<path:filename>",
    endpoint="build",
    view_func=lambda filename: send_from_directory("build", filename),
)

# Serve static files from the build directory
@app.route('/build/<path:filename>')
def serve_static(filename):
    return send_from_directory('build', filename)

# Catch-all route for React Router and CAS authentication
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path=''):
    # Handle API routes separately
    if path.startswith('api/') or path.startswith('build/'):
        abort(404)
    
    # Check if user is authenticated and handle CAS redirects
    if 'CAS_USERNAME' in session:
        username = session.get('CAS_USERNAME')
        # Set user type based on username
        if username == 'cs-tigerstorage':
            session['user_type'] = 'admin'
            # If accessing root, redirect admin to admin dashboard
            if not path:
                return redirect('/admin')
        else:
            # For non-admin users, set default type and handle redirects
            user_type = session.get('user_type', 'lender')
            if not path:  # Only redirect if at root path
                if user_type == 'renter':
                    return redirect('/map')
                else:
                    return redirect('/lender-dashboard')
    
    # Serve the React app for all other routes
    return send_from_directory('build', 'index.html')

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



def get_asset_path(entry: str) -> str:
    try:
        with open("build/.vite/manifest.json", "r") as f:
            manifest = json.load(f)
            return manifest[f"src/{entry}/main.jsx"]["file"]
    except:
        return f"assets/{entry}.js"

@app.route('/')
def index():
    return send_from_directory('build', 'index.html')

@app.route('/map')
@login_required
def map():
    # Assign user type if not already set
    if 'user_type' not in session:
        if cas.username == 'cs-tigerstorage':
            session['user_type'] = 'admin'
        else:
            session['user_type'] = 'lender'
    return send_from_directory('build', 'index.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(file)
        # The URL of the uploaded image
        image_url = upload_result.get('secure_url')
        return jsonify({'url': image_url}), 200
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    import os
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    print(f"[uploads] Requested filename: {filename}")
    print(f"[uploads] Resolved file path: {file_path}")
    if not os.path.exists(file_path):
        print(f"[uploads] File does not exist: {file_path}")
        return {'error': f'File not found: {filename}'}, 404
    print(f"[uploads] File exists, serving: {file_path}")
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
        required_fields = ['title', 'cost', 'description', 'latitude', 'longitude', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
                
        # Special check for square feet (handle both squareFeet and sq_ft)
        if 'squareFeet' not in data and 'sq_ft' not in data:
            return jsonify({"error": "Missing required field: square feet"}), 400

        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "We're experiencing temporary database issues. Please try again later."}), 500
            
        try:
            # Convert data to correct types
            cost = float(data['cost']) if data['cost'] else 0
            # Validation: cost must not be negative
            if cost < 0:
                return jsonify({"error": "Storage cost cannot be negative."}), 400
            # Handle both squareFeet and sq_ft field names
            if 'squareFeet' in data:
                total_sq_ft = int(data['squareFeet']) if data['squareFeet'] else 0
            elif 'sq_ft' in data:
                total_sq_ft = int(data['sq_ft']) if data['sq_ft'] else 0
            else:
                total_sq_ft = 0
            # Validation: square feet must be greater than zero
            if total_sq_ft <= 0:
                return jsonify({"error": "Storage space (square feet) must be greater than zero."}), 400
                
            latitude = float(data['latitude'])
            longitude = float(data['longitude'])
            start_date = data['start_date']  # Already in ISO format from frontend
            end_date = data['end_date']      # Already in ISO format from frontend
            image_url = data.get('image_url', '')  # Get image URL if provided

            # Date validation
            try:
                today = date.today()
                start_dt = date.fromisoformat(start_date)
                end_dt = date.fromisoformat(end_date)
                if start_dt < today:
                    return jsonify({"error": "Start date cannot be in the past."}), 400
                if end_dt < today:
                    return jsonify({"error": "End date cannot be in the past."}), 400
                if start_dt >= end_dt:
                    return jsonify({"error": "End date must be after start date."}), 400
            except Exception:
                return jsonify({"error": "Invalid date format for start or end date."}), 400
            
            with conn.cursor() as cur:
                # Prepare column values
                column_values = {
                    'title': data.get('title', data.get('location', '')),  # Support both title and location fields
                    'sq_ft': total_sq_ft,
                    'cost': cost,
                    'start_date': start_date,
                    'end_date': end_date,
                    'latitude': latitude,
                    'longitude': longitude,
                    'description': data['description'],
                    'image_url': image_url,
                    'remaining_space': total_sq_ft  # Set remaining_space to sq_ft on creation
                }
                
                # Add address if provided
                if 'address' in data:
                    column_values['address'] = data['address']
                
                # Add hall_name if provided
                if 'hall_name' in data:
                    column_values['hall_name'] = data['hall_name']
                
                # Associate the listing with the current user (lender)
                if auth.is_authenticated():
                    user_info = session['user_info']
                    column_values['owner_id'] = user_info.get('user', 'unknown').lower()
                    print(f"Setting owner_id to {user_info.get('user', 'unknown').lower()}")
                
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
            return jsonify({"error": "We're experiencing temporary database issues. Please try again later."}), 500
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
                            title VARCHAR(255) NOT NULL,
                            address VARCHAR(255),
                            cost NUMERIC,
                            sq_ft INTEGER,
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
                essential_columns = ['listing_id', 'title', 'cost', 'sq_ft', 'description', 
                                     'created_at', 'owner_id', 'remaining_space', 'is_available']
                
                # Add all essential columns that exist
                for col in essential_columns:
                    if col in columns:
                        select_parts.append(col)
                
                # Add optional columns if they exist
                optional_columns = ['latitude', 'longitude', 'start_date', 'end_date', 'image_url', 'address', 'hall_name']
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
                
                # --- Fetch average ratings for all lenders in one query ---
                owner_ids = set()
                for listing in listings:
                    idx = column_names.index('owner_id') if 'owner_id' in column_names else None
                    if idx is not None and listing[idx]:
                        owner_ids.add(listing[idx].lower())
                lender_avg_ratings = {}
                if owner_ids:
                    cur.execute("""
                        SELECT LOWER(lender_username), AVG(rating)::float AS avg_rating
                        FROM lender_reviews
                        WHERE LOWER(lender_username) = ANY(%s)
                        GROUP BY LOWER(lender_username)
                    """, (list(owner_ids),))
                    for row in cur.fetchall():
                        lender_avg_ratings[row[0]] = float(row[1]) if row[1] is not None else None
                
                # Convert to list of dictionaries
                formatted_listings = []
                for listing in listings:
                    try:
                        listing_dict = {}
                        for i, col_name in enumerate(column_names):
                            listing_dict[col_name] = listing[i]
                        print('DEBUG: listing_dict:', listing_dict)
                        
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
                            "title": listing_dict.get('title', ''),
                            "address": listing_dict.get('address', ''),
                            "cost": float(listing_dict.get('cost', 0)) if listing_dict.get('cost') is not None else 0,
                            "sq_ft": listing_dict.get('sq_ft', 0),
                            "description": listing_dict.get('description', ''),
                            "latitude": float(listing_dict.get('latitude', 0)) if listing_dict.get('latitude') is not None else None,
                            "longitude": float(listing_dict.get('longitude', 0)) if listing_dict.get('longitude') is not None else None,
                            "start_date": listing_dict.get('start_date').isoformat() if hasattr(listing_dict.get('start_date'), 'isoformat') else (listing_dict.get('start_date') if listing_dict.get('start_date') else None),
                            "end_date": listing_dict.get('end_date').isoformat() if hasattr(listing_dict.get('end_date'), 'isoformat') else (listing_dict.get('end_date') if listing_dict.get('end_date') else None),
                            "image_url": listing_dict.get('image_url', '/assets/placeholder.jpg'),
                            "created_at": listing_dict.get('created_at').isoformat() if hasattr(listing_dict.get('created_at'), 'isoformat') else (listing_dict.get('created_at') if listing_dict.get('created_at') else None),
                            "owner_id": listing_dict.get('owner_id', ''),
                            "remaining_space": listing_dict.get('remaining_space', 0),
                            "is_available": bool(listing_dict.get('is_available', True)) if float(listing_dict.get('remaining_space', 0)) > 0 else False,
                            "hall_name": listing_dict.get('hall_name', ''),
                            # --- Add average lender rating ---
                            "lender_avg_rating": lender_avg_ratings.get(listing_dict.get('owner_id'))
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
            return jsonify({"error": "We're experiencing temporary database issues. Please try again later."}), 500
        # Implement real DB logic here or return 404 if not implemented
        return jsonify({"error": "Not implemented"}), 404
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "We couldn't retrieve your current rentals. Please try again later."}), 500

@app.route('/api/rentals/history', methods=['GET'])
def get_rental_history():
    try:
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "We're experiencing temporary database issues. Please try again later."}), 500
        # Implement real DB logic here or return 404 if not implemented
        return jsonify({"error": "Not implemented"}), 404
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "We couldn't retrieve your rental history. Please try again later."}), 500

# API to get a specific listing by ID
@app.route('/api/listings/<int:listing_id>', methods=['GET'])
def get_listing_by_id(listing_id):
    try:
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "We're experiencing temporary database issues. Please try again later."}), 500
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
                        return jsonify({"error": "We couldn't find this storage listing. It may have been removed."}), 404
                
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
                    "title": listing_dict.get('title', ''),
                    "address": listing_dict.get('address', ''),
                    "cost": listing_dict.get('cost', 0),
                    "sq_ft": listing_dict.get('sq_ft', 0),
                    "description": listing_dict.get('description') or "Storage space available at " + listing_dict.get('title', ''),
                    "is_available": listing_dict.get('is_available', True),
                    "created_at": listing_dict.get('created_at').isoformat() if hasattr(listing_dict.get('created_at'), 'isoformat') else (listing_dict.get('created_at') if listing_dict.get('created_at') else None),
                    "contract_length_months": listing_dict.get('contract_length_months', 12),
                    "owner_id": listing_dict.get('owner_id', 1000),
                    "latitude": listing_dict.get('latitude'),
                    "longitude": listing_dict.get('longitude'),
                    "image_url": listing_dict.get('image_url', '/assets/placeholder.jpg'),
                    "start_date": listing_dict.get('start_date').isoformat() if hasattr(listing_dict.get('start_date'), 'isoformat') else (listing_dict.get('start_date') if listing_dict.get('start_date') else None),
                    "end_date": listing_dict.get('end_date').isoformat() if hasattr(listing_dict.get('end_date'), 'isoformat') else (listing_dict.get('end_date') if listing_dict.get('end_date') else None),
                    "updated_at": listing_dict.get('updated_at').isoformat() if hasattr(listing_dict.get('updated_at'), 'isoformat') else (listing_dict.get('updated_at') if listing_dict.get('updated_at') else None),
                    "remaining_space": listing_dict.get('remaining_space', 0),
                    "hall_name": listing_dict.get('hall_name', '')
                }
                
                # In get_listing_by_id, after fetching listing_dict and before returning formatted_listing:
                # Fetch lender_avg_rating for this owner_id (lowercased)
                lender_avg_rating = None
                try:
                    with get_db_connection().cursor() as cur2:
                        cur2.execute("""
                            SELECT AVG(rating)::float FROM lender_reviews WHERE LOWER(lender_username) = %s
                        """, (str(listing_dict.get('owner_id', '')).lower(),))
                        row = cur2.fetchone()
                        if row and row[0] is not None:
                            lender_avg_rating = float(row[0])
                except Exception as e:
                    print(f"Error fetching lender_avg_rating for owner_id {listing_dict.get('owner_id')}: {e}")
                
                return jsonify(formatted_listing), 200
        finally:
            conn.close()
    except Exception as e:
        print("Error fetching listing:", str(e))
        return jsonify({"error": "We couldn't retrieve this storage listing. Please try again later."}), 500

# API to get listings by owner (for lender dashboard)
@app.route('/api/my-listings', methods=['GET'])
def get_my_listings():
    try:
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
            return jsonify({"error": "We're experiencing temporary database issues. Please try again later."}), 500
            
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
                            title VARCHAR(255) NOT NULL,
                            address VARCHAR(255),
                            cost NUMERIC,
                            sq_ft INTEGER,
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
                essential_columns = ['listing_id', 'title', 'cost', 'sq_ft', 'description', 
                                    'created_at', 'owner_id', 'remaining_space']
                
                # Add all essential columns that exist
                for col in essential_columns:
                    if col in columns:
                        select_parts.append(col)
                
                # Add optional columns if they exist
                optional_columns = ['latitude', 'longitude', 'start_date', 'end_date', 'image_url', 'address', 'hall_name']
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
                                        "title": "Butler College Storage",
                                        "cost": 65,
                                        "sq_ft": 90,
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
                            print('DEBUG: listing_dict:', listing_dict)
                            
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
                                "title": listing_dict.get('title', ''),
                                "address": listing_dict.get('address', ''),
                                "cost": float(listing_dict.get('cost', 0)) if listing_dict.get('cost') is not None else 0,
                                "sq_ft": listing_dict.get('sq_ft', 0),
                                "description": listing_dict.get('description', ''),
                                "latitude": float(listing_dict.get('latitude', 0)) if listing_dict.get('latitude') is not None else None,
                                "longitude": float(listing_dict.get('longitude', 0)) if listing_dict.get('longitude') is not None else None, 
                                "start_date": listing_dict.get('start_date').isoformat() if listing_dict.get('start_date') else None,
                                "end_date": listing_dict.get('end_date').isoformat() if listing_dict.get('end_date') else None,
                                "image_url": listing_dict.get('image_url', '/assets/placeholder.jpg'),
                                "created_at": listing_dict.get('created_at').isoformat() if listing_dict.get('created_at') else None,
                                "owner_id": listing_dict.get('owner_id', ''),
                                "remaining_space": listing_dict.get('remaining_space', 0),
                                "is_available": bool(listing_dict.get('is_available', True)) if float(listing_dict.get('remaining_space', 0)) > 0 else False,
                                "hall_name": listing_dict.get('hall_name', '')
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
        return jsonify({"error": "We couldn't retrieve your listings at this time. Please try again later."}), 500

# API to update a listing
@app.route('/api/listings/<int:listing_id>', methods=['PUT'])
def update_listing(listing_id):
    try:
        # Check authentication from different possible sources
        authenticated = auth.is_authenticated()
        owner_id = None
        user_type_header = None  # Ensure this is always defined
        
        if authenticated:
            # Get from session if authenticated
            print("User authenticated via session for update")
            user_info = session.get('user_info', {})
            owner_id = user_info.get('user', '').lower()
            user_type_header = user_info.get('user_type', None)  # Try to get user_type from session
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

        # Validation: Prevent negative cost or square feet
        if 'cost' in data:
            try:
                cost_val = float(data['cost'])
                if cost_val < 0:
                    return jsonify({"error": "Storage cost cannot be negative."}), 400
            except Exception:
                return jsonify({"error": "Invalid value for cost."}), 400
        if 'squareFeet' in data:
            try:
                sq_ft_val = int(data['squareFeet'])
                if sq_ft_val <= 0:
                    return jsonify({"error": "Storage space (square feet) must be greater than zero."}), 400
            except Exception:
                return jsonify({"error": "Invalid value for square feet."}), 400
        if 'sq_ft' in data:
            try:
                sq_ft_val = int(data['sq_ft'])
                if sq_ft_val <= 0:
                    return jsonify({"error": "Storage space (square feet) must be greater than zero."}), 400
            except Exception:
                return jsonify({"error": "Invalid value for square feet."}), 400

        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "We're experiencing temporary database issues. Please try again later."}), 500

        try:
            with conn.cursor() as cur:
                # First verify that the listing exists
                print(f"Checking if listing {listing_id} exists for update")
                cur.execute("SELECT owner_id FROM storage_listings WHERE listing_id = %s", (listing_id,))
                listing = cur.fetchone()

                if not listing:
                    print(f"Listing {listing_id} not found for update")
                    return jsonify({"error": "We couldn't find this storage listing. It may have been removed."}), 404

                db_owner_id = listing[0]
                print(f"Listing owner is: {db_owner_id}, update request from: {owner_id}, user_type: {user_type_header}")

                # Admin can update any listing
                is_admin = user_type_header == 'admin'
                if not is_admin and db_owner_id != owner_id:
                    print(f"Permission denied: {owner_id} is not owner of listing {listing_id} and not admin")
                    return jsonify({"error": "You don't have permission to update this listing. Please contact support if you believe this is an error."}), 403

                # Prepare update data
                update_values = {}

                # Only update fields that are provided
                if 'title' in data:
                    update_values['title'] = data['title']
                if 'cost' in data:
                    update_values['cost'] = float(data['cost'])
                if 'squareFeet' in data:
                    update_values['sq_ft'] = int(data['squareFeet'])
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
                if 'hall_name' in data:
                    update_values['hall_name'] = data['hall_name']

                # Admin actions: accept/reject listing
                if is_admin:
                    # Accept Report: is_available = False (listing becomes unavailable)
                    if data.get('admin_action') == 'accept':
                        update_values['is_available'] = False
                    # Reject Report: is_available = True (listing remains available)
                    elif data.get('admin_action') == 'reject':
                        update_values['is_available'] = True
                    # Allow direct is_available update if provided
                    if 'is_available' in data:
                        update_values['is_available'] = bool(data['is_available'])

                if not update_values:
                    return jsonify({"error": "No fields provided to update"}), 400
                
                # Build the SQL update query
                set_clause = ", ".join([f"{key} = %s" for key in update_values.keys()])
                query = f"UPDATE storage_listings SET {set_clause} WHERE listing_id = %s"
                
                # Execute the update
                cur.execute(query, list(update_values.values()) + [listing_id])
                conn.commit()
                print(f"Listing {listing_id} updated successfully")

                # If admin, update reported_listings status as well (now by report_id, not listing_id)
                if is_admin and data.get('admin_action') in ['accept', 'reject']:
                    new_status = 'rejected' if data.get('admin_action') == 'reject' else 'accepted'
                    report_id = data.get('report_id')
                    if not report_id:
                        return jsonify({"error": "Missing report_id for admin action"}), 400
                    cur.execute(
                        "UPDATE reported_listings SET status = %s WHERE report_id = %s AND status = 'pending'",
                        (new_status, report_id)
                    )
                    conn.commit()

                # If squareFeet or sq_ft was updated, recalculate remaining_space
                if 'squareFeet' in data or 'sq_ft' in data:
                    new_sq_ft = int(data.get('squareFeet', data.get('sq_ft')))
                    # Calculate total reserved volume (pending + approved)
                    cur.execute("""
                        SELECT COALESCE(SUM(requested_space), 0)
                        FROM reservation_requests
                        WHERE listing_id = %s AND status IN ('pending', 'approved_full', 'approved_partial')
                    """, (listing_id,))
                    reserved = cur.fetchone()[0] or 0
                    new_remaining = max(new_sq_ft - reserved, 0)
                    cur.execute("""
                        UPDATE storage_listings SET remaining_space = %s WHERE listing_id = %s
                    """, (new_remaining, listing_id))
                    conn.commit()
                    print(f"Updated remaining_space for listing {listing_id} to {new_remaining}")
                
                return jsonify({"success": True, "message": "Listing updated successfully"}), 200
        finally:
            conn.close()
    except Exception as e:
        print("Error updating listing:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": "We couldn't update your listing. Please check your information and try again."}), 500

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
            return jsonify({"error": "We're experiencing temporary database issues. Please try again later."}), 500
            
        try:
            with conn.cursor() as cur:
                # First verify that the listing belongs to the current user
                print(f"Checking if listing {listing_id} belongs to {owner_id}")
                cur.execute("SELECT owner_id FROM storage_listings WHERE listing_id = %s", (listing_id,))
                listing = cur.fetchone()
                
                if not listing:
                    print(f"Listing {listing_id} not found")
                    return jsonify({"error": "We couldn't find this storage listing. It may have been removed."}), 404
                    
                # Check if the current user is the owner
                db_owner_id = listing[0]
                print(f"Listing owner is: {db_owner_id}, request from: {owner_id}")
                if db_owner_id != owner_id:
                    print(f"Permission denied: {owner_id} is not owner of listing {listing_id}")
                    return jsonify({"error": "You don't have permission to delete this listing. Please contact support if you believe this is an error."}), 403
                
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

# Initialize CSRF protection
csrf = CSRFProtect(app)

# NOTE: The interest endpoint has been deprecated and removed.
# Interest functionality is now handled through the reservation_requests system.
# See /api/listings/<listing_id>/reserve for creating new requests
# and /api/reservation-requests/<request_id> for managing them.

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
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # Verify that the listing belongs to the current user
                cur.execute("""
                    SELECT owner_username FROM storage_listings 
                    WHERE listing_id = %s
                """, (listing_id,))
                
                listing = cur.fetchone()
                if not listing:
                    return jsonify({"error": "Listing not found"}), 404
                    
                if listing[0].lower() != owner_id:
                    return jsonify({"error": "You don't have permission to view interested renters for this listing"}), 403
                
                # Get interested renters with their details
                cur.execute("""
                    SELECT 
                        rr.request_id,
                        rr.renter_username,
                        rr.requested_space,
                        rr.status,
                        rr.created_at
                    FROM reservation_requests rr
                    WHERE rr.listing_id = %s
                    ORDER BY rr.created_at DESC
                """, (listing_id,))
                
                interested_renters = []
                for row in cur.fetchall():
                    interested_renters.append({
                        "id": row[0],
                        "username": row[1],
                        "requested_space": float(row[2]) if row[2] is not None else None,
                        "status": row[3],
                        "date_requested": row[4].isoformat()
                    })
                
                return jsonify(interested_renters), 200
        finally:
            conn.close()
    except Exception as e:
        print("Error getting interested renters:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# --- RESERVATION REQUEST ENDPOINTS ---

# 1. Renter requests a reservation for a specific volume
@app.route('/api/listings/<int:listing_id>/reserve', methods=['POST'])
def reserve_space(listing_id):
    try:
        print(f"[RESERVE] Incoming reservation request for listing_id={listing_id}")
        authenticated = auth.is_authenticated()
        renter_username = None
        if authenticated:
            user_info = session.get('user_info', {})
            renter_username = user_info.get('user', '').lower()
        else:
            renter_username = request.headers.get('X-Username', '').lower()
        print(f"[RESERVE] Authenticated: {authenticated}, Renter Username: {renter_username}")
        if not renter_username:
            print("[RESERVE] No renter_username provided")
            return jsonify({'error': 'Not authenticated'}), 401
        data = request.get_json()
        print(f"[RESERVE] Payload: {data}")
        requested_space = float(data.get('requested_space', 0))
        if requested_space <= 0:
            print(f"[RESERVE] Invalid requested_space: {requested_space}")
            return jsonify({'error': 'Requested space must be positive'}), 400
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
                    print(f"[RESERVE] Duplicate pending reservation for {renter_username} on listing {listing_id}")
                    return jsonify({'error': 'You already have a pending reservation request for this listing.'}), 400
                # Get listing and check remaining_space
                cur.execute("SELECT remaining_space, is_available, owner_id FROM storage_listings WHERE listing_id = %s", (listing_id,))
                row = cur.fetchone()
                if not row:
                    print(f"[RESERVE] Listing {listing_id} not found")
                    return jsonify({'error': 'Listing not found'}), 404
                remaining_space, is_available, lender_username = row
                print(f"[RESERVE] Listing remaining_space: {remaining_space}, is_available: {is_available}, lender: {lender_username}")
                if not is_available or remaining_space is None or remaining_space < requested_space:
                    print(f"[RESERVE] Not enough space: requested {requested_space}, available {remaining_space}")
                    return jsonify({'error': 'Not enough space available'}), 400
                
                # Check if lender_username field exists in the reservation_requests table
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'reservation_requests';
                """)
                available_columns = [col[0] for col in cur.fetchall()]
                
                # Insert reservation request
                if 'lender_username' in available_columns:
                    print(f"[RESERVE] Adding request with lender_username field")
                    cur.execute("""
                        INSERT INTO reservation_requests (listing_id, renter_username, lender_username, requested_space, status)
                        VALUES (%s, %s, %s, %s, 'pending') RETURNING request_id
                    """, (listing_id, renter_username, lender_username, requested_space))
                else:
                    print(f"[RESERVE] Adding request without lender_username field")
                    cur.execute("""
                        INSERT INTO reservation_requests (listing_id, renter_username, requested_space, status)
                        VALUES (%s, %s, %s, 'pending') RETURNING request_id
                    """, (listing_id, renter_username, requested_space))
                
                request_id = cur.fetchone()[0]
                conn.commit()
                print(f"[RESERVE] Reservation created: request_id={request_id}")
                return jsonify({'success': True, 'request_id': request_id}), 201
        finally:
            conn.close()
    except Exception as e:
        print('[RESERVE] Error in reserve_space:', e)
        return jsonify({'error': 'We couldn\'t process your reservation request at this time. Please try again later.'}), 500

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
                    SELECT request_id, renter_username, requested_space, approved_space, status, created_at, updated_at
                    FROM reservation_requests WHERE listing_id = %s ORDER BY created_at DESC
                """, (listing_id,))
                requests = [
                    {
                        'request_id': r[0],
                        'renter_username': r[1],
                        'requested_space': r[2],
                        'approved_space': r[3],
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
        return jsonify({'error': 'We couldn\'t retrieve the reservation requests for this listing. Please try again later.'}), 500

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
        approved_space = data.get('approved_space')
        if new_status not in ['approved_full', 'approved_partial', 'rejected', 'cancelled_by_renter', 'expired']:
            return jsonify({'error': 'Invalid status'}), 400
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Get reservation request and listing
                cur.execute("SELECT listing_id, requested_space, status, renter_username FROM reservation_requests WHERE request_id = %s", (request_id,))
                req = cur.fetchone()
                if not req:
                    return jsonify({'error': 'Request not found'}), 404
                listing_id, requested_space, current_status, renter_username = req
                if current_status not in ['pending']:
                    return jsonify({'error': 'Request already processed'}), 400
                # Special case: allow renter to cancel their own request
                if new_status == 'cancelled_by_renter':
                    if renter_username != owner_id:
                        return jsonify({'error': 'Not authorized'}), 403
                    cur.execute("""
                        UPDATE reservation_requests SET status = %s, updated_at = %s WHERE request_id = %s
                    """, (new_status, datetime.utcnow(), request_id))
                    conn.commit()
                    return jsonify({'success': True}), 200
                # Check ownership (lender actions)
                cur.execute("SELECT owner_id, remaining_space FROM storage_listings WHERE listing_id = %s", (listing_id,))
                row = cur.fetchone()
                if not row or row[0] != owner_id:
                    return jsonify({'error': 'Not authorized'}), 403
                remaining_space = row[1]
                # Approve full
                if new_status == 'approved_full':
                    if remaining_space < requested_space:
                        return jsonify({'error': 'Not enough space for full approval'}), 400
                    cur.execute("""
                        UPDATE reservation_requests SET status = %s, approved_space = %s, updated_at = %s WHERE request_id = %s
                    """, ('approved_full', requested_space, datetime.utcnow(), request_id))
                    new_remaining = remaining_space - requested_space
                    is_available = new_remaining > 0
                    cur.execute("UPDATE storage_listings SET remaining_space = %s, is_available = %s WHERE listing_id = %s", (new_remaining, is_available, listing_id))
                # Approve partial
                elif new_status == 'approved_partial':
                    if not approved_space or float(approved_space) <= 0 or float(approved_space) > remaining_space:
                        return jsonify({'error': 'Invalid approved space'}), 400
                    cur.execute("""
                        UPDATE reservation_requests SET status = %s, approved_space = %s, updated_at = %s WHERE request_id = %s
                    """, ('approved_partial', approved_space, datetime.utcnow(), request_id))
                    new_remaining = remaining_space - float(approved_space)
                    is_available = new_remaining > 0
                    cur.execute("UPDATE storage_listings SET remaining_space = %s, is_available = %s WHERE listing_id = %s", (new_remaining, is_available, listing_id))
                # Reject/cancel/expire (by lender)
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
        return jsonify({'error': 'We were unable to update this reservation request. Please try again later.'}), 500

# API endpoint to fetch a user's reservation requests
@app.route('/api/my-reservation-requests', methods=['GET'])
def get_my_reservation_requests():
    # Get username from headers, query params, or session
    username = request.headers.get('X-Username') or request.args.get('username')
    
    # If not provided directly, try to get from session
    if not username:
        try:
            if 'user_info' in session and 'user' in session['user_info']:
                username = session['user_info'].get('user', '').lower()
            elif 'username' in session:
                username = session.get('username', '').lower()
            elif 'CAS_USERNAME' in session:
                username = session.get('CAS_USERNAME', '').lower()
        except Exception as e:
            print(f"Error accessing session: {str(e)}")
    
    print(f"[RESERVATION REQUESTS] Fetching requests for username: {username}")
    
    # If still no username, return error
    if not username:
        print("[RESERVATION REQUESTS] No username found in headers or session")
        return jsonify({'error': 'Username is required. Please provide X-Username header or username query param.'}), 400
    
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            print("[RESERVATION REQUESTS] Database connection failed")
            return jsonify({'error': 'Database connection failed'}), 500
        
        with conn.cursor() as cur:
            # First check if the reservation_requests table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'reservation_requests'
                );
            """)
            reservation_table_exists = cur.fetchone()[0]
            
            # If table doesn't exist, return empty result
            if not reservation_table_exists:
                print("[RESERVATION REQUESTS] reservation_requests table does not exist")
                return jsonify([]), 200
            
            # Simplified query that explicitly includes dates
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            try:
                # Use a simpler query that explicitly pulls the fields we need
                query = """
                    SELECT 
                        r.request_id, 
                        r.listing_id,
                        r.renter_username, 
                        r.requested_space, 
                        r.approved_space, 
                        r.status, 
                        r.created_at, 
                        r.updated_at,
                        l.title, 
                        l.address, 
                        l.hall_name, 
                        l.sq_ft, 
                        l.cost, 
                        l.owner_id,
                        l.start_date,
                        l.end_date,
                        l.image_url
                    FROM reservation_requests r
                    JOIN storage_listings l ON r.listing_id = l.listing_id
                    WHERE r.renter_username = %s
                    ORDER BY r.created_at DESC
                """
                
                print(f"[RESERVATION REQUESTS] Executing query: {query}")
                cursor.execute(query, (username,))
                requests = cursor.fetchall()
                print(f"[RESERVATION REQUESTS] Found {len(requests)} requests")
                
                # Debug the first request's dates
                if requests and len(requests) > 0:
                    first_req = requests[0]
                    print(f"[RESERVATION REQUESTS] First request dates: start_date={first_req.get('start_date')}, end_date={first_req.get('end_date')}")
                
                # Convert all date objects to ISO strings for proper JSON serialization
                result = []
                for req in requests:
                    item = dict(req)
                    # Convert date fields to ISO format
                    for field in ['created_at', 'updated_at', 'start_date', 'end_date']:
                        if field in item and item[field] is not None and hasattr(item[field], 'isoformat'):
                            item[field] = item[field].isoformat()
                    result.append(item)
                
                return jsonify(result)
            finally:
                cursor.close()
    except Exception as e:
        print(f"Error in get_my_reservation_requests: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'We couldn\'t retrieve your reservation requests at this time. Please try again later.'}), 500
    finally:
        if conn:
            conn.close()

# --- API endpoint for reporting a listing ---
@app.route('/api/report-listing', methods=['POST'])
def report_listing():
    data = request.json
    listing_id = data.get('listing_id')
    lender_id = data.get('lender_id')
    renter_id = data.get('renter_id')
    reason = data.get('reason')

    # If renter_id is missing or blank, use a random anonymous value
    if not renter_id or not str(renter_id).strip():
        import random
        renter_id = f"anonymous_{random.randint(1000, 9999)}"

    if not (listing_id and reason):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO reported_listings (listing_id, lender_id, renter_id, reason, status)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING report_id, created_at
            """, (listing_id, lender_id, renter_id, reason, 'pending'))
            report = cur.fetchone()
            conn.commit()
        return jsonify({
            'success': True,
            'report_id': report[0],
            'created_at': report[1].isoformat() if report[1] else None
        }), 201
    except Exception as e:
        print('Error in report_listing:', e)
        return jsonify({'error': 'We couldn\'t process your report at this time. Please try again later.'}), 500
    finally:
        conn.close()

# --- API endpoint for admin to get all reported listings ---
@app.route('/api/reported-listings', methods=['GET'])
def get_reported_listings():
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute('''
                SELECT s.*, r.report_id, r.reason, r.status AS report_status, r.created_at AS report_created_at, r.renter_id
                FROM storage_listings s
                JOIN reported_listings r ON s.listing_id = r.listing_id
                ORDER BY r.created_at DESC
            ''')
            reported = []
            columns = [desc[0] for desc in cur.description]
            for row in cur.fetchall():
                listing = dict(zip(columns, row))
                # Convert all date or datetime fields to ISO format
                for k, v in listing.items():
                    if hasattr(v, 'isoformat'):
                        listing[k] = v.isoformat()
                reported.append(listing)
            return jsonify(reported), 200
    except Exception as e:
        print('Error in get_reported_listings:', e)
        return jsonify({'error': 'We couldn\'t retrieve the reported listings at this time. Please try again later.'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/lender-reviews', methods=['POST'])
def submit_lender_review():
    data = request.json
    request_id = data.get('request_id')
    rating = data.get('rating')
    review_text = data.get('review_text', '')
    # Support both session and header-based auth for renter_username
    renter_username = (
        session.get('username')
        or session.get('user_info', {}).get('user')
        or request.headers.get('X-Username', '').lower()
    )
    print(f"[REVIEW SUBMIT] Authenticated renter_username: {renter_username}")

    conn = get_db_connection()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # 1. Fetch reservation and check ownership and approval
        cur.execute("""
            SELECT rr.*, sl.owner_id, sl.end_date
            FROM reservation_requests rr
            JOIN storage_listings sl ON rr.listing_id = sl.listing_id
            WHERE rr.request_id = %s
        """, (request_id,))
        reservation = cur.fetchone()
        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404
        print(f"[REVIEW SUBMIT] Reservation renter_username: {reservation['renter_username']}")
        if reservation['renter_username'] != renter_username:
            return jsonify({'error': 'Not your reservation'}), 403
        if reservation['status'] not in ('approved_full', 'approved_partial'):
            return jsonify({'error': 'Reservation not approved'}), 403
        if not reservation['end_date'] or date.today() < reservation['end_date']:
            return jsonify({'error': 'You can only review after your reservation ends'}), 403

        # 2. Check if review already exists
        cur.execute("""
            SELECT 1 FROM lender_reviews WHERE request_id = %s
        """, (request_id,))
        if cur.fetchone():
            return jsonify({'error': 'You have already reviewed this reservation'}), 400

        # 3. Insert review
        cur.execute("""
            INSERT INTO lender_reviews (lender_username, renter_username, request_id, rating, review_text)
            VALUES (%s, %s, %s, %s, %s)
        """, (reservation['owner_id'], renter_username, request_id, rating, review_text))
        conn.commit()
    return jsonify({'success': True})

@app.route('/api/lender-reviews/<lender_username>', methods=['GET'])
def get_lender_reviews(lender_username):
    conn = get_db_connection()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT lr.rating, lr.review_text, lr.created_at, lr.renter_username,
                   sl.listing_id, sl.title
            FROM lender_reviews lr
            JOIN reservation_requests rr ON lr.request_id = rr.request_id
            JOIN storage_listings sl ON rr.listing_id = sl.listing_id
            WHERE lr.lender_username = %s
            ORDER BY lr.created_at DESC
        """, (lender_username,))
        reviews = cur.fetchall()
    return jsonify(reviews)

@app.route('/debug-list-assets')
def debug_list_assets():
    import os
    asset_dir = os.path.join(os.path.dirname(__file__), 'build', 'assets')
    if not os.path.exists(asset_dir):
        return "No assets directory found!", 404
    files = os.listdir(asset_dir)
    return "<br>".join(files)

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join('build', 'assets'), filename)

# Add a CSRF error handler for API endpoints
@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    response = jsonify({'error': 'For your security, please refresh the page and try again.', 'description': e.description})
    response.status_code = 400
    # Add CORS headers for API clients
    response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Add CSP header to all responses for XSS protection
@app.after_request
def set_csp_headers(response):
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https://res.cloudinary.com https://*.cloudinary.com https://images.unsplash.com https://cdn.jsdelivr.net https://*.cartocdn.com https://raw.githubusercontent.com https://cdnjs.cloudflare.com; "
        "font-src 'self' data:; "
        "connect-src 'self' https://res.cloudinary.com https://*.cloudinary.com https://images.unsplash.com https://cdn.jsdelivr.net https://nominatim.openstreetmap.org; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    return response

@app.route('/api/csrf-token', methods=['GET'])
def get_csrf_token():
    token = generate_csrf()
    response = jsonify({'csrf_token': token})
    response.set_cookie(
        'csrf_token',
        token,
        secure=True,
        samesite='None',
        httponly=False,  # Must be readable by JS
        domain='.onrender.com' if is_production else None
    )
    return response

@app.route('/api/debug/schema/<table_name>', methods=['GET'])
def debug_schema(table_name):
    """Debug endpoint to view the schema of a table"""
    try:
        # Only allow this endpoint in development or for admin users
        if not (os.environ.get('FLASK_ENV') == 'development' or 
                (auth.is_authenticated() and session.get('user_type') == 'admin')):
            return jsonify({'error': 'Not authorized'}), 403
            
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        with conn.cursor() as cur:
            # Check if table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = %s
                );
            """, (table_name,))
            table_exists = cur.fetchone()[0]
            
            if not table_exists:
                return jsonify({'error': f'Table {table_name} does not exist'}), 404
                
            # Get column info
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = %s
                ORDER BY ordinal_position;
            """, (table_name,))
            
            columns = []
            for row in cur.fetchall():
                columns.append({
                    'name': row[0],
                    'type': row[1],
                    'nullable': row[2] == 'YES',
                    'default': row[3]
                })
                
            # Get constraints
            cur.execute("""
                SELECT
                    tc.constraint_name,
                    tc.constraint_type,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM
                    information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                LEFT JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.table_name = %s;
            """, (table_name,))
            
            constraints = []
            for row in cur.fetchall():
                constraints.append({
                    'name': row[0],
                    'type': row[1],
                    'column': row[2],
                    'foreign_table': row[3],
                    'foreign_column': row[4]
                })
                
            # Get sample data (first 5 rows)
            sample_data = []
            try:
                cur.execute(f"SELECT * FROM {table_name} LIMIT 5")
                column_names = [desc[0] for desc in cur.description]
                for row in cur.fetchall():
                    row_dict = {}
                    for i, col in enumerate(column_names):
                        # Convert non-JSON serializable types
                        if isinstance(row[i], (datetime, date)):
                            row_dict[col] = row[i].isoformat()
                        else:
                            row_dict[col] = row[i]
                    sample_data.append(row_dict)
            except Exception as e:
                sample_data = [{'error': str(e)}]
                
            return jsonify({
                'table': table_name,
                'columns': columns,
                'constraints': constraints,
                'sample_data': sample_data
            })
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    args = parser.parse_args()
    app.debug = not args.production
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
