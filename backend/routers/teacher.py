"""
Teacher-facing management endpoints: live roster stats, parent auto-update
toggle + real generated messages, downloadable reports, a practice library
derived from actual errors, and runtime API-key management (persisted to .env).

All routes require an approved teacher unless noted.
"""
import os
import json
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.config import settings
from database.schema import get_db_connection
from routers.auth import get_current_user, require_teacher

log = logging.getLogger("speakflow.teacher")

router = APIRouter(prefix="/api/v1", tags=["teacher"])

_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
with open(os.path.join(_DATA, "stories.json"), encoding="utf-8") as _f:
    STORIES = {s["id"]: s for s in json.load(_f)["stories"]}

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(_BACKEND_DIR, ".env")


def _teacher(request: Request) -> JSONResponse | None:
    return require_teacher(get_current_user(request))


def _per_student_stats(conn) -> dict:
    """One aggregate row per student from real checkpoint + session data."""
    rows = conn.execute(
        """
        SELECT ss.student_id,
               COUNT(cr.id) AS attempted,
               SUM(cr.passed) AS passed,
               SUM(cr.stars) AS stars,
               AVG(cr.accuracy) AS avg_accuracy,
               MAX(cr.created_at) AS last_checkpoint
        FROM checkpoint_results cr
        JOIN story_sessions ss ON ss.id = cr.session_id
        GROUP BY ss.student_id
        """).fetchall()
    stats = {}
    for r in rows:
        d = dict(r)
        stats[d["student_id"]] = {
            "attempted": int(d["attempted"] or 0),
            "passed": int(d["passed"] or 0),
            "stars": int(d["stars"] or 0),
            "avg_accuracy": int(round(d["avg_accuracy"])) if d["avg_accuracy"] is not None else None,
            "last_active": d["last_checkpoint"],
        }
    return stats


# ── Roster with real stats ───────────────────────────────────────────────────
@router.get("/teacher/roster")
def teacher_roster(request: Request = None):
    forbidden = _teacher(request)
    if forbidden:
        return forbidden
    with get_db_connection() as conn:
        students = [dict(r) for r in conn.execute(
            "SELECT * FROM students ORDER BY name").fetchall()]
        stats = _per_student_stats(conn)
        accounts = {r["student_id"]: dict(r) for r in conn.execute(
            "SELECT username, status, student_id FROM users WHERE student_id IS NOT NULL").fetchall()}
        last_sessions = {r["student_id"]: r["ts"] for r in conn.execute(
            "SELECT student_id, MAX(timestamp) AS ts FROM sessions GROUP BY student_id").fetchall()}

    out = []
    for s in students:
        st = stats.get(s["id"], {})
        acc = accounts.get(s["id"])
        out.append({
            "id": s["id"],
            "name": s["name"],
            "grade": s["grade"],
            "level": s["level"],
            "checkpoints_passed": st.get("passed", 0),
            "checkpoints_attempted": st.get("attempted", 0),
            "stars": st.get("stars", 0),
            "avg_accuracy": st.get("avg_accuracy"),
            "last_active": st.get("last_active") or last_sessions.get(s["id"]),
            "parent_update_enabled": bool(s.get("parent_update_enabled", 1)),
            "account_username": acc["username"] if acc else None,
            "account_status": acc["status"] if acc else None,
        })
    return out


# ── Parent auto-update preference ────────────────────────────────────────────
@router.post("/teacher/students/{student_id}/parent-toggle")
def toggle_parent_updates(student_id: str, body: dict, request: Request = None):
    forbidden = _teacher(request)
    if forbidden:
        return forbidden
    enabled = 1 if body.get("enabled") else 0
    with get_db_connection() as conn:
        row = conn.execute("SELECT id FROM students WHERE id = ?", (student_id,)).fetchone()
        if not row:
            return JSONResponse(status_code=404, content={
                "error": {"code": "VALIDATION_ERROR", "message": "Student not found",
                          "retryable": False}})
        conn.execute(
            "UPDATE students SET parent_update_enabled = ? WHERE id = ?",
            (enabled, student_id))
        conn.commit()
    return {"ok": True, "enabled": bool(enabled)}


