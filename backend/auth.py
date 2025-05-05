# CAS authentication is now handled by flask-cas in app.py
# This file previously contained custom CAS logic, which has been removed.
# Keep any non-CAS utility functions here if needed.

import urllib.request
import urllib.parse
import re
import json
import flask
import ssl
import os
from urllib.parse import urlparse

_CAS_URL = "https://fed.princeton.edu/cas/"

def strip_ticket(url):
    if url is None:
        return "something is badly wrong"
    url = re.sub(r"ticket=[^&]*&?", "", url)
    url = re.sub(r"\?&?$|&$", "", url)
    return url

# Create an SSL context that ignores certificate verification (for development only)
context = ssl._create_unverified_context()

def validate(ticket):
    val_url = (
        _CAS_URL
        + "validate"
        + "?service="
        + urllib.parse.quote(strip_ticket(flask.request.url))
        + "&ticket="
        + urllib.parse.quote(ticket)
        + "&format=json"
    )
    
    # Use SSL context to bypass certificate verification (only for development)
    with urllib.request.urlopen(val_url, context=context) as flo:
        result = json.loads(flo.read().decode("utf-8"))

    if (not result) or ("serviceResponse" not in result):
        return None

    service_response = result["serviceResponse"]

    if "authenticationSuccess" in service_response:
        user_info = service_response["authenticationSuccess"]
        return user_info

    if "authenticationFailure" in service_response:
        print("CAS authentication failure:", service_response)
        return None

    print("Unexpected CAS response:", service_response)
    return None

def authenticate():
    # First check if user_info is already in session
    if "user_info" in flask.session:
        user_info = flask.session.get("user_info")
        print(f"User already authenticated as: {user_info.get('user', 'unknown')}")
        flask.session.permanent = True  # Make session persistent
        flask.session.modified = True   # Force the session to be saved
        return user_info["user"]

    # Check for CAS ticket in URL
    ticket = flask.request.args.get("ticket")
    if ticket is None:
        print("No CAS ticket found, redirecting to CAS login")
        # If no ticket, redirect to CAS login
        login_url = _CAS_URL + "login?service=" + urllib.parse.quote(flask.request.url)
        flask.abort(flask.redirect(login_url))

    # If we have a ticket, validate it
    print(f"Validating CAS ticket: {ticket[:10]}...")
    user_info = validate(ticket)
    if user_info is None:
        print("CAS ticket validation failed, redirecting to CAS login")
        login_url = (
            _CAS_URL
            + "login?service="
            + urllib.parse.quote(strip_ticket(flask.request.url))
        )
        flask.abort(flask.redirect(login_url))

    # Normalize NetID to lowercase
    if "user" in user_info:
        user_info["user"] = user_info["user"].lower()

    # Set user_type to 'admin' for cs-tigerstorage, else default to 'lender'
    if user_info.get("user") == "cs-tigerstorage":
        user_info["user_type"] = "admin"
        flask.session["user_type"] = "admin"
    else:
        user_info["user_type"] = "lender"
        flask.session["user_type"] = "lender"

    # Store authentication info in session
    print(f"CAS authentication successful for user: {user_info.get('user', 'unknown')}")
    flask.session["user_info"] = user_info
    flask.session.permanent = True  # Make session persistent
    flask.session.modified = True   # Force the session to be saved
    
    # Store user type from query parameters if available
    user_type = flask.request.args.get("userType")
    if user_type:
        print(f"Setting user_type in session: {user_type}")
        flask.session["user_type"] = user_type
        flask.session.modified = True
    
    # Redirect to clean URL without ticket
    clean_url = strip_ticket(flask.request.url)
    print(f"Redirecting to: {clean_url}")
    flask.abort(flask.redirect(clean_url))

    # This line won't be reached due to the abort above,
    # but it's here to make the function's intent clear
    return user_info.get('user', '')

def is_authenticated():
    return "user_info" in flask.session

def is_safe_redirect_url(target):
    ref_url = urlparse(flask.request.host_url)
    test_url = urlparse(target)
    return not test_url.netloc or test_url.netloc == ref_url.netloc

def init_auth(app):
    @app.route("/api/logoutcas", methods=["GET"])
    def logoutcas():
        # Always use backend URL for service
        backend_url = flask.request.url_root.rstrip('/')
        logout_url = (
            _CAS_URL
            + "logout?service="
            + urllib.parse.quote(backend_url + "/api/logoutapp")
        )
        flask.abort(flask.redirect(logout_url))

    @app.route("/api/logoutapp", methods=["GET"])
    def logoutapp():
        flask.session.clear()
        # Always redirect to backend root
        backend_url = flask.request.url_root.rstrip('/')
        return flask.redirect(backend_url)

    @app.route('/api/auth/logout')
    def logout():
        """Logout route that clears the session and redirects to CAS logout"""
        flask.session.clear()
        backend_url = flask.request.url_root.rstrip('/')
        redirect_uri = flask.request.args.get('redirectUri', '/')
        if not is_safe_redirect_url(redirect_uri):
            redirect_uri = '/'
        cas_logout_url = f"{_CAS_URL}logout?service={backend_url}{redirect_uri}"
        return flask.redirect(cas_logout_url)

    @app.route('/api/auth/status', methods=['GET', 'OPTIONS'])
    def auth_status():
        """Check if the user is authenticated"""
        if flask.request.method == 'OPTIONS':
            return '', 204
        authenticated = is_authenticated()
        user_info = flask.session.get('user_info', {})
        username = user_info.get('user', '')
        user_type = flask.session.get('user_type', '')
        return flask.jsonify({
            'authenticated': authenticated,
            'username': username,
            'userType': user_type
        })

    @app.route('/api/auth/login')
    def login():
        user_type = flask.request.args.get('userType')
        if user_type:
            flask.session['user_type'] = user_type
            flask.session.permanent = True
        if is_authenticated():
            redirect_uri = flask.request.args.get('redirectUri', '/')
            if not is_safe_redirect_url(redirect_uri):
                redirect_uri = '/'
            return flask.redirect(redirect_uri)
        return authenticate()