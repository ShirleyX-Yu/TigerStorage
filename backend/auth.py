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
    if "user_info" in flask.session:
        user_info = flask.session.get("user_info")
        print(f"User already authenticated as: {user_info.get('user', 'unknown')}")
        # Make sure the session is marked as modified so Flask persists it
        flask.session.modified = True
        return user_info["user"]

    ticket = flask.request.args.get("ticket")
    if ticket is None:
        print("No ticket found, redirecting to CAS login")
        login_url = _CAS_URL + "login?service=" + urllib.parse.quote(flask.request.url)
        flask.abort(flask.redirect(login_url))

    print(f"Validating CAS ticket: {ticket[:10]}...")
    user_info = validate(ticket)
    if user_info is None:
        print("Ticket validation failed, redirecting to CAS login")
        login_url = (
            _CAS_URL
            + "login?service="
            + urllib.parse.quote(strip_ticket(flask.request.url))
        )
        flask.abort(flask.redirect(login_url))

    print(f"Ticket validation successful: {user_info.get('user', 'unknown')}")
    # Store user info in session and mark as permanent
    flask.session["user_info"] = user_info
    flask.session.permanent = True  # Make session persistent
    flask.session.modified = True   # Ensure session is saved
    
    # Preserve user type if it was specified in the query parameters
    user_type = flask.request.args.get("userType")
    if user_type:
        print(f"Setting user_type in session: {user_type}")
        flask.session["user_type"] = user_type
    
    clean_url = strip_ticket(flask.request.url)
    print(f"Redirecting to: {clean_url}")
    flask.abort(flask.redirect(clean_url))

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