import urllib.request
import urllib.parse
import re
import json
import flask
import ssl
import os

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

def init_auth(app):
    @app.route("/api/logoutcas", methods=["GET"])
    def logoutcas():
        logout_url = (
            _CAS_URL
            + "logout?service="
            + urllib.parse.quote(re.sub("logoutcas", "logoutapp", flask.request.url))
        )
        flask.abort(flask.redirect(logout_url))

    @app.route("/api/logoutapp", methods=["GET"])
    def logoutapp():
        flask.session.clear()
        
        # Determine the frontend URL based on request origin or environment variable
        frontend_url = os.environ.get('FRONTEND_URL')
        
        # If FRONTEND_URL is not set, try to determine it from the request origin
        if not frontend_url:
            # Get the origin (scheme + host + port) from where the request came 
            # Check Referer header first (more likely to be present in logout context)
            referer = flask.request.headers.get('Referer')
            if referer:
                # Extract origin from referer
                from urllib.parse import urlparse
                parsed_uri = urlparse(referer)
                frontend_url = f"{parsed_uri.scheme}://{parsed_uri.netloc}"
            else:
                # Try Origin header as fallback
                origin = flask.request.headers.get('Origin')
                if origin:
                    frontend_url = origin
                else:
                    # Default to localhost:5173 if we can't determine the origin
                    frontend_url = 'http://localhost:5173'
        
        # Remove trailing slash if present
        frontend_url = frontend_url.rstrip('/')
        
        print(f"Logging out and redirecting to: {frontend_url}")
        return flask.redirect(frontend_url)

@app.route('/api/auth/logout')
def logout():
    """Logout route that clears the session and redirects to CAS logout"""
    # Clear the session
    flask.session.clear()
    
    # Get the redirect URI from the request
    redirect_uri = flask.request.args.get('redirectUri', '')
    
    # If we're in production, use CAS logout
    if not flask.current_app.debug:
        # Construct the CAS logout URL with the redirect URI
        cas_logout_url = f"{_CAS_URL}logout?service={redirect_uri}"
        # Redirect to CAS logout
        return flask.redirect(cas_logout_url)
    else:
        # In development, just redirect to the home page
        return flask.redirect(redirect_uri or '/')