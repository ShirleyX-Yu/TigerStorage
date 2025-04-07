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
        username = auth.authenticate()
        # Instead of returning JSON, redirect to the welcome page
        return redirect('/welcome')
    except Exception as e:
        if hasattr(e, 'response') and e.response.status_code == 302:
            # This is the CAS redirect
            return redirect(e.response.location)
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
            
            # Get user ID from session or use default
            owner_id = session.get('user_info', {}).get('user_id', 1)
            if isinstance(owner_id, str) and owner_id.isdigit():
                owner_id = int(owner_id)
            elif isinstance(owner_id, str):
                # If it's a string like a netID, use a default ID
                owner_id = 1
            
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO storage_listings 
                    (owner_id, location, total_sq_ft, cost_per_month, description, is_available)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING listing_id;
                """, (owner_id, data['location'], total_sq_ft, cost, data['description'], True))
                
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
        print("API: Fetching listings")
        # Get a fresh connection
        conn = get_db_connection()
        if not conn:
            print("API: Database connection failed")
            return jsonify({"error": "Database connection failed"}), 500
        
        try:    
            with conn.cursor() as cur:
                print("API: Executing SQL query")
                # Check if the table exists
                cur.execute("""SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'storage_listings'
                )""")
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    print("API: Table 'storage_listings' does not exist")
                    # Create the table if it doesn't exist
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS storage_listings (
                            listing_id SERIAL PRIMARY KEY,
                            location TEXT NOT NULL,
                            cost NUMERIC(10,2) NOT NULL,
                            cubic_ft INTEGER NOT NULL,
                            contract_length_months INTEGER NOT NULL
                        );
                    """)
                    conn.commit()
                    print("API: Created 'storage_listings' table")
                    return jsonify([]), 200
                
                # Get the listings - using the actual schema from your database
                cur.execute("SELECT listing_id, owner_id, location, total_sq_ft, cost_per_month, description, is_available, created_at FROM storage_listings;")
                listings = cur.fetchall()
                print(f"API: Found {len(listings)} listings")

            # Convert data to JSON-friendly format matching the expected frontend format
            formatted_listings = [
                {
                    "id": row[0],
                    "owner_id": row[1],
                    "location": row[2],
                    "cubic_feet": row[3],  # total_sq_ft mapped to cubic_feet
                    "cost": row[4],        # cost_per_month mapped to cost
                    "description": row[5],
                    "is_available": row[6],
                    "created_at": row[7].isoformat() if row[7] else None,
                    "contract_length_months": 12  # Default value since it's not in your schema
                }
                for row in listings
            ]
            
            print(f"API: Returning {len(formatted_listings)} formatted listings")
            return jsonify(formatted_listings), 200
        finally:
            conn.close()
            print("API: Database connection closed")

    except Exception as e:
        print("Error fetching listings:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch listings: " + str(e)}), 500

if __name__ == "__main__":
    args = parser.parse_args()
    app.debug = not args.production
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
