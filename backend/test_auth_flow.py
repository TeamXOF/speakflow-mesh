"""Comprehensive session & cookie authentication + refresh test suite."""
import os
import sys

_DB_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ["DATABASE_URL"] = os.path.join(_DB_DIR, "test_auth_cookies.db")
if os.path.exists(os.environ["DATABASE_URL"]):
    try:
        os.remove(os.environ["DATABASE_URL"])
    except OSError:
        pass

from database.schema import init_db, get_db_connection
init_db()

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
passed = True

def check(label: str, cond: bool, extra: str = ""):
    global passed
    status = "[PASS]" if cond else "[FAIL]"
    print(f"{status} {label}" + (f" - {extra}" if extra else ""))
    passed = passed and cond
    return cond

print("\n--- Testing Cookie & Refresh Token Auth Flow ---")

# 1. Login with valid credentials
res = client.post("/api/auth/login", json={"username": "teacher", "password": "speakflow123"})
check("Login response status is 200", res.status_code == 200)
check("Login payload contains user", "user" in res.json() and res.json()["user"]["role"] == "teacher")
check("Login payload contains access_token", "access_token" in res.json())
check("Login payload contains refresh_token", "refresh_token" in res.json())
check("Login sets access_token cookie", "access_token" in client.cookies)
check("Login sets refresh_token cookie", "refresh_token" in client.cookies)

# 2. Access protected endpoint using ONLY cookies (no Authorization header)
res_me = client.get("/api/auth/me")
check("Access /api/auth/me via cookie returns 200", res_me.status_code == 200)
check("User profile returned from cookie auth", res_me.json().get("user", {}).get("username") == "teacher")

# 3. Access protected v1 endpoint via cookie
res_overview = client.get("/api/v1/classroom/overview")
check("Access /api/v1/classroom/overview via cookie returns 200", res_overview.status_code == 200)

# 4. Refresh token flow via cookie
res_refresh = client.post("/api/auth/refresh")
check("POST /api/auth/refresh via cookie returns 200", res_refresh.status_code == 200)
check("Refresh issues new access_token", bool(res_refresh.json().get("access_token")))
check("Updated access_token cookie present", "access_token" in client.cookies)

# 5. Refresh token flow via JSON payload (e.g. for non-cookie / mobile clients)
raw_refresh = client.cookies.get("refresh_token")
anon_client = TestClient(app)
res_payload_refresh = anon_client.post("/api/auth/refresh", json={"refresh_token": raw_refresh})
check("POST /api/auth/refresh via body returns 200", res_payload_refresh.status_code == 200)
check("Payload refresh returns new access token", bool(res_payload_refresh.json().get("access_token")))

# 6. Invalid / expired refresh token fails with 401
res_bad_refresh = anon_client.post("/api/auth/refresh", json={"refresh_token": "non-existent-token"})
check("Invalid refresh token returns 401", res_bad_refresh.status_code == 401)
check("Error code indicates invalid refresh", res_bad_refresh.json().get("error", {}).get("code") == "REFRESH_TOKEN_EXPIRED")

# 7. Unauthenticated request without cookies or headers returns 401
unauth_client = TestClient(app)
res_unauth = unauth_client.get("/api/auth/me")
check("Unauthenticated request returns 401", res_unauth.status_code == 401)

# 8. Simulate Axios 401 Interceptor flow:
# Make request with expired/tampered access token -> receives 401 -> calls refresh -> retries original request
sim_client = TestClient(app)
# Login
sim_client.post("/api/auth/login", json={"username": "teacher", "password": "speakflow123"})
# Expire access token in database to accurately simulate token expiry
with get_db_connection() as conn:
    conn.execute("UPDATE auth_tokens SET expires_at = datetime('now', '-10 minutes') WHERE token_type = 'access'")
    conn.commit()

tampered_res = sim_client.get("/api/auth/me")
check("Expired access token produces 401", tampered_res.status_code == 401, f"status={tampered_res.status_code}")

# Interceptor runs refresh automatically:
refresh_step = sim_client.post("/api/auth/refresh")
check("Interceptor refresh step succeeds", refresh_step.status_code == 200)
retry_step = sim_client.get("/api/auth/me")
check("Interceptor retried request succeeds with 200", retry_step.status_code == 200, f"status={retry_step.status_code} {retry_step.text}")

# 9. Logout clears cookies and revokes tokens
res_logout = sim_client.post("/api/auth/logout")
check("Logout returns ok", res_logout.status_code == 200 and res_logout.json().get("ok") is True)
res_after_logout = sim_client.get("/api/auth/me")
check("Request after logout returns 401", res_after_logout.status_code == 401)

print("\n--- Summary ---")
print("ALL COOKIE & REFRESH TOKEN TESTS:", "PASSED" if passed else "FAILED")
if not passed:
    sys.exit(1)
