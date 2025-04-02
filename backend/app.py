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

# Enable CORS with support for credentials
CORS(app, supports_credentials=True, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],  # Your frontend URL
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

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

@app.before_request
def check_auth():
    # Skip auth check for login routes
    if request.path in ['/login', '/cas-login', '/cas-validate']:
        return
        
    # Skip auth check for OPTIONS requests (CORS preflight)
    if request.method == 'OPTIONS':
        return
        
    # Check if user is authenticated
    if not auth.is_authenticated():
        return jsonify({"error": "Not authenticated"}), 401

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
        print("Getting available listings...")  # Debug log
        conn = get_db_connection()
        print("Database connection established")  # Debug log
        
        with conn.cursor() as cur:
            query = """
                SELECT 
                    sl.listing_id,
                    sl.location,
                    sl.total_sq_ft,
                    sl.cost_per_month,
                    sl.description,
                    u.name as owner_name,
                    sl.created_at
                FROM storage_listings sl
                JOIN users u ON sl.owner_id = u.user_id
                WHERE sl.is_available = true
                ORDER BY sl.created_at DESC;
            """
            print(f"Executing query: {query}")  # Debug log
            cur.execute(query)
            
            listings = cur.fetchall()
            print(f"Found {len(listings)} listings")  # Debug log
            
            formatted_listings = [{
                "id": row[0],
                "location": row[1],
                "space": row[2],
                "cost": float(row[3]),
                "description": row[4],
                "owner": row[5],
                "created_at": row[6].strftime('%Y-%m-%d')
            } for row in listings]
            
            return jsonify(formatted_listings), 200
    except Exception as e:
        print(f"Error in get_listings: {str(e)}")  # Debug log
        import traceback
        print(traceback.format_exc())  # Print full stack trace
        return jsonify({"error": f"Failed to fetch listings: {str(e)}"}), 500

@app.route('/api/rentals/current', methods=['GET'])
def get_current_rentals():
    try:
        print("Getting current rentals...")  # Debug log
        conn = get_db_connection()
        print("Database connection established")  # Debug log
        
        # Get the current user's netid
        netid = session.get('user_info', {}).get('user')
        if not netid:
            print("No netid found in session")  # Debug log
            return jsonify({"error": "User not found in session"}), 401
            
        print(f"User netid: {netid}")  # Debug log
        
        with conn.cursor() as cur:
            query = """
                SELECT sr.request_id, sl.location, sl.cost_per_month, sr.sq_ft_requested, 
                       sr.created_at, u.name as owner_name, sr.status
                FROM storage_requests sr
                JOIN storage_listings sl ON sr.listing_id = sl.listing_id
                JOIN users u ON sl.owner_id = u.user_id
                WHERE sr.renter_id = (SELECT user_id FROM users WHERE netid = %s)
                AND sr.status = 'active'
                ORDER BY sr.created_at DESC;
            """
            print(f"Executing query: {query}")  # Debug log
            cur.execute(query, (netid,))
            
            rentals = cur.fetchall()
            print(f"Found {len(rentals)} rentals")  # Debug log
            
            formatted_rentals = [{
                "id": row[0],
                "location": row[1],
                "cost": float(row[2]),
                "sq_ft": row[3],
                "start_date": row[4].strftime('%Y-%m-%d'),
                "lender": row[5],  # owner_name from query
                "status": row[6]
            } for row in rentals]
            
            return jsonify(formatted_rentals), 200
    except Exception as e:
        print(f"Error in get_current_rentals: {str(e)}")  # Debug log
        import traceback
        print(traceback.format_exc())  # Print full stack trace
        return jsonify({"error": f"Failed to fetch current rentals: {str(e)}"}), 500

@app.route('/api/rentals/history', methods=['GET'])
def get_rental_history():
    try:
        print("Getting rental history...")  # Debug log
        conn = get_db_connection()
        print("Database connection established")  # Debug log
        
        # Get the current user's netid
        if not auth.is_authenticated():
            print("User not authenticated")  # Debug log
            return jsonify({"error": "Not authenticated"}), 401
            
        netid = session['user_info']['user']
        print(f"User netid: {netid}")  # Debug log
        
        with conn.cursor() as cur:
            query = """
                SELECT sr.request_id, sl.location, sl.cost_per_month, sr.sq_ft_requested, 
                       sr.created_at, u.name as owner_name, sr.status
                FROM storage_requests sr
                JOIN storage_listings sl ON sr.listing_id = sl.listing_id
                JOIN users u ON sl.owner_id = u.user_id
                WHERE sr.renter_id = (SELECT user_id FROM users WHERE netid = %s)
                AND sr.status = 'completed'
                ORDER BY sr.created_at DESC;
            """
            print(f"Executing query: {query}")  # Debug log
            cur.execute(query, (netid,))
            
            rentals = cur.fetchall()
            print(f"Found {len(rentals)} rentals in history")  # Debug log
            
            formatted_rentals = [{
                "id": row[0],
                "location": row[1],
                "cost": float(row[2]),
                "sq_ft": row[3],
                "start_date": row[4].strftime('%Y-%m-%d'),
                "lender": row[5],  # owner_name from query
                "status": row[6]
            } for row in rentals]
            
            return jsonify(formatted_rentals), 200
    except Exception as e:
        print(f"Error in get_rental_history: {str(e)}")  # Debug log
        import traceback
        print(traceback.format_exc())  # Print full stack trace
        return jsonify({"error": f"Failed to fetch rental history: {str(e)}"}), 500

@app.route('/cas-validate')
def cas_validate():
    try:
        ticket = request.args.get('ticket')
        if not ticket:
            return jsonify({"error": "No ticket provided"}), 400

        service_url = url_for('cas_login', _external=True)
        user = auth.validate_ticket(ticket, service_url)
        
        if not user:
            return jsonify({"error": "Invalid ticket"}), 401

        # Store user info in session
        session['user_info'] = user
        
        # Check if user exists in database
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, user_type FROM users WHERE netid = %s", (user['user'],))
            user_record = cur.fetchone()
            
            if not user_record:
                # User doesn't exist, create them as a renter by default
                # They can be upgraded to lender status later if needed
                cur.execute(
                    "INSERT INTO users (netid, name, user_type) VALUES (%s, %s, 'renter') RETURNING user_id",
                    (user['user'], user.get('name', user['user']))
                )
                user_record = cur.fetchone()
                conn.commit()
                print(f"Created new user with netid {user['user']}")
            
            # Store user type in session for easy access
            session['user_type'] = 'renter'  # Default to renter for now
        
        # Get the return URL from cookie
        return_to = request.cookies.get('returnTo', '/')
        
        return redirect(return_to)
    except Exception as e:
        print(f"Error in cas_validate: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    args = parser.parse_args()
    app.debug = not args.production
    app.run(host="0.0.0.0", port=8000)
