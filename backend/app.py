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
    try:
        return psycopg2.connect(os.environ.get("DATABASE_URL"))
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# Initialize connection
conn = get_db_connection()

# API to create a new listing
@app.route('/api/listings', methods=['POST'])
def create_listing():
    try:
        # Get a fresh connection
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500
            
        data = request.get_json()
        print('Received JSON data:', data)
        
        location = data.get('location')
        cost = data.get('cost')
        cubic_feet = data.get('cubicFeet')
        contract_length = data.get('contractLength')
        
        print('Parsed values:', {
            'location': location,
            'cost': cost,
            'cubic_feet': cubic_feet,
            'contract_length': contract_length
        })

        # Convert data to correct types
        cost = float(cost) if cost else 0
        cubic_feet = int(cubic_feet) if cubic_feet else 0
        contract_length = int(contract_length) if contract_length else 0

        # Insert into database
        with connection.cursor() as cur:
            cur.execute("""
                INSERT INTO storage_listings (location, cost, cubic_ft, contract_length_months)
                VALUES (%s, %s, %s, %s) RETURNING listing_id;
            """, (location, cost, cubic_feet, contract_length))
            listing_id = cur.fetchone()[0]
            connection.commit()

        return jsonify({"message": "Listing created successfully!", "listing_id": listing_id}), 201

    except Exception as e:
        print("Error creating listing:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# API to get all listings
@app.route('/api/listings', methods=['GET'])
def get_listings():
    try:
        # Get a fresh connection
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500
            
        with connection.cursor() as cur:
            cur.execute("SELECT listing_id, location, cost, cubic_ft, contract_length_months FROM storage_listings;")
            listings = cur.fetchall()

        # Convert data to JSON-friendly format
        formatted_listings = [
            {"id": row[0], "location": row[1], "cost": row[2], "cubic_feet": row[3], "contract_length_months": row[4]}
            for row in listings
        ]

        return jsonify(formatted_listings), 200

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Failed to fetch listings"}), 500

if __name__ == "__main__":
    args = parser.parse_args()
    app.debug = not args.production
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
