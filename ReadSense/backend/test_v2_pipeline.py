"""
SpeakFlow v2 — end-to-end pipeline test (no microphone required).

Exercises the full roadmap contract against the real backend using the
analyze-mock dev path (same Phase-1 scoring + Phase-2 feedback machinery,
with a supplied transcript instead of audio).

Run from backend/:
  python test_v2_pipeline.py
"""

import os
# ISOLATION GUARD: test suites must NEVER touch the real database.
# Set before any app import (dotenv does not override existing env vars).
_DB_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ["DATABASE_URL"] = os.path.join(_DB_DIR, "test_suite.db")
if os.path.exists(os.environ["DATABASE_URL"]):
    os.remove(os.environ["DATABASE_URL"])  # always start clean

import asyncio
import json
from dotenv import load_dotenv
load_dotenv()

from fastapi.testclient import TestClient
from main import app
from database.schema import init_db

init_db()  # TestClient without a context manager doesn't run startup events

client = TestClient(app)

PASS, FAIL = "✅", "❌"


def check(label: str, cond: bool, extra: str = ""):
    print(f"{PASS if cond else FAIL} {label}" + (f" — {extra}" if extra else ""))
    return cond


def main():
    results_ok = True

    # ── 0. Login (POST /api/v1/sessions requires an authenticated user) ─────
    r = client.post("/api/auth/login",
                    json={"username": "teacher", "password": "speakflow123"})
    results_ok &= check("teacher login -> 200", r.status_code == 200)
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    # ── 1. Health ────────────────────────────────────────────────────────────
    r = client.get("/api/v1/health")
    check("GET /api/v1/health -> 200", r.status_code == 200)
    health = r.json()
    print("   ", json.dumps(health))
    results_ok &= check("health has mode", "mode" in health)

    # ── 2. Stories ───────────────────────────────────────────────────────────
    r = client.get("/api/v1/stories", params={"student_id": "student-1"})
    check("GET /api/v1/stories -> 200", r.status_code == 200)
    stories = r.json()
    results_ok &= check("3 stories defined", len(stories) == 3,
                        f"got {len(stories)}")
    first_unlocked = stories[0]["locked"] is False
    results_ok &= check("first story unlocked", first_unlocked)

    # ── 3. Create session ────────────────────────────────────────────────────
    r = client.post("/api/v1/sessions", headers=headers, json={
        "student_id": "student-1", "story_id": "story_forest_01", "language": "en"})
    check("POST /api/v1/sessions -> 201", r.status_code == 201)
    session = r.json()
    sid = session["session_id"]
    results_ok &= check("session has 5 checkpoints",
                        len(session["checkpoints"]) == 5)
    print("    session:", sid)

    # ── 4. Phase 1 (mock transcript: one wrong word + one pause) ─────────────
    target = session["checkpoints"][0]["target_text"]  # "The little fox woke up early in the morning."
    print("    target:", target)
    words = target.replace(".", "").split()
    words[2] = "fax"  # deliberate mispronunciation of 'fox'
    r = client.post(f"/api/v1/sessions/{sid}/analyze-mock", json={
        "checkpoint_id": "cp_1",
        "words": words,
        "word_probabilities": {"fax": 0.55},
        "extra_pauses_ms": [650],
    })
    check("POST analyze-mock -> 200", r.status_code == 200, r.text[:200] if r.status_code != 200 else "")
    p1 = r.json()
    results_ok &= check("phase == 1", p1.get("phase") == 1)
    results_ok &= check("transcript present", bool(p1.get("transcript")))
    results_ok &= check("per-word list returned",
                        len(p1.get("words", [])) == len(words))
    bad = [w for w in p1["words"] if not w["correct"]]
    results_ok &= check("mispronounced word flagged", len(bad) >= 1,
                        f"flagged: {[w['word'] for w in bad]}")
    results_ok &= check("hesitation detected", len(p1.get("hesitations", [])) >= 1)
    results_ok &= check("stt_source tagged",
                        p1.get("stt_source") in ("groq", "local_fallback"))
    results_ok &= check("latency breakdown present",
                        isinstance(p1.get("latency_ms"), dict))
    print("    accuracy:", p1.get("accuracy"), "stars:", p1.get("stars"),
          "passed:", p1.get("passed"))

    # ── 5. Phase 2 via polling (Gemini or template fallback) ─────────────────
    import time
    p2 = None
    for _ in range(20):
        time.sleep(1)
        r = client.get(f"/api/v1/sessions/{sid}/feedback/cp_1")
        if r.status_code == 200:
            body = r.json()
            if body.get("feedback_text"):
                p2 = body
                break
    if p2:
        check("GET feedback -> Phase 2 payload", True)
        results_ok &= check("feedback_source tagged",
                            p2.get("feedback_source") in ("gemini", "template_fallback"),
                            p2.get("feedback_source"))
        print("    feedback:", (p2.get("feedback_text") or "")[:120])
        print("    engagement:", p2.get("engagement_state"))
    else:
        check("GET feedback -> Phase 2 payload", False, "timed out after 20s")
        results_ok = False

    # ── 6. Remaining checkpoints (flawless mock reads) ───────────────────────
    for cp in session["checkpoints"][1:]:
        words = cp["target_text"].replace(".", "").split()
        client.post(f"/api/v1/sessions/{sid}/analyze-mock",
                    json={"checkpoint_id": cp["checkpoint_id"], "words": words})
    time.sleep(3)

    # ── 7. Session detail + totals ───────────────────────────────────────────
    r = client.get(f"/api/v1/sessions/{sid}")
    check("GET session detail -> 200", r.status_code == 200)
    detail = r.json()
    totals = detail.get("totals", {})
    results_ok &= check("session complete", totals.get("is_complete") is True,
                        json.dumps(totals))
    results_ok &= check("stars accumulated", (totals.get("stars") or 0) > 0,
                        f"{totals.get('stars')} stars")

    # ── 8. Student dashboard ─────────────────────────────────────────────────
    r = client.get("/api/v1/students/student-1/dashboard",
                   headers=headers, params={"range": "all"})
    check("GET student dashboard -> 200", r.status_code == 200)
    dash = r.json()
    results_ok &= check("dashboard has trend", isinstance(dash.get("trend"), list))
    results_ok &= check("dashboard has stories", len(dash.get("stories", [])) == 3)
    print("    summary:", json.dumps(dash.get("summary")))

    # ── 9. Classroom overview ────────────────────────────────────────────────
    r = client.get("/api/v1/classroom/overview", headers=headers)
    check("GET classroom overview -> 200", r.status_code == 200)
    ov = r.json()
    results_ok &= check("overview has checkpoint progress",
                        len(ov.get("checkpoint_progress", [])) == 15)
    print("    totals:", json.dumps(ov.get("totals")))

    # ── 10. Sync ─────────────────────────────────────────────────────────────
    r = client.get("/api/v1/sync/status")
    check("GET sync status -> 200", r.status_code == 200)
    r = client.post("/api/v1/sync")
    check("POST sync -> 200", r.status_code == 200)
    print("    sync:", json.dumps(r.json()))

    # ── 11. Gen-1 regression: old endpoints still alive ──────────────────────
    r = client.get("/health")
    results_ok &= check("Gen-1 /health still 200", r.status_code == 200)
    r = client.get("/api/students/")
    results_ok &= check("Gen-1 /api/students still 200", r.status_code == 200)

    print("\n" + "=" * 60)
    print("V2 PIPELINE TEST:", "PASSED" if results_ok else "HAD FAILURES")
    print("=" * 60)


if __name__ == "__main__":
    main()
