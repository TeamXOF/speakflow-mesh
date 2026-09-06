# -*- coding: utf-8 -*-
"""SpeakFlow — full A-to-Z verification: both roles, both languages, every panel,
the RBAC matrix, and real-audio runs. Run from backend/ with servers live."""
import json, time, urllib.request, urllib.error, sqlite3, os

BASE = "http://127.0.0.1:8000"
PASS, FAIL = "✅", "❌"
results = {"pass": 0, "fail": 0}

def check(label, cond, extra=""):
    if cond: results["pass"] += 1
    else: results["fail"] += 1
    print(f"{PASS if cond else FAIL} {label}" + (f" — {extra}" if extra else ""))

def req(method, path, token=None, body=None, timeout=180):
    r = urllib.request.Request(BASE + path, method=method)
    if token: r.add_header("Authorization", f"Bearer {token}")
    data = None
    if body is not None:
        r.add_header("Content-Type", "application/json"); data = json.dumps(body).encode()
    try:
        with urllib.request.urlopen(r, data, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b"{}")
        except Exception: return e.code, {}

print("=" * 70)
print("PHASE 1 — AUTHENTICATION (provided credentials)")
print("=" * 70)
s, t_login = req("POST", "/api/auth/login", body={"username": "waleedkhalid", "password": "Onepunch"})
check("student login waleedkhalid/Onepunch", s == 200, f"HTTP {s}")
stok = t_login.get("token") if s == 200 else None
stu_id = t_login.get("user", {}).get("student_id") if s == 200 else None
check("student linked to roster", bool(stu_id), str(stu_id))
s, t_login = req("POST", "/api/auth/login", body={"username": "teacher", "password": "speakflow123"})
check("teacher login teacher/speakflow123", s == 200)
ttok = t_login["token"]

print("=" * 70)
print("PHASE 2 — STUDENT, ENGLISH, EVERY PANEL")
print("=" * 70)
# Story Mode: stories → session EN → phase1 → phase2 poll → detail
s, stories = req("GET", "/api/v1/stories?student_id=" + (stu_id or ""), stok)
check("stories catalog (EN view)", s == 200 and len(stories) == 3 and stories[0]["locked"] is False)
s, r = req("POST", "/api/v1/sessions", stok, {"student_id": stu_id, "story_id": "story_forest_01", "language": "en"})
check("create EN story session", s == 201 and len(r.get("checkpoints", [])) == 5)
sid_en = r.get("session_id")
cps = r["checkpoints"]
w1 = cps[0]["target_text"].replace(".", "").split()
w1[w1.index("fox")] = "fax"
s, p1 = req("POST", f"/api/v1/sessions/{sid_en}/analyze-mock", stok,
            {"checkpoint_id": "cp_1", "words": w1, "word_probabilities": {"fax": 0.5},
             "extra_pauses_ms": [600]})
check("EN phase-1 analysis (mispronunciation + hesitation)", s == 200 and p1.get("passed") is not None
      and any(not w["correct"] for w in p1["words"]) and len(p1.get("hesitations", [])) >= 1)
p2 = None
for _ in range(20):
    time.sleep(1)
    s, fb = req("GET", f"/api/v1/sessions/{sid_en}/feedback/cp_1", stok)
    if s == 200 and fb.get("feedback_text"): p2 = fb; break
check("EN phase-2 feedback arrives", p2 is not None, (p2 or {}).get("feedback_source", ""))
for cp in cps[1:]:
    req("POST", f"/api/v1/sessions/{sid_en}/analyze-mock", stok,
        {"checkpoint_id": cp["checkpoint_id"], "words": cp["target_text"].replace(".", "").split()})
time.sleep(3)
s, det = req("GET", f"/api/v1/sessions/{sid_en}", stok)
check("EN session completes (5/5, is_complete)", det.get("totals", {}).get("is_complete") is True)
# My Progress
s, d = req("GET", f"/api/v1/students/{stu_id}/dashboard?range=all", stok)
check("My Progress dashboard (student, own)", s == 200 and d.get("summary"))
check("My Progress merges classic + story", d["summary"].get("classic_sessions", 0) >= 0 and d["summary"].get("story_sessions", 0) >= 1)
check("My Progress trend + struggling + sounds", isinstance(d.get("trend"), list) and "struggling_words" in d and "phoneme_errors" in d)
s, pm = req("GET", f"/api/v1/students/{stu_id}/parent-message", stok)
check("Parent update message (own)", s == 200 and bool(pm.get("message")))
# Practice Center (personal + trends)
s, lib = req("GET", "/api/v1/practice/library", stok)
check("Practice Center (personal scope)", s == 200 and lib.get("scope") == "student")
check("Practice Center progress trends", isinstance(lib.get("progress", {}).get("improving"), list))
# Word tips
s, tip = req("GET", "/api/v1/words/tip?word=fox&lang=en&mismatch=unclear&spoken=fax", stok)
check("Word tip (EN)", s == 200 and bool(tip.get("tip")))

