from flask import Flask, jsonify, send_from_directory, session, redirect, url_for, request, render_template
from flask_cors import CORS
import dotenv
import os
import psycopg2
import argparse
from flask_cas import CAS, login_required

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
    r"/*": {  # Allow CORS for all routes
        "origins": ["http://localhost:5173"],  # Your frontend URL
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Load environment variables and set secret key
dotenv.load_dotenv()
app.secret_key = os.environ.get("APP_SECRET_KEY", "dev-key-please-change")

# CAS configuration
app.config['CAS_SERVER'] = 'https://fed.princeton.edu/cas'
app.config['CAS_AFTER_LOGIN'] = 'welcome'
app.config['CAS_TOKEN_SESSION_KEY'] = '_CAS_TOKEN'
app.config['CAS_USERNAME_SESSION_KEY'] = 'CAS_USERNAME'
app.config['CAS_ATTRIBUTES_SESSION_KEY'] = 'CAS_ATTRS'

# Initialize CAS
cas = CAS(app)

@app.route('/cas/login')
def cas_login():
    userType = request.args.get('userType', 'renter')
    session['userType'] = userType
    return cas.login()

@app.route('/cas/logout')
def cas_logout():
    session.clear()
    return cas.logout()

@app.route('/welcome')
@login_required
def welcome():
    # After successful CAS login, redirect to the frontend with user type
    userType = session.get('userType', 'renter')
    return redirect(f'http://localhost:5173/welcome?userType={userType}')

@app.route('/api/user')
def get_user():
    if cas.username:
        userType = session.get('userType', 'renter')
        return jsonify({
            'authenticated': True,
            'username': cas.username,
            'userType': userType
        })
    return jsonify({'authenticated': False})

# Serve static files in production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(os.path.join('build', path)):
        return send_from_directory('build', path)
    return send_from_directory('build', 'index.html')

if __name__ == "__main__":
    args = parser.parse_args()
    app.debug = not args.production
    app.run(host="0.0.0.0", port=8000)
