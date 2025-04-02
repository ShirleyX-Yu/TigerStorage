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
CORS(app)  # Enable CORS for all routes

# Load environment variables and set secret key
dotenv.load_dotenv()
app.secret_key = os.environ["APP_SECRET_KEY"]

# Initialize CAS authentication
auth.init_auth(app)

# Add custom URL rule to serve React files from the build directory
app.add_url_rule(
    "/build/<path:filename>",
    endpoint="build",
    view_func=lambda filename: send_from_directory("build", filename),
)

def get_db_connection():
    """Get a fresh database connection"""
    return psycopg2.connect(os.getenv("DATABASE_URL"))

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

@app.route('/api/listings', methods=['POST'])
def create_listing():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['location', 'cost', 'cubic_feet', 'contract_length_months']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Get a fresh connection
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO storage_listings (location, cost, cubic_ft, contract_length_months)
                    VALUES (%s, %s, %s, %s)
                    RETURNING listing_id;
                """, (data['location'], data['cost'], data['cubic_feet'], data['contract_length_months']))
                
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
        return jsonify({"error": "Failed to create listing"}), 500

@app.route('/api/listings', methods=['GET'])
def get_listings():
    try:
        # Get a fresh connection
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT listing_id, location, cost, cubic_ft, contract_length_months FROM storage_listings;")
                listings = cur.fetchall()

            # Convert data to JSON-friendly format
            formatted_listings = [
                {"id": row[0], "location": row[1], "cost": row[2], "cubic_feet": row[3], "contract_length_months": row[4]}
                for row in listings
            ]

            return jsonify(formatted_listings), 200
        finally:
            conn.close()

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Failed to fetch listings"}), 500

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
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port)