print("=" * 70)
print("PHASE 3 — STUDENT, URDU, EVERY PANEL")
print("=" * 70)
s, r = req("POST", "/api/v1/sessions", stok, {"student_id": stu_id, "story_id": "story_forest_01", "language": "ur"})
check("create UR story session", s == 201)
sid_ur = r["session_id"]
ucp = r["checkpoints"][0]["target_text"]
uwords = ucp.replace("۔", "").split()
uwords[1] = uwords[1][:-1] if len(uwords[1]) > 3 else uwords[1]
s, p1u = req("POST", f"/api/v1/sessions/{sid_ur}/analyze-mock", stok,
             {"checkpoint_id": "cp_1", "words": uwords, "extra_pauses_ms": [500]})
check("UR phase-1 analysis", s == 200 and len(p1u.get("words", [])) == len(uwords))
p2u = None
for _ in range(20):
    time.sleep(1)
    s, fb = req("GET", f"/api/v1/sessions/{sid_ur}/feedback/cp_1", stok)
    if s == 200 and fb.get("feedback_text"): p2u = fb; break
check("UR phase-2 feedback in Urdu", p2u is not None and any("\u0600" <= ch <= "\u06FF" for ch in (p2u.get("feedback_text") or "")),
      (p2u.get("feedback_text") or "")[:50])
for cp in r["checkpoints"][1:]:
    req("POST", f"/api/v1/sessions/{sid_ur}/analyze-mock", stok,
        {"checkpoint_id": cp["checkpoint_id"], "words": cp["target_text"].replace("۔", "").split()})
import urllib.parse
_q = urllib.parse.quote("لومڑ") + "&mismatch=" + urllib.parse.quote("د_vs_ڈ")
s, tipu = req("GET", "/api/v1/words/tip?word=" + _q + "&lang=ur", stok)
check("Word tip (UR)", s == 200 and bool(tipu.get("tip")))
s, libu = req("GET", "/api/v1/practice/library", stok)
check("Practice Center includes UR data", s == 200 and any(
    any("\u0600" <= ch <= "\u06FF" for ch in w) for e in libu.get("exercises", []) for w in e.get("words", [])))
s, du = req("GET", f"/api/v1/students/{stu_id}/dashboard?range=all", stok)
ur_sessions = [x for x in du.get("recent_sessions", []) if x.get("language") == "ur"]
check("My Progress shows UR session", len(ur_sessions) >= 1)
# classic engine UR
s, sent = req("GET", "/pipeline/sentences?difficulty=medium&count=5&language=ur")
check("Classic UR sentence generation", s == 200 and len(sent.get("sentences", [])) == 5
      and any("\u0600" <= ch <= "\u06FF" for ch in sent["sentences"][0]))
target_ur = sent["sentences"][0]
mock_ur = {"transcript": target_ur, "words_spoken": [
    {"word": w, "start": 0.3 + i * 0.4, "end": 0.6 + i * 0.4, "duration_ms": 300, "probability": 0.9}
    for i, w in enumerate(target_ur.replace("۔", "").split())],
    "wpm": 80, "pause_count": 0, "pauses": [], "repetition_count": 0, "hesitation_count": 0,
    "pitch_variance": 900.0, "pitch_series": [210], "pause_durations": [], "session_duration_seconds": 5,
    "accuracy_trend": "stable", "grade": 3, "target_sentence": target_ur, "language": "ur"}
s, res_ur = req("POST", "/pipeline/run", body={"student_id": stu_id, "target_sentence": target_ur,
                                               "language": "ur", "mocked_signal_data": mock_ur})
check("Classic UR full pipeline (5 agents)", s == 200 and len((res_ur.get("diagnosis") or {})) == 5)
check("Classic UR practice in Urdu", any("\u0600" <= ch <= "\u06FF" for ch in
      ((res_ur.get("diagnosis") or {}).get("practice", {}).get("encouraging_note") or "")))
# classic EN real audio (Groq live)
import base64
audio_b64 = base64.b64encode(open("../Audios/part # 1.mp3", "rb").read()).decode()
s, res_en = req("POST", "/pipeline/run", body={"student_id": stu_id, "target_sentence": "Test sentence.",
                                               "language": "en", "audio_base64": audio_b64}, timeout=300)
check("Classic EN real-audio Groq STT (live)", s == 200 and res_en.get("stt_source") == "groq"
      and len(res_en.get("words", [])) > 0, f"{len(res_en.get('words', []))} words scored")

print("=" * 70)
print("PHASE 4 — TEACHER, EVERY PANEL")
print("=" * 70)
s, roster = req("GET", "/api/v1/teacher/roster", ttok)
check("Roster (real stats)", s == 200 and any(r["name"] == "Waleed Khalid" for r in roster))
s, ov = req("GET", "/api/v1/classroom/overview", ttok)
check("Classroom overview (totals/weekly/heatmap/15 cps)", s == 200 and len(ov.get("checkpoint_progress", [])) == 15)
s, rep = req("GET", "/api/v1/reports", ttok)
check("Reports", s == 200 and len(rep.get("reports", [])) >= 1)
s, libt = req("GET", "/api/v1/practice/library", ttok)
check("Practice Center (class view)", s == 200 and libt.get("scope") == "class")
s, users = req("GET", "/api/auth/users", ttok)
check("User approvals list", s == 200)
s, keys = req("GET", "/api/v1/config/keys", ttok)
check("API keys status", s == 200 and keys.get("groq_configured") and keys.get("google_configured"))
s, syncs = req("GET", "/api/v1/sync/status", ttok)
check("Sync status", s == 200)
s, g1 = req("GET", "/api/sessions/", ttok)
check("Sessions list (Gen-1)", s == 200)
s, v2s = req("GET", "/api/v1/sessions", ttok)
check("Sessions list (Story)", s == 200)
# parent toggle round-trip on Waleed
s, r1 = req("POST", f"/api/v1/teacher/students/{stu_id}/parent-toggle", ttok, {"enabled": False})
s, r2 = req("POST", f"/api/v1/teacher/students/{stu_id}/parent-toggle", ttok, {"enabled": True})
check("Parent toggle round-trip", s == 200 and r2.get("parent_update_enabled") is True)

print("=" * 70)
print("PHASE 5 — RBAC MATRIX")
print("=" * 70)
for method, path, want in [
    ("GET", "/api/v1/teacher/roster", 403), ("GET", "/api/v1/classroom/overview", 403),
    ("GET", "/api/v1/reports", 403), ("GET", "/api/auth/users", 403),
    ("GET", "/api/v1/config/keys", 403),
    ("POST", f"/api/v1/teacher/students/{stu_id}/parent-toggle", 403),
    ("GET", "/api/v1/students/student-1/dashboard", 403),
    ("GET", f"/api/v1/students/{stu_id}/parent-message", 200),
    ("GET", "/api/v1/practice/library", 200),
    ("GET", "/api/v1/stories", 200), ("GET", "/api/v1/health", 200),
]:
    s, r = req(method, path, stok, {"enabled": True} if method == "POST" else None)
    check(f"student {method} {path[:48]} -> {want}", s == want, f"got {s}")
s, r = req("POST", "/api/v1/sessions", body={"student_id": stu_id, "story_id": "story_forest_01", "language": "en"})
check("unauthenticated session create -> 401", s == 401)
s, r = req("GET", f"/api/v1/students/{stu_id}/dashboard")
check("unauthenticated dashboard -> 401", s == 401)
# self-binding force
s, r = req("POST", "/api/v1/sessions", stok, {"student_id": "student-1", "story_id": "story_forest_01", "language": "en"})
check("student session force-bound to own id", s == 201 and r.get("student_id") == stu_id)
# temp student approve flow (teacher)
RUN = str(int(time.time()))[-6:]
req("POST", "/api/auth/register", body={"name": "RBAC Temp", "username": f"rbac{RUN}", "password": "temp123"})
users = req("GET", "/api/auth/users", ttok)[1]
tuid = next(u["id"] for u in users if u["username"] == f"rbac{RUN}")
s, r = req("POST", f"/api/auth/users/{tuid}/approve", ttok)
check("teacher approves new student (link created)", s == 200 and r.get("student_id"))
s, r = req("POST", f"/api/auth/users/{tuid}/reject", ttok)
check("teacher reject flow", s == 200)

print("=" * 70)
print(f"RESULT: {results['pass']} passed, {results['fail']} failed")
print("=" * 70)
