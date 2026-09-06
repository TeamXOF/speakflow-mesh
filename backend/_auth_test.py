"""Auth + RBAC end-to-end test."""

import os
# ISOLATION GUARD: test suites must NEVER touch the real database.
# Set before any app import (dotenv does not override existing env vars).
_DB_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ["DATABASE_URL"] = os.path.join(_DB_DIR, "test_suite.db")
if os.path.exists(os.environ["DATABASE_URL"]):
    os.remove(os.environ["DATABASE_URL"])  # always start clean
import json
import time
from dotenv import load_dotenv
load_dotenv()

# Unique usernames per run so the suite is idempotent against a persisted DB
RUN = str(int(time.time()))[-6:]
KID_USER = f"testkid{RUN}"
KID2_USER = f"kid2{RUN}"
from database.schema import init_db
init_db()
from fastapi.testclient import TestClient
from main import app
client = TestClient(app)
ok = True
def check(label, cond, extra=""):
    global ok
    print(("PASS " if cond else "FAIL ") + label + (f" — {extra}" if str(extra)[:0] else (f" — {extra}" if extra else "")))
    ok = ok and cond

# 1. Teacher login (seeded)
r = client.post("/api/auth/login", json={"username": "teacher", "password": "speakflow123"})
check("teacher login", r.status_code == 200 and r.json()["user"]["role"] == "teacher", r.text[:80])
ttoken = r.json()["token"]
TH = {"Authorization": f"Bearer {ttoken}"}

# 2. Wrong password
r = client.post("/api/auth/login", json={"username": "teacher", "password": "nope"})
check("wrong password rejected", r.status_code == 401)

# 3. Student registers -> pending
r = client.post("/api/auth/register", json={"name": "Test Kid", "username": KID_USER, "password": "kid123"})
check("student registration pending", r.status_code == 200 and r.json()["status"] == "pending", r.text[:80])

# 4. Pending student cannot log in
r = client.post("/api/auth/login", json={"username": KID_USER, "password": "kid123"})
check("pending login blocked", r.status_code == 403 and "approval" in r.json()["error"]["message"])

# 5. Teacher sees pending queue
r = client.get("/api/auth/users", headers=TH)
pending = [u for u in r.json() if u["status"] == "pending"]
check("teacher lists pending", any(u["username"] == KID_USER for u in pending), f"{len(pending)} pending")
kid_id = next(u["id"] for u in r.json() if u["username"] == KID_USER)

# 6. Student token cannot access teacher endpoints
r = client.get("/api/auth/users")
check("unauthenticated users list blocked", r.status_code in (401, 403))

# 7. Approve -> linked student row created
r = client.post(f"/api/auth/users/{kid_id}/approve", headers=TH)
check("approve creates student link", r.status_code == 200 and r.json().get("student_id"), r.text[:80])
kid_student_id = r.json()["student_id"]

# 8. Student logs in now
r = client.post("/api/auth/login", json={"username": KID_USER, "password": "kid123"})
check("approved student login", r.status_code == 200 and r.json()["user"]["student_id"] == kid_student_id)
ktoken = r.json()["token"]
KH = {"Authorization": f"Bearer {ktoken}"}

# 9. Student can create a session FOR THEMSELVES (forced binding)
r = client.post("/api/v1/sessions", headers=KH, json={"student_id": "someone-else", "story_id": "story_forest_01", "language": "en"})
check("student session forced to own id", r.status_code == 201 and r.json()["student_id"] == kid_student_id, r.json().get("student_id", ""))

# 10. Student cannot view another student's dashboard
r = client.get("/api/v1/students/student-1/dashboard", headers=KH)
check("student blocked from others' dashboard", r.status_code == 403)
r = client.get(f"/api/v1/students/{kid_student_id}/dashboard", headers=KH)
check("student sees own dashboard", r.status_code == 200)

# 11. Student cannot access classroom overview; teacher can
r = client.get("/api/v1/classroom/overview", headers=KH)
check("student blocked from classroom overview", r.status_code == 403)
r = client.get("/api/v1/classroom/overview", headers=TH)
check("teacher sees classroom overview", r.status_code == 200)

# 12. Unauthenticated session creation blocked
r = client.post("/api/v1/sessions", json={"student_id": "student-1", "story_id": "story_forest_01", "language": "en"})
check("unauthenticated session blocked", r.status_code == 401)

# 13. Reject flow
r = client.post("/api/auth/register", json={"name": "Second Kid", "username": KID2_USER, "password": "kid234"})
r = client.get("/api/auth/users", headers=TH)
kid2 = next(u["id"] for u in r.json() if u["username"] == KID2_USER)
r = client.post(f"/api/auth/users/{kid2}/reject", headers=TH)
r = client.post("/api/auth/login", json={"username": KID2_USER, "password": "kid234"})
check("rejected login blocked", r.status_code == 403 and "not approved" in r.json()["error"]["message"])

print("AUTH TEST:", "PASSED" if ok else "FAILED")
