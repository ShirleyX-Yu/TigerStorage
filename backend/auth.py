import urllib.request
import urllib.parse
import re
import json
import flask
import ssl

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
        return user_info["user"]

    ticket = flask.request.args.get("ticket")
    if ticket is None:
        login_url = _CAS_URL + "login?service=" + urllib.parse.quote(flask.request.url)
        flask.abort(flask.redirect(login_url))

    user_info = validate(ticket)
    if user_info is None:
        login_url = (
            _CAS_URL
            + "login?service="
            + urllib.parse.quote(strip_ticket(flask.request.url))
        )
        flask.abort(flask.redirect(login_url))

    flask.session["user_info"] = user_info
    clean_url = strip_ticket(flask.request.url)
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
        return flask.redirect("/")