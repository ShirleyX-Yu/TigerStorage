from flask import Flask, jsonify, send_from_directory, session, redirect, url_for, request, render_template
from flask_cors import CORS
import dotenv
import os
import psycopg2
import argparse
import auth
import json

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

# Initialize CAS authentication
auth.init_auth(app)

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
        
        # Authenticate the user
        username = auth.authenticate()
        
        # Redirect to the welcome page with the user type as a query parameter
        if user_type:
            return redirect(f'/welcome?userType={user_type}')
        else:
            return redirect('/welcome')
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
        return jsonify({
            'authenticated': True,
            'username': session['user_info']['user']
        })
    return jsonify({
        'authenticated': False
    })



# Database connection function to handle reconnection
def get_db_connection():
    """Get a fresh database connection"""
    try:
        return psycopg2.connect(os.environ.get("DATABASE_URL"))
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# API to create a new listing
@app.route('/api/listings', methods=['POST'])
def create_listing():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['location', 'cost', 'cubicFeet', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            # Convert data to correct types
            cost = float(data['cost']) if data['cost'] else 0
            total_sq_ft = int(data['cubicFeet']) if data['cubicFeet'] else 0
            
            with conn.cursor() as cur:
                # Get the columns that exist in the table
                cur.execute("""SELECT column_name FROM information_schema.columns 
                            WHERE table_name = 'storage_listings' ORDER BY ordinal_position;""")
                columns = [col[0] for col in cur.fetchall()]
                
                # Prepare dynamic insert based on actual columns
                column_values = {}
                
                # Map our data to the actual database schema columns
                column_values['location'] = data['location']
                column_values['cubic_ft'] = total_sq_ft
                column_values['cost'] = cost
                column_values['contract_length_months'] = 12  # Default value
                
                # Build the SQL query dynamically
                columns_str = ', '.join(column_values.keys())
                placeholders = ', '.join(['%s'] * len(column_values))
                
                query = f"""INSERT INTO storage_listings ({columns_str}) 
                         VALUES ({placeholders}) RETURNING listing_id;"""
                
                cur.execute(query, list(column_values.values()))
                
                listing_id = cur.fetchone()[0]
                conn.commit()
                
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
        return jsonify({"error": str(e)}), 500

# API to get all listings
@app.route('/api/listings', methods=['GET'])
def get_listings():
    try:
        # Get listings from database
        
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:    
            with conn.cursor() as cur:
                print("DEBUG: Connected to database successfully")
                
                # Check if the table exists
                cur.execute("""SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'storage_listings'
                )""")
                table_exists = cur.fetchone()[0]
                print(f"DEBUG: Table 'storage_listings' exists: {table_exists}")
                
                if not table_exists:
                    print("DEBUG: Table doesn't exist, returning empty array")
                    return jsonify([]), 200
                
                # Get the columns that exist in the table
                cur.execute("""SELECT column_name FROM information_schema.columns 
                            WHERE table_name = 'storage_listings' ORDER BY ordinal_position;""")
                columns = [col[0] for col in cur.fetchall()]
                print(f"DEBUG: Table columns: {columns}")
                
                # Get all listings
                cur.execute("SELECT * FROM storage_listings;")
                listings = cur.fetchall()
                print(f"DEBUG: Found {len(listings)} listings")
                
                # If no listings found, return mock data
                if len(listings) == 0:
                    # Return mock data instead
                    return jsonify([
                        {
                            "id": 101,
                            "location": "Butler College Storage",
                            "cost": 65,
                            "cubic_feet": 90,
                            "description": "Secure storage space near Butler College, perfect for summer storage.",
                            "is_available": True,
                            "created_at": "2025-03-15T10:30:00",
                            "contract_length_months": 3,
                            "owner_id": 1001
                        },
                        {
                            "id": 102,
                            "location": "Whitman College Basement",
                            "cost": 55,
                            "cubic_feet": 75,
                            "description": "Climate-controlled storage in Whitman College basement.",
                            "is_available": True,
                            "created_at": "2025-03-20T14:45:00",
                            "contract_length_months": 4,
                            "owner_id": 1002
                        },
                        {
                            "id": 103,
                            "location": "Frist Campus Center",
                            "cost": 80,
                            "cubic_feet": 120,
                            "description": "Large storage space near Frist Campus Center, easily accessible.",
                            "is_available": True,
                            "created_at": "2025-03-25T09:15:00",
                            "contract_length_months": 3,
                            "owner_id": 1003
                        }
                    ]), 200
                
                # Get column names from cursor description
                column_names = [desc[0] for desc in cur.description]
                print(f"DEBUG: Column names from query: {column_names}")
                
                # Convert data to JSON-friendly format matching the expected frontend format
                formatted_listings = []
                for row in listings:
                    listing_dict = {}
                    for i, col_name in enumerate(column_names):
                        listing_dict[col_name] = row[i]
                    
                    # Map to frontend expected format
                    formatted_listing = {
                        "id": listing_dict.get('listing_id'),
                        "location": listing_dict.get('location', ''),
                        "cost": listing_dict.get('cost', 0),
                        "cubic_feet": listing_dict.get('cubic_ft', 0),
                        "description": "",  # No description column in the actual schema
                        "is_available": True,  # No is_available column in the actual schema
                        "created_at": None,  # No created_at column in the actual schema
                        "contract_length_months": listing_dict.get('contract_length_months', 12)
                    }
                    formatted_listings.append(formatted_listing)
            
            return jsonify(formatted_listings), 200
        finally:
            conn.close()

    except Exception as e:
        print("Error fetching listings:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch listings: " + str(e)}), 500

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

if __name__ == "__main__":
    args = parser.parse_args()
    app.debug = not args.production
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
