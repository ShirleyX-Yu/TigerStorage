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
CORS(app, resources={r"/*": {"origins": ["https://tigerstorage-frontend.onrender.com", "http://localhost:5173", "*"]}}, supports_credentials=True)

# Load environment variables and set secret key
dotenv.load_dotenv()
app.secret_key = os.environ.get("APP_SECRET_KEY", "default-dev-key-replace-in-production")

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Helper function to get mock listing data
def get_mock_listing(listing_id):
    if listing_id == 101:
        return jsonify({
            "id": 101,
            "location": "Butler College Storage",
            "cost": 65,
            "cubic_feet": 90,
            "description": "Secure storage space near Butler College, perfect for summer storage.",
            "is_available": True,
            "created_at": "2025-03-15T10:30:00",
            "contract_length_months": 3,
            "owner_id": 1001,
            "latitude": 40.344,
            "longitude": -74.656,
            "image_url": "/assets/placeholder.jpg"
        }), 200
    elif listing_id == 102:
        return jsonify({
            "id": 102,
            "location": "Whitman College Basement",
            "cost": 55,
            "cubic_feet": 75,
            "description": "Climate-controlled storage in Whitman College basement.",
            "is_available": True,
            "created_at": "2025-03-20T14:45:00",
            "contract_length_months": 4,
            "owner_id": 1002,
            "latitude": 40.343,
            "longitude": -74.657,
            "image_url": "/assets/placeholder.jpg"
        }), 200
    elif listing_id == 103:
        return jsonify({
            "id": 103,
            "location": "Frist Campus Center",
            "cost": 80,
            "cubic_feet": 120,
            "description": "Large storage space near Frist Campus Center, easily accessible.",
            "is_available": True,
            "created_at": "2025-03-25T09:15:00",
            "contract_length_months": 3,
            "owner_id": 1003,
            "latitude": 40.347,
            "longitude": -74.653,
            "image_url": "/assets/placeholder.jpg"
        }), 200
    else:
        return jsonify({"error": "Listing not found"}), 404

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
                            
                        # Alter latitude and longitude columns to FLOAT if they exist
                        cur.execute("""
                            SELECT column_name, data_type 
                            FROM information_schema.columns 
                            WHERE table_name = 'storage_listings' 
                            AND column_name IN ('latitude', 'longitude');
                        """)
                        columns = cur.fetchall()
                        
                        for column in columns:
                            if column[1] != 'double precision':  # PostgreSQL's FLOAT type
                                print(f"Converting {column[0]} from {column[1]} to FLOAT")
                                cur.execute(f"ALTER TABLE storage_listings ALTER COLUMN {column[0]} TYPE FLOAT;")
                                conn.commit()
                                print(f"{column[0]} column converted to FLOAT successfully")
                    except Exception as column_err:
                        print(f"Error checking or modifying columns: {column_err}")
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
        redirect_param = request.args.get('redirect')
        
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
        username = auth.authenticate()
        
        # Redirect to the appropriate dashboard based on user type
        if user_type == 'renter':
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
    if auth.is_authenticated():
        # Add debug information to help troubleshoot
        print("User is authenticated. Session info:", session['user_info'])
        return jsonify({
            'authenticated': True,
            'username': session['user_info']['user'],
            'session_id': session.get('_id', 'unknown')
        })
    print("User is not authenticated")
    return jsonify({
        'authenticated': False
    })

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
                    'image_url': image_url
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
        print("DEBUG: Starting get_listings endpoint")
        
        # Add CORS headers
        response_headers = {
            'Access-Control-Allow-Origin': request.headers.get('Origin', '*'),
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
        
        # Handle OPTIONS preflight request
        if request.method == 'OPTIONS':
            return ('', 204, response_headers)
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            print("DEBUG: Failed to get database connection")
            return jsonify({"error": "Database connection failed"}), 500, response_headers
            
        try:
            with conn.cursor() as cur:
                print("DEBUG: Fetching listings")
                # First check if contract_length_months column exists
                cur.execute("""
                        SELECT 
                        listing_id,
                        location,
                        cost,
                        cubic_ft,
                        description,
                        latitude,
                        longitude,
                        start_date,
                        end_date,
                        image_url,
                        created_at,
                        owner_id
                    FROM storage_listings
                    ORDER BY created_at DESC;
                """)
                
                listings = cur.fetchall()
                print(f"DEBUG: Found {len(listings)} listings")
                
                # Convert to list of dictionaries
                formatted_listings = []
                for listing in listings:
                    try:
                        formatted_listing = {
                            "id": listing[0],
                            "listing_id": listing[0],  # Duplicate for consistency
                            "location": listing[1],
                            "cost": float(listing[2]) if listing[2] is not None else 0,
                            "cubic_feet": listing[3] if listing[3] is not None else 0,
                            "cubic_ft": listing[3] if listing[3] is not None else 0,  # Include both field names
                            "description": listing[4] if listing[4] is not None else "",
                            "latitude": float(listing[5]) if listing[5] is not None else None,
                            "longitude": float(listing[6]) if listing[6] is not None else None,
                            "start_date": listing[7].isoformat() if listing[7] else None,
                            "end_date": listing[8].isoformat() if listing[8] else None,
                            "image_url": listing[9] if listing[9] is not None else "/assets/placeholder.jpg",
                            "created_at": listing[10].isoformat() if listing[10] else None,
                            "owner_id": listing[11] if listing[11] is not None else "unknown"
                        }
                        formatted_listings.append(formatted_listing)
                    except Exception as e:
                        print(f"DEBUG: Error formatting listing: {e}")
                        print(f"DEBUG: Listing data: {listing}")
                        continue
                
                response = jsonify(formatted_listings)
                # Add CORS headers to the response
                for key, value in response_headers.items():
                    response.headers[key] = value
                
                return response, 200
        finally:
            conn.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/rentals/current', methods=['GET'])
def get_current_rentals():
    try:
        # Mock data for current rentals
        current_rentals = [
            {
                "id": 1,
                "location": "Princeton University Campus",
                "cost": 75,
                "cubic_feet": 100,
                "start_date": "2025-03-01",
                "end_date": "2025-05-01",
                "lender": "John Smith",
                "status": "Active"
            },
            {
                "id": 2,
                "location": "Nassau Street Storage",
                "cost": 60,
                "cubic_feet": 80,
                "start_date": "2025-02-15",
                "end_date": "2025-08-15",
                "lender": "Sarah Johnson",
                "status": "Active"
            }
        ]
        return jsonify(current_rentals), 200
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Failed to fetch current rentals"}), 500

@app.route('/api/rentals/history', methods=['GET'])
def get_rental_history():
    try:
        # Mock data for rental history
        rental_history = [
            {
                "id": 3,
                "location": "Graduate College",
                "cost": 50,
                "cubic_feet": 60,
                "start_date": "2024-09-01",
                "end_date": "2024-12-15",
                "lender": "Mike Wilson",
                "status": "Completed"
            },
            {
                "id": 4,
                "location": "Forbes Storage",
                "cost": 85,
                "cubic_feet": 120,
                "start_date": "2024-06-01",
                "end_date": "2024-08-30",
                "lender": "Emily Brown",
                "status": "Completed"
            }
        ]
        return jsonify(rental_history), 200
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
                # Only use listing_id as that's the column name in the database
                cur.execute("SELECT * FROM storage_listings WHERE listing_id = %s;", (listing_id,))
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
        # Check if user is logged in
        if not auth.is_authenticated():
            print("User not authenticated")
            return jsonify({"error": "Not authenticated"}), 401
            
        # Get user info from session using the same key as auth_status
        user_info = session['user_info']
        print("User info from session:", user_info)
        
        owner_id = user_info.get('user', '')
        print("Owner ID:", owner_id)
        
        if not owner_id:
            print("Owner ID not found in session")
            return jsonify({"error": "User ID not found"}), 400
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
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
                            latitude NUMERIC,
                            longitude NUMERIC,
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
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'storage_listings' 
                    ORDER BY ordinal_position;
                """)
                columns = [col[0] for col in cur.fetchall()]
                print(f"Available columns: {columns}")
                
                # Build the query dynamically based on available columns
                select_columns = "listing_id, location, cost, cubic_ft, description, latitude, longitude, "
                select_columns += "start_date, end_date, image_url, created_at, owner_id"
                
                try:
                    cur.execute(f"""
                        SELECT {select_columns}
                        FROM storage_listings
                        WHERE owner_id = %s
                        ORDER BY created_at DESC;
                    """, (owner_id,))
                    
                    listings = cur.fetchall()
                    print(f"Found {len(listings)} listings for owner_id: {owner_id}")
                    
                    # Get column names from cursor description
                    column_names = [desc[0] for desc in cur.description]
                    print(f"Query returned columns: {column_names}")
                    
                    # Convert to list of dictionaries
                    formatted_listings = []
                    for listing in listings:
                        try:
                            formatted_listing = {
                                "id": listing[0],
                                "location": listing[1],
                                "cost": float(listing[2]) if listing[2] is not None else 0,
                                "cubic_feet": listing[3] if listing[3] is not None else 0,
                                "description": listing[4] if listing[4] is not None else "",
                                "latitude": float(listing[5]) if listing[5] is not None else None,
                                "longitude": float(listing[6]) if listing[6] is not None else None,
                                "start_date": listing[7].isoformat() if listing[7] else None,
                                "end_date": listing[8].isoformat() if listing[8] else None,
                                "image_url": listing[9] if listing[9] is not None else "/assets/placeholder.jpg",
                                "created_at": listing[10].isoformat() if listing[10] else None,
                                "owner_id": listing[11] if listing[11] is not None else "unknown"
                            }
                            formatted_listings.append(formatted_listing)
                        except Exception as e:
                            print(f"DEBUG: Error formatting listing: {e}")
                            print(f"DEBUG: Listing data: {listing}")
                            continue
                    
                    print(f"Returning {len(formatted_listings)} formatted listings")
                    return jsonify(formatted_listings), 200
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
        # Check if user is logged in
        if not auth.is_authenticated():
            return jsonify({"error": "Not authenticated"}), 401
            
        # Get user info from session
        user_info = session['user_info']
        owner_id = user_info.get('user', '')
        
        # Get the updated data
        data = request.get_json()
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # First verify that the listing belongs to the current user
                cur.execute("SELECT owner_id FROM storage_listings WHERE listing_id = %s", (listing_id,))
                listing = cur.fetchone()
                
                if not listing:
                    return jsonify({"error": "Listing not found"}), 404
                    
                # Check if the current user is the owner
                db_owner_id = listing[0]
                if db_owner_id != owner_id:
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
        # Check if user is logged in
        if not auth.is_authenticated():
            return jsonify({"error": "Not authenticated"}), 401
            
        # Get user info from session
        user_info = session['user_info']
        owner_id = user_info.get('user', '')
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # First verify that the listing belongs to the current user
                cur.execute("SELECT owner_id FROM storage_listings WHERE listing_id = %s", (listing_id,))
                listing = cur.fetchone()
                
                if not listing:
                    return jsonify({"error": "Listing not found"}), 404
                    
                # Check if the current user is the owner
                db_owner_id = listing[0]
                if db_owner_id != owner_id:
                    return jsonify({"error": "You don't have permission to delete this listing"}), 403
                
                # Delete the listing
                cur.execute("DELETE FROM storage_listings WHERE listing_id = %s", (listing_id,))
                conn.commit()
                
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
@app.route('/api/listings/<int:listing_id>/interest', methods=['POST', 'DELETE'])
def handle_interest(listing_id):
    try:
        print(f"Received interest request for listing {listing_id}")
        # Check if user is logged in
        if not auth.is_authenticated():
            print("User not authenticated")
            return jsonify({"error": "Not authenticated"}), 401
            
        # Get user info from session
        user_info = session['user_info']
        renter_username = user_info.get('user', '')
        print(f"Renter username: {renter_username}")
        
        if not renter_username:
            print("No renter username found in session")
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
                    
                    # Insert the interest
                    print(f"Inserting new interest record for listing {listing_id}, renter {renter_username}, lender {lender_username}")
                    cur.execute("""
                        INSERT INTO interested_listings 
                        (listing_id, lender_username, renter_username)
                        VALUES (%s, %s, %s)
                        RETURNING interest_id
                    """, (listing_id, lender_username, renter_username))
                    
                    interest_id = cur.fetchone()[0]
                    conn.commit()
                    print(f"Successfully created interest record with ID {interest_id}")
                    
                    return jsonify({
                        "success": True,
                        "interest_id": interest_id,
                        "message": "Interest shown successfully"
                    }), 201
                    
                elif request.method == 'DELETE':
                    # Remove the interest
                    print(f"Removing interest for listing {listing_id}, renter {renter_username}")
                    cur.execute("""
                        DELETE FROM interested_listings 
                        WHERE listing_id = %s AND renter_username = %s
                        RETURNING interest_id
                    """, (listing_id, renter_username))
                    
                    deleted_interest = cur.fetchone()
                    if not deleted_interest:
                        print(f"No interest found to remove for listing {listing_id}, renter {renter_username}")
                        return jsonify({"error": "No interest found to remove"}), 404
                        
                    conn.commit()
                    print(f"Successfully removed interest record with ID {deleted_interest[0]}")
                    
                    return jsonify({
                        "success": True,
                        "message": "Interest removed successfully"
                    }), 200
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
        owner_id = user_info.get('user', '')
        
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
@app.route('/api/my-interested-listings', methods=['GET'])
def get_my_interested_listings():
    try:
        # Check if user is logged in
        if not auth.is_authenticated():
            return jsonify({"error": "Not authenticated"}), 401
            
        # Get user info from session
        user_info = session['user_info']
        renter_username = user_info.get('user', '')
        
        if not renter_username:
            return jsonify({"error": "User not found"}), 400
            
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor() as cur:
                # Get interested listings with their details
                cur.execute("""
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
                """, (renter_username,))
                
                interested_listings = []
                for row in cur.fetchall():
                    interested_listings.append({
                        "id": row[1],  # listing_id
                        "location": row[2],
                        "cost": row[3],
                        "lender": row[4],
                        "dateInterested": row[5].isoformat(),
                        "status": row[6],
                        "nextStep": "Waiting for lender response" if row[6] == 'pending' else "In Discussion"
                    })
                
                return jsonify(interested_listings), 200
        finally:
            conn.close()
    except Exception as e:
        print("Error getting interested listings:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Initialize database on startup
init_db()

if __name__ == "__main__":
    args = parser.parse_args()
    app.debug = not args.production
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
