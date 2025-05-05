from flask import Flask, jsonify, send_from_directory, session, redirect, url_for, request, render_template, abort, after_this_request
from config import Config
import dotenv
import os
import psycopg2
import argparse
import auth
import json
from werkzeug.utils import secure_filename
from decimal import Decimal
from psycopg2.extras import RealDictCursor
from datetime import datetime, date
import cloudinary
import cloudinary.uploader
import cloudinary.api
from flask_cas import CAS, login_required
from flask_wtf.csrf import CSRFProtect, CSRFError

# set up command-line argument parsing
parser = argparse.ArgumentParser(description="Run Flask app")
parser.add_argument(
    "--production", action="store_true", help="Run in production mode (disables debug)"
)

app = Flask(
    __name__,
    static_folder=os.path.abspath("build"),
    static_url_path=''
)

# Register CAS authentication routes
auth.init_auth(app)

@app.route('/welcome')
@login_required
def welcome():
    # Assign user type if not already set
    if 'user_type' not in session:
        if cas.username == 'cs-tigerstorage':
            session['user_type'] = 'admin'
        else:
            session['user_type'] = 'lender'
    return send_from_directory('build', 'index.html')

@app.route('/api/upload', methods=['POST']) 