def _build_parent_message(conn, student_id: str) -> dict:
    """Real weekly parent update assembled from actual session data (Urdu)."""
    with get_db_connection() as conn:
        student = conn.execute(
            "SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        if not student:
            return {"enabled": False, "message": None}
        enabled = bool(student["parent_update_enabled"])
        last = conn.execute(
            """
            SELECT cr.accuracy, cr.stars, cr.words_json, cr.created_at, ss.story_id
            FROM checkpoint_results cr
            JOIN story_sessions ss ON ss.id = cr.session_id
            WHERE ss.student_id = ?
            ORDER BY cr.created_at DESC LIMIT 1
            """, (student_id,)).fetchone()
        totals = conn.execute(
            """
            SELECT SUM(cr.stars) AS stars, SUM(cr.passed) AS passed, COUNT(cr.id) AS attempted
            FROM checkpoint_results cr
            JOIN story_sessions ss ON ss.id = cr.session_id
            WHERE ss.student_id = ?
            """, (student_id,)).fetchone()

    if not enabled:
        return {"enabled": False, "message": None, "student_name": student["name"]}

    if not last:
        message = (f"السلام علیکم! {student['name']} نے ابھی تک کوئی چیک پوائنٹ مکمل نہیں کیا۔ "
                   f"جس دن پڑھائی شروع ہوگی ہم آپ کو اطلاع دیں گے!")
        return {"enabled": True, "message": message, "student_name": student["name"]}

    story = STORIES.get(last["story_id"], {})
    title = story.get("title_ur") or story.get("title", "کہانی")
    acc = int(round(last["accuracy"] or 0))
    total_stars = int(totals["stars"] or 0)

    # Top struggling word from the last checkpoint's real word data
    tricky = None
    try:
        for w in json.loads(last["words_json"] or "[]"):
            if not w["correct"]:
                tricky = w["word"]
                break
    except json.JSONDecodeError:
        pass

    parts = [
        f"السلام علیکم! {student['name']} نے '{title}' کہانی کا چیک پوائنٹ پڑھا۔",
        f"درستگی {acc}% رہی اور کل {total_stars} ستارے جمع ہوئے۔",
    ]
    if tricky:
        parts.append(f"مشق کا لفظ: '{tricky}' — برائے مہربانی گھر پر ایک بار دہرائیں۔")
    if acc >= 85:
        parts.append("بہت خوب! جاری رکھیں!")
    else:
        parts.append("محنت جاری رکھیں — ہم روز بہتر ہو رہے ہیں!")
    return {
        "enabled": True,
        "message": " ".join(parts),
        "student_name": student["name"],
        "based_on": {"date": last["created_at"], "accuracy": acc},
    }


@router.get("/students/{student_id}/parent-message")
def parent_message(student_id: str, request: Request = None):
    user = get_current_user(request)
    if not user:
        return JSONResponse(status_code=401, content={
            "error": {"code": "VALIDATION_ERROR", "message": "Please log in",
                      "retryable": False}})
    if user["role"] == "student" and user.get("student_id") != student_id:
        return JSONResponse(status_code=403, content={
            "error": {"code": "VALIDATION_ERROR",
                      "message": "Students can only view their own updates",
                      "retryable": False}})
    with get_db_connection() as conn:
        return _build_parent_message(conn, student_id)


# ── Reports (real data, downloadable) ────────────────────────────────────────
@router.get("/reports")
def reports(request: Request = None):
    forbidden = _teacher(request)
    if forbidden:
        return forbidden
    with get_db_connection() as conn:
        students = [dict(r) for r in conn.execute(
            "SELECT * FROM students ORDER BY name").fetchall()]
        stats = _per_student_stats(conn)
        recent = {}
        for s in students:
            rows = conn.execute(
                """
                SELECT cr.checkpoint_id, cr.accuracy, cr.stars, cr.created_at,
                       ss.story_id, ss.language
                FROM checkpoint_results cr
                JOIN story_sessions ss ON ss.id = cr.session_id
                WHERE ss.student_id = ?
                ORDER BY cr.created_at DESC LIMIT 5
                """, (s["id"],)).fetchall()
            if rows:
                recent[s["id"]] = [dict(r) for r in rows]

    out = []
    for s in students:
        st = stats.get(s["id"], {})
        if not st:
            continue  # no real data yet — skip rather than fabricate
        trend = "improving" if (st.get("avg_accuracy") or 0) >= 80 else "needs-practice"
        out.append({
            "student_id": s["id"],
            "name": s["name"],
            "grade": s["grade"],
            "level": s["level"],
            "trend": trend,
            "checkpoints_passed": st.get("passed", 0),
            "checkpoints_attempted": st.get("attempted", 0),
            "stars": st.get("stars", 0),
            "avg_accuracy": st.get("avg_accuracy"),
            "recent_checkpoints": [
                {**r, "story_title": (STORIES.get(r["story_id"], {}).get("title"))}
                for r in recent.get(s["id"], [])
            ],
        })
    return {"generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
            "reports": out}


# ── Practice library derived from REAL errors ────────────────────────────────
@router.get("/practice/library")
def practice_library(request: Request = None):
    user = get_current_user(request)
    if not user or user["status"] != "approved":
        return JSONResponse(status_code=403, content={
            "error": {"code": "VALIDATION_ERROR", "message": "Login required",
                      "retryable": False}})

    # Students get THEIR OWN errors (both engines); teachers see the whole class.
    student_scope = user.get("student_id") if user.get("role") == "student" else None

    with get_db_connection() as conn:
        if student_scope:
            rows = conn.execute(
                """
                SELECT cr.words_json FROM checkpoint_results cr
                JOIN story_sessions ss ON ss.id = cr.session_id
                WHERE ss.student_id = ?
                ORDER BY cr.created_at DESC LIMIT 400
                """, (student_scope,)).fetchall()
            # Classic-engine flagged words (AI analyst) — same student, other panel
            classic_rows = conn.execute(
                """
                SELECT d.phonetic_result FROM diagnoses d
                JOIN sessions s ON s.id = d.session_id
                WHERE s.student_id = ?
                ORDER BY s.timestamp DESC LIMIT 50
                """, (student_scope,)).fetchall()
        else:
            rows = conn.execute(
                "SELECT words_json FROM checkpoint_results ORDER BY created_at DESC LIMIT 400").fetchall()
            classic_rows = conn.execute(
                """
                SELECT d.phonetic_result FROM diagnoses d
                JOIN sessions s ON s.id = d.session_id
                ORDER BY s.timestamp DESC LIMIT 100
                """).fetchall()

    # rows[0] is the NEWEST read → halves give us "recent" vs "earlier" for trends
    phoneme_words = {}
    phoneme_count = {}
    phoneme_sources = {}
    hard_words = {}
    recent_phoneme = {}
    older_phoneme = {}
    older_word_misses = {}
    recent_word_misses = {}
    recent_word_correct = {}
    total_rows = len(rows)
    half = total_rows // 2

    for idx, r in enumerate(rows):
        try:
            words = json.loads(r["words_json"] or "[]")
        except json.JSONDecodeError:
            continue
        in_recent = idx < half and half > 0
        for w in words:
            word_key = w["word"].lower()
            if w["correct"]:
                if in_recent:
                    recent_word_correct[word_key] = recent_word_correct.get(word_key, 0) + 1
                continue
            label = w.get("phoneme_mismatch") or "word-recall"
            phoneme_count[label] = phoneme_count.get(label, 0) + 1
            phoneme_words.setdefault(label, set()).add(w["word"])
            phoneme_sources.setdefault(label, set()).add("story")
            hard_words[w["word"]] = hard_words.get(w["word"], 0) + 1
            if in_recent:
                recent_phoneme[label] = recent_phoneme.get(label, 0) + 1
                recent_word_misses[word_key] = recent_word_misses.get(word_key, 0) + 1
            elif half > 0:
                older_phoneme[label] = older_phoneme.get(label, 0) + 1
                older_word_misses[word_key] = older_word_misses.get(word_key, 0) + 1

    # Merge classic-engine flagged words into the same pools
    for r in classic_rows or []:
        try:
            phon = json.loads(r["phonetic_result"] or "{}")
        except json.JSONDecodeError:
            continue
        for w in phon.get("struggling_words") or []:
            word = str(w).strip()
            if not word:
                continue
            hard_words[word] = hard_words.get(word, 0) + 1
            for lbl in phon.get("struggling_phonemes") or []:
                label = lbl.get("label") if isinstance(lbl, dict) else str(lbl)
                if not label:
                    continue
                phoneme_count[label] = phoneme_count.get(label, 0) + 1
                phoneme_words.setdefault(label, set()).add(word)
                phoneme_sources.setdefault(label, set()).add("classic")

    # Find a real story sentence containing a flagged word (real practice text)
    all_sentences = [
        (s["id"], cp["id"], cp["text_en"])
        for s in STORIES.values() for cp in s["checkpoints"]
    ]
    def sentence_for(word: str):
        for story_id, cp_id, sent in all_sentences:
            if word.lower() in sent.lower():
                return story_id, cp_id, sent
        return None

    # Progress trends: how each sound moved between the earlier and recent
    # halves of the reads (only meaningful with enough data)
    improving = sorted(
        [l for l in phoneme_count
         if recent_phoneme.get(l, 0) < older_phoneme.get(l, 0)])
    worsening = sorted(
        [l for l in phoneme_count
         if older_phoneme.get(l, 0) == 0 and recent_phoneme.get(l, 0) > 0])
    new_sounds = sorted(
        [l for l in phoneme_count
         if l not in improving and l not in worsening and older_phoneme.get(l, 0) == 0])
    conquered_words = sorted(
        [w for w in older_word_misses
         if recent_word_misses.get(w, 0) == 0 and recent_word_correct.get(w, 0) > 0])

    exercises = []
    for label, count in sorted(phoneme_count.items(), key=lambda x: -x[1])[:6]:
        words = sorted(phoneme_words[label])[:6]
        hit = next((sentence_for(w) for w in words if sentence_for(w)), None)
        exercises.append({
            "id": f"ex-{label}",
            "focus": label,
            "frequency": count,
            "words": words,
            "story_id": hit[0] if hit else None,
            "checkpoint_id": hit[1] if hit else None,
            "sentence": hit[2] if hit else None,
            "sources": sorted(phoneme_sources.get(label, {"story"})),
            "trend": ("improving" if label in improving
                      else "worsening" if label in worsening
                      else "new" if label in new_sounds
                      else "steady"),
        })

    top_words = sorted(hard_words.items(), key=lambda x: -x[1])[:8]
    return {
        "exercises": exercises,
        "struggling_words": [{"word": w, "count": c} for w, c in top_words],
        "scope": "student" if student_scope else "class",
        "total_words_analyzed": sum(hard_words.values()) + sum(
            1 for r in rows for w in json.loads(r["words_json"] or "[]") if w["correct"]),
        "progress": {
            "improving": improving,
            "worsening": worsening,
            "new_sounds": new_sounds,
            "conquered_words": conquered_words[:8],
        },
    }


# ── Runtime API-key management (teacher only, persisted to .env) ─────────────
def _set_env_key(key: str, value: str):
    """Replace or append KEY=... in backend/.env and live-update the process."""
    lines = []
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, encoding="utf-8") as f:
            lines = f.read().splitlines()
    replaced = False
    for i, line in enumerate(lines):
        if line.startswith(f"{key}=") or line.startswith(f"{key} ="):
            lines[i] = f"{key}={value}"
            replaced = True
            break
    if not replaced:
        lines.append(f"{key}={value}")
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines).rstrip() + "\n")
    os.environ[key] = value


@router.get("/config/keys")
def get_keys(request: Request = None):
    forbidden = _teacher(request)
    if forbidden:
        return forbidden
    return {
        "groq_configured": bool(settings.GROQ_API_KEY),
        "google_configured": bool(settings.active_gemini_key),
        "google_key_count": len([k for k in settings.active_gemini_key.split(",") if k.strip()]),
        "env": settings.ENV,
        "stt_mode": settings.stt_mode,
        "agent_model": settings.agent_model,
    }


STT_MODES = ("auto", "groq", "local")
AGENT_MODELS = ("auto", "gemini-3.5-flash-lite", "gemma-4-31b-it")


@router.post("/config/keys")
def set_keys(body: dict, request: Request = None):
    forbidden = _teacher(request)
    if forbidden:
        return forbidden
    updated = []

    groq_key = (body.get("groq_api_key") or "").strip()
    if groq_key:
        _set_env_key("GROQ_API_KEY", groq_key)
        settings.GROQ_API_KEY = groq_key
        updated.append("GROQ_API_KEY")

    google_keys = (body.get("google_api_keys") or "").strip()
    if google_keys:
        _set_env_key("GOOGLE_API_KEYS", google_keys)
        os.environ["GOOGLE_API_KEYS"] = google_keys
        # Reconfigure the live Gemini client with the new key(s)
        from services import reasoning
        reasoning._configure_key()
        updated.append("GOOGLE_API_KEYS")

    # Engine picks (Settings → live-apply + persist to .env)
    stt_mode = (body.get("stt_mode") or "").strip().lower()
    if stt_mode:
        if stt_mode not in STT_MODES:
            return JSONResponse(status_code=422, content={
                "error": {"code": "VALIDATION_ERROR",
                          "message": f"stt_mode must be one of {STT_MODES}",
                          "retryable": False}})
        _set_env_key("STT_MODE", stt_mode)
        updated.append("STT_MODE")

    agent_model = (body.get("agent_model") or "").strip()
    if agent_model:
        if agent_model not in AGENT_MODELS:
            return JSONResponse(status_code=422, content={
                "error": {"code": "VALIDATION_ERROR",
                          "message": f"agent_model must be one of {AGENT_MODELS}",
                          "retryable": False}})
        _set_env_key("GEN1_AGENT_MODEL", agent_model)
        updated.append("GEN1_AGENT_MODEL")

    return {
        "ok": True,
        "updated": updated,
        "groq_configured": bool(settings.GROQ_API_KEY),
        "google_configured": bool(settings.active_gemini_key),
        "stt_mode": settings.stt_mode,
        "agent_model": settings.agent_model,
    }
