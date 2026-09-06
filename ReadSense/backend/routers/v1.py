"""
SpeakFlow v2 API — the roadmap Part 1.2 contract, implemented additively
alongside the untouched Gen-1 pipeline.

  GET  /api/v1/health                             mode + reachability
  GET  /api/v1/stories                            story/chapter catalog (+progress)
  POST /api/v1/sessions                           create checkpoint session
  POST /api/v1/sessions/{sid}/analyze             multipart Phase-1 (+async Phase-2)
  POST /api/v1/sessions/{sid}/analyze-mock        JSON dev/demo path (no mic needed)
  GET  /api/v1/sessions/{sid}                     session detail (teacher + child)
  GET  /api/v1/sessions/{sid}/feedback/{cid}      Phase-2 polling alternative
  GET  /api/v1/students/{sid}/dashboard           educator aggregates
  GET  /api/v1/classroom/overview                 class-wide teacher dashboard data
  POST /api/v1/sync                               manual sync trigger
  GET  /api/v1/sync/status                        queue count + config state
  WS   /ws/sessions/{sid}                         Phase-2 push channel
"""
import os
import json
import uuid
import time
import tempfile
import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect, BackgroundTasks, Request
from datetime import datetime

from core.config import settings
from services.stt import get_transcript, network_available
from services import acoustic
from services.reasoning import generate_feedback, judge_hesitation
from services.sync import push_queued, get_queued_count
from database.schema import get_db_connection
from routers.auth import get_current_user, require_teacher

log = logging.getLogger("speakflow.v1")

api = APIRouter(prefix="/api/v1", tags=["v1"])
ws_router = APIRouter(tags=["ws"])

_ERROR_CODES = {"VALIDATION_ERROR", "SESSION_NOT_FOUND", "AUDIO_TOO_SHORT",
                "GROQ_UNAVAILABLE", "GEMINI_UNAVAILABLE", "INTERNAL_ERROR"}


class ApiError(Exception):
    """Shared error-envelope exception (roadmap Part 1.2). Converted to
    `{ error: { code, message, retryable } }` by the handler in main.py."""

    def __init__(self, code: str, message: str, status_code: int = 400,
                 retryable: bool = False):
        assert code in _ERROR_CODES, f"invalid error code {code}"
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retryable = retryable
        super().__init__(message)

_STORY_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
with open(os.path.join(_STORY_DATA, "stories.json"), encoding="utf-8") as _f:
    STORIES = {s["id"]: s for s in json.load(_f)["stories"]}


# ── WebSocket connection manager ─────────────────────────────────────────────
class SessionSocketManager:
    def __init__(self):
        self._conns: dict[str, set] = {}
        self._lock = asyncio.Lock()

    async def connect(self, session_id: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._conns.setdefault(session_id, set()).add(ws)

    def disconnect(self, session_id: str, ws: WebSocket):
        self._conns.get(session_id, set()).discard(ws)

    async def broadcast(self, session_id: str, payload: dict):
        for ws in list(self._conns.get(session_id, set())):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(session_id, ws)


ws_manager = SessionSocketManager()


# ── Helpers ──────────────────────────────────────────────────────────────────
def _audio_ext(data: bytes) -> str:
    if data[:4] == b"OggS":
        return ".ogg"
    if len(data) > 8 and data[4:8] == b"ftyp":
        return ".mp4"
    if data[:4] == b"RIFF":
        return ".wav"
    if data[:3] == b"ID3" or (len(data) > 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0):
        return ".mp3"
    return ".webm"


def _get_session_or_404(session_id: str) -> dict:
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT * FROM story_sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        raise ApiError("SESSION_NOT_FOUND", "Session not found", 404)
    return dict(row)


def _story_checkpoints(session: dict) -> list:
    story = STORIES.get(session["story_id"])
    if not story:
        raise ApiError("INTERNAL_ERROR", "Story definition missing", 500)
    lang = session.get("language", "en")
    key = "text_ur" if lang == "ur" else "text_en"
    comp_key = "comprehension_ur" if lang == "ur" else "comprehension_en"
    return [{
        "checkpoint_id": cp["id"],
        "target_text": cp[key],
        "comprehension_hint": story.get(comp_key, ""),
    } for cp in story["checkpoints"]]


def _warning_for(stt_source: str, fallback_reason: str) -> list:
    warnings = []
    if stt_source == "local_fallback" and fallback_reason and fallback_reason != "mock":
        warnings.append(f"STT fell back to the offline model ({fallback_reason}).")
    return warnings


# ── Health ───────────────────────────────────────────────────────────────────
@api.get("/health")
def v1_health():
    online = network_available()
    return {
        "mode": "online" if online else "offline",
        "groq_reachable": bool(online and settings.GROQ_API_KEY),
        "gemini_reachable": bool(online and settings.active_gemini_key),
        "server_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


# ── Tap-a-word pronunciation tip ─────────────────────────────────────────────
@api.get("/words/tip")
async def word_tip(word: str, lang: str = "en", mismatch: str = "",
                   spoken: str = "", request: Request = None):
    """Pronunciation help for one word (kid taps a word in the results screen).
    Local letter/syllable breakdown is instant; the coach tip comes from Gemini
    with a template fallback, and every generated tip is cached in `word_tips`
    so each word costs one API call ever."""
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in.", 401)
    if user.get("status") != "approved":
        raise ApiError("VALIDATION_ERROR", "Account not approved.", 403)

    word = (word or "").strip()[:40]
    if not word:
        raise ApiError("VALIDATION_ERROR", "word is required", 422)
    if lang not in ("en", "ur"):
        raise ApiError("VALIDATION_ERROR", "lang must be 'en' or 'ur'", 422)

    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT tip, syllables_json, source FROM word_tips WHERE word = ? AND language = ?",
            (word, lang)).fetchone()
    if row:
        try:
            syllables = json.loads(row["syllables_json"] or "[]")
        except json.JSONDecodeError:
            syllables = []
        return {"word": word, "letters": list(word), "syllables": syllables,
                "tip": row["tip"], "tip_source": "cache"}

    from services.reasoning import generate_word_tip, split_syllables
    result = await generate_word_tip(word, lang, mismatch=mismatch, spoken=spoken)

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO word_tips (word, language, tip, syllables_json, source)
            VALUES (?, ?, ?, ?, ?)
            """,
            (word, lang, result["tip"],
             json.dumps(result["syllables"], ensure_ascii=False), result["source"]))
        conn.commit()

    return {"word": word, "letters": list(word), "syllables": result["syllables"],
            "tip": result["tip"], "tip_source": result["source"]}


# ── Stories ──────────────────────────────────────────────────────────────────
@api.get("/stories")
def list_stories(student_id: Optional[str] = None):
    out = []
    with get_db_connection() as conn:
        for story in STORIES.values():
            total = len(story["checkpoints"])
            passed = 0
            if student_id:
                row = conn.execute(
                    """
                    SELECT COUNT(DISTINCT cr.checkpoint_id) AS n
                    FROM checkpoint_results cr
                    JOIN story_sessions ss ON ss.id = cr.session_id
                    WHERE ss.student_id = ? AND ss.story_id = ? AND cr.passed = 1
                    """,
                    (student_id, story["id"])).fetchone()
                passed = int(row["n"]) if row else 0
            if passed >= total:
                status = "completed"
            elif passed > 0:
                status = "in_progress"
            else:
                status = "available"
            out.append({
                "id": story["id"], "title": story["title"], "title_ur": story["title_ur"],
                "emoji": story["emoji"], "color": story["color"],
                "total_checkpoints": total, "passed_checkpoints": passed,
                "status": status,
            })
    # Sequential unlock: first story always open, later ones need the previous done
    for i, s in enumerate(out):
        if i == 0:
            s["locked"] = False
        else:
            s["locked"] = out[i - 1]["status"] != "completed"
    return out


# ── Sessions ─────────────────────────────────────────────────────────────────
@api.get("/sessions")
def list_story_sessions():
    """All v2 story sessions for the sessions page — includes real duration
    (created_at -> completed_at), so the UI never hardcodes a fake value."""
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT ss.id, ss.student_id, st.name AS student_name, ss.story_id,
                   ss.language, ss.created_at, ss.completed_at, ss.synced, ss.mode,
                   (SELECT COUNT(*) FROM checkpoint_results x
                     WHERE x.session_id = ss.id) AS attempted,
                   (SELECT SUM(passed) FROM checkpoint_results x
                     WHERE x.session_id = ss.id) AS passed,
                   (SELECT AVG(accuracy) FROM checkpoint_results x
                     WHERE x.session_id = ss.id) AS avg_accuracy,
                   (SELECT SUM(stars) FROM checkpoint_results x
                     WHERE x.session_id = ss.id) AS stars
            FROM story_sessions ss
            LEFT JOIN students st ON st.id = ss.student_id
            ORDER BY ss.created_at DESC LIMIT 100
            """).fetchall()

    out = []
    for r in rows:
        d = dict(r)
        duration_s = None
        if d["completed_at"] and d["created_at"]:
            try:
                t0 = datetime.strptime(d["created_at"], "%Y-%m-%d %H:%M:%S")
                t1 = datetime.strptime(d["completed_at"], "%Y-%m-%d %H:%M:%S")
                duration_s = max(0, int((t1 - t0).total_seconds()))
            except ValueError:
                pass
        d["duration_s"] = duration_s
        d["attempted"] = int(d["attempted"] or 0)
        d["passed"] = int(d["passed"] or 0)
        d["stars"] = int(d["stars"] or 0)
        d["avg_accuracy"] = int(round(d["avg_accuracy"])) if d["avg_accuracy"] is not None else None
        d["synced"] = bool(d["synced"])
        out.append(d)
    return out


@api.post("/sessions", status_code=201)
def create_session(body: dict, request: Request = None):
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in to start a reading session.", 401)
    student_id = body.get("student_id")
    story_id = body.get("story_id")
    language = body.get("language", "en")

    # Students can only start sessions for themselves (proper role scoping)
    if user["role"] == "student":
        if user["status"] != "approved":
            raise ApiError("VALIDATION_ERROR", "Account not approved.", 403)
        student_id = user.get("student_id")

    if language not in ("en", "ur"):
        raise ApiError("VALIDATION_ERROR", "language must be 'en' or 'ur'", 422)

    with get_db_connection() as conn:
        student = conn.execute("SELECT * FROM students WHERE id = ?",
                               (student_id,)).fetchone()
        if not student:
            raise ApiError("VALIDATION_ERROR", "Student not found", 404)
    story = STORIES.get(story_id)
    if not story:
        raise ApiError("VALIDATION_ERROR", "Story not found", 404)

    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    mode = "online" if network_available() else "offline"

    with get_db_connection() as conn:
        conn.execute(
            """INSERT INTO story_sessions (id, student_id, story_id, language, synced, mode)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (session_id, student_id, story_id, language,
             0 if mode == "offline" else 1, mode))
        conn.commit()

    return {
        "session_id": session_id,
        "id": session_id,
        "student_id": student_id,
        "story_id": story_id,
        "language": language,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "checkpoints": [{"checkpoint_id": c["checkpoint_id"],
                         "target_text": c["target_text"]}
                        for c in _story_checkpoints({"story_id": story_id,
                                                     "language": language})],
    }


async def _run_phase2(session_id: str, checkpoint_id: str, signal: dict,
                      checkpoint_hint: dict, audio_bytes: Optional[bytes] = None,
                      audio_ext: str = ".webm"):
    """Background Phase 2: feedback (+ optional hesitation judgment), persisted,
    then pushed over the session's WebSocket channel."""
    t0 = time.perf_counter()
    engagement = signal.get("engagement_state", "unknown")

    # Refine an ambiguous pause with the multimodal judgment call (online only).
    # The clip is materialized to disk only for the duration of this call.
    hesitation_latency = 0
    ambiguous = next((h for h in signal["hesitations"] if h["flagged_ambiguous"]), None)
    if ambiguous and audio_bytes and settings.JUDGE_HESITATION_ENABLED \
            and network_available() and settings.active_gemini_key:
        t_h = time.perf_counter()
        tmp_hes = None
        try:
            with tempfile.NamedTemporaryFile(suffix=audio_ext, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_hes = tmp.name
            verdict = await judge_hesitation(tmp_hes, ambiguous)
            hesitation_latency = int((time.perf_counter() - t_h) * 1000)
            if verdict == "nervous":
                engagement = "anxious"
            elif verdict == "not_knowing":
                engagement = "frustrated"
        except Exception as e:
            log.warning("judge_hesitation failed: %s", e)
        finally:
            if tmp_hes and os.path.exists(tmp_hes):
                try:
                    os.remove(tmp_hes)
                except OSError:
                    pass

    signal = {**signal, "engagement_state": engagement}
    feedback = await generate_feedback(signal, checkpoint_hint)
    feedback_latency = int((time.perf_counter() - t0) * 1000)

    phase2 = {
        "session_id": session_id,
        "checkpoint_id": checkpoint_id,
        "phase": 2,
        "feedback_text": feedback["feedback_text"],
        "engagement_state": engagement,
        "comprehension_question": feedback.get("comprehension_question"),
        "practice_recommendation": feedback.get("practice_recommendation"),
        "teacher_note": feedback.get("teacher_note"),
        "feedback_source": feedback["feedback_source"],
        "latency_ms": {"gemini_feedback": feedback_latency,
                       "gemini_hesitation": hesitation_latency},
    }
    try:
        with get_db_connection() as conn:
            conn.execute(
                """UPDATE checkpoint_results
                   SET feedback_text = ?, engagement_state = ?,
                       comprehension_question = ?, practice_recommendation = ?,
                       teacher_note = ?, feedback_source = ?, latency_json = ?
                   WHERE session_id = ? AND checkpoint_id = ?""",
                (phase2["feedback_text"], phase2["engagement_state"],
                 phase2["comprehension_question"], phase2["practice_recommendation"],
                 phase2["teacher_note"], phase2["feedback_source"],
                 json.dumps(phase2["latency_ms"]), session_id, checkpoint_id))
            conn.commit()
    except Exception as e:
        log.error("phase2 persist failed: %s", e)

    await ws_manager.broadcast(session_id, phase2)
    return phase2


def _persist_phase1(session: dict, checkpoint_id: str, target_text: str,
                    signal: dict):
    result_id = f"cpr_{uuid.uuid4().hex[:10]}"
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO checkpoint_results
                (id, session_id, checkpoint_id, target_text, transcript, wpm,
                 accuracy, passed, stars, words_json, hesitations_json,
                 engagement_state, stt_source, latency_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (result_id, session["id"], checkpoint_id, target_text,
             signal["transcript"], signal["wpm"], signal["accuracy"],
             1 if signal["passed"] else 0, signal["stars"],
             json.dumps(signal["words"], ensure_ascii=False),
             json.dumps(signal["hesitations"]),
             signal["engagement_state"], signal["stt_source"],
             json.dumps(signal["latency_ms"])))
        # Mark session complete once every checkpoint has been attempted
        story = STORIES[session["story_id"]]
        done = conn.execute(
            "SELECT COUNT(*) AS n FROM checkpoint_results WHERE session_id = ?",
            (session["id"],)).fetchone()["n"]
        if done >= len(story["checkpoints"]):
            conn.execute(
                "UPDATE story_sessions SET completed_at = datetime('now') WHERE id = ?",
                (session["id"],))
        conn.commit()
    return result_id


def _phase1_response(session_id: str, checkpoint_id: str, signal: dict) -> dict:
    return {
        "session_id": session_id,
        "checkpoint_id": checkpoint_id,
        "phase": 1,
        "transcript": signal["transcript"],
        "words": [{"word": w["word"], "correct": w["correct"],
                   "phoneme_mismatch": w["phoneme_mismatch"],
                   "spoken": w.get("spoken") or ""} for w in signal["words"]],
        "wpm": signal["wpm"],
        "accuracy": signal["accuracy"],
        "passed": signal["passed"],
        "stars": signal["stars"],
        "hesitations": signal["hesitations"],
        "stt_source": signal["stt_source"],
        "latency_ms": signal["latency_ms"],
        "warnings": _warning_for(signal["stt_source"],
                                 signal.get("stt_fallback_reason", "")),
    }


async def _analyze_flow(session: dict, checkpoint_id: str,
                        audio_path: Optional[str] = None,
                        audio_bytes: Optional[bytes] = None,
                        mock_transcript: Optional[dict] = None,
                        background_tasks: Optional[BackgroundTasks] = None) -> dict:
    checkpoints = _story_checkpoints(session)
    hint = next((c for c in checkpoints if c["checkpoint_id"] == checkpoint_id), None)
    if not hint:
        raise ApiError("VALIDATION_ERROR", "checkpoint_id does not belong to this session", 422)

    language = session.get("language", "en")
    t0 = time.perf_counter()

    if mock_transcript is not None:
        # Dev/demo path: synthesize a TranscriptResult without any STT call.
        from services.stt import TranscriptResult
        words = mock_transcript.get("words") or []
        probs = mock_transcript.get("word_probabilities") or {}
        extra_pauses = list(mock_transcript.get("extra_pauses_ms") or [])
        spoken = []
        clock = 0.3
        for i, w in enumerate(words):
            dur = 0.18
            spoken.append({"word": w, "start": round(clock, 3),
                           "end": round(clock + dur, 3),
                           "probability": float(probs.get(w, 0.92))})
            clock += dur
            if i < len(extra_pauses):
                clock += max(extra_pauses[i], 0) / 1000.0
        transcript_result = TranscriptResult(
            text=" ".join(words), words=spoken, source="local_fallback",
            fallback_reason="mock")
        stt_ms = 1
    else:
        t_s = time.perf_counter()
        transcript_result = get_transcript(audio_path, language)
        stt_ms = (time.perf_counter() - t_s) * 1000

    t_a = time.perf_counter()
    acoustics = acoustic.extract_word_acoustics(audio_path, transcript_result.words) \
        if audio_path else _mock_acoustics(transcript_result)
    acoustic_ms = (time.perf_counter() - t_a) * 1000

    t_sc = time.perf_counter()
    signal = acoustic.build_signal(hint["target_text"], transcript_result,
                                   acoustics, language, stt_ms, acoustic_ms,
                                   (time.perf_counter() - t_sc) * 1000)
    scoring_ms = (time.perf_counter() - t_sc) * 1000
    signal["latency_ms"]["scoring"] = int(scoring_ms)
    signal["latency_ms"]["total_phase1"] = int(
        signal["latency_ms"]["stt"] + signal["latency_ms"]["acoustic"] + scoring_ms)

    _persist_phase1(session, checkpoint_id, hint["target_text"], signal)

    # Phase 2 runs as a background task: the response (and Phase-1 payload)
    # is sent first, then feedback is generated, persisted, and pushed over WS.
    if background_tasks is not None:
        background_tasks.add_task(
            _run_phase2, session["id"], checkpoint_id, signal, hint,
            audio_bytes, _audio_ext(audio_bytes or b""))

    return _phase1_response(session["id"], checkpoint_id, signal)


def _mock_acoustics(transcript_result):
    """Feature placeholders for the mock path (no audio file exists)."""
    feats = {}
    for w in transcript_result.words:
        feats[(float(w["start"]), float(w["end"]))] = {
            "rms": 0.02, "zcr": 0.05, "pitch_std": 20.0, "f1": 0.0, "f2": 0.0}
    return {"word_features": feats, "pitch_variance": 400.0,
            "total_duration": (transcript_result.words[-1]["end"] + 0.3)
            if transcript_result.words else 3.0, "sample_rate": 16000}


@api.post("/sessions/{session_id}/analyze")
async def analyze_checkpoint(session_id: str, background_tasks: BackgroundTasks,
                             audio: UploadFile = File(...),
                             checkpoint_id: str = Form(...)):
    session = _get_session_or_404(session_id)
    audio_bytes = await audio.read()
    if len(audio_bytes) < 1000:
        raise ApiError("AUDIO_TOO_SHORT", "Audio recording was too short", 422)
    ext = _audio_ext(audio_bytes)
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        return await _analyze_flow(session, checkpoint_id, audio_path=tmp_path,
                                   audio_bytes=audio_bytes,
                                   background_tasks=background_tasks)
    finally:
        # Ephemeral by design: the main audio file is destroyed in this request
        # lifecycle. Phase 2 holds only in-memory bytes and writes its own
        # short-lived temp copy for the optional hesitation judgment.
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


@api.post("/sessions/{session_id}/analyze-mock")
async def analyze_checkpoint_mock(session_id: str, background_tasks: BackgroundTasks,
                                  body: dict):
    """Dev/demo fallback mirroring Gen-1's mocked_signal_data path: run the full
    Phase-1/Phase-2 machinery on a provided transcript without a microphone."""
    session = _get_session_or_404(session_id)
    checkpoint_id = body.get("checkpoint_id")
    if not checkpoint_id:
        raise ApiError("VALIDATION_ERROR", "checkpoint_id required", 422)
    return await _analyze_flow(session, checkpoint_id,
                               mock_transcript=body,
                               background_tasks=background_tasks)


@api.get("/sessions/{session_id}")
def get_session(session_id: str):
    session = _get_session_or_404(session_id)
    story = STORIES.get(session["story_id"], {})
    checkpoints = _story_checkpoints(session)
    with get_db_connection() as conn:
        student = conn.execute("SELECT name FROM students WHERE id = ?",
                               (session["student_id"],)).fetchone()
        rows = conn.execute(
            "SELECT * FROM checkpoint_results WHERE session_id = ? ORDER BY created_at",
            (session_id,)).fetchall()
    results = {r["checkpoint_id"]: dict(r) for r in rows}

    out_checkpoints = []
    total_stars = 0
    accs = []
    for cp in checkpoints:
        r = results.get(cp["checkpoint_id"])
        entry = {
            "checkpoint_id": cp["checkpoint_id"],
            "target_text": cp["target_text"],
            "status": "attempted" if r else "pending",
            "passed": bool(r["passed"]) if r else False,
            "accuracy": r["accuracy"] if r else None,
            "wpm": r["wpm"] if r else None,
            "stars": r["stars"] if r else 0,
            "transcript": r["transcript"] if r else None,
            "feedback_text": r["feedback_text"] if r else None,
            "engagement_state": r["engagement_state"] if r else None,
            "comprehension_question": r["comprehension_question"] if r else None,
            "practice_recommendation": r["practice_recommendation"] if r else None,
            "stt_source": r["stt_source"] if r else None,
            "feedback_source": r["feedback_source"] if r else None,
            "hesitations": json.loads(r["hesitations_json"]) if r and r["hesitations_json"] else [],
            "words": json.loads(r["words_json"]) if r and r["words_json"] else [],
        }
        if r:
            total_stars += r["stars"] or 0
            accs.append(r["accuracy"] or 0)
        out_checkpoints.append(entry)

    attempted = len(results)
    return {
        "session_id": session_id,
        "student_id": session["student_id"],
        "student_name": student["name"] if student else None,
        "story_id": session["story_id"],
        "story_title": story.get("title"),
        "story_emoji": story.get("emoji"),
        "language": session.get("language", "en"),
        "created_at": session["created_at"],
        "completed_at": session.get("completed_at"),
        "mode": session.get("mode"),
        "synced": bool(session.get("synced", 1)),
        "checkpoints": out_checkpoints,
        "totals": {
            "checkpoints_total": len(checkpoints),
            "checkpoints_attempted": attempted,
            "checkpoints_passed": sum(1 for c in out_checkpoints if c["passed"]),
            "stars": total_stars,
            "avg_accuracy": int(round(sum(accs) / len(accs))) if accs else None,
            "is_complete": attempted >= len(checkpoints),
        },
    }


@api.get("/sessions/{session_id}/feedback/{checkpoint_id}")
def get_feedback(session_id: str, checkpoint_id: str):
    """Phase-2 polling alternative to the WebSocket channel (roadmap 1.2)."""
    _get_session_or_404(session_id)
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT * FROM checkpoint_results WHERE session_id = ? AND checkpoint_id = ?",
            (session_id, checkpoint_id)).fetchone()
    if not row:
        raise ApiError("SESSION_NOT_FOUND", "Checkpoint result not found", 404)
    r = dict(row)
    if not r["feedback_text"]:
        return {"session_id": session_id, "checkpoint_id": checkpoint_id,
                "phase": 2, "status": "pending"}
    return {
        "session_id": session_id,
        "checkpoint_id": checkpoint_id,
        "phase": 2,
        "feedback_text": r["feedback_text"],
        "engagement_state": r["engagement_state"],
        "comprehension_question": r["comprehension_question"],
        "practice_recommendation": r["practice_recommendation"],
        "teacher_note": r["teacher_note"],
        "feedback_source": r["feedback_source"],
        "latency_ms": json.loads(r["latency_json"]) if r["latency_json"] else {},
    }


# ── Aggregations (educator dashboard, roadmap 1.2 Feature 8) ─────────────────
@api.get("/students/{student_id}/dashboard")
def student_dashboard(student_id: str, range: str = "all", request: Request = None):
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in.", 401)
    if user["role"] == "student" and user.get("student_id") != student_id:
        raise ApiError("VALIDATION_ERROR", "Students can only view their own progress.", 403)
    with get_db_connection() as conn:
        student = conn.execute("SELECT * FROM students WHERE id = ?",
                               (student_id,)).fetchone()
        if not student:
            raise ApiError("VALIDATION_ERROR", "Student not found", 404)

        cp_rows = conn.execute(
            """
            SELECT cr.*, ss.story_id, ss.language, ss.created_at AS session_date
            FROM checkpoint_results cr
            JOIN story_sessions ss ON ss.id = cr.session_id
            WHERE ss.student_id = ?
            ORDER BY cr.created_at ASC
            """, (student_id,)).fetchall()
        cps = [dict(r) for r in cp_rows]

        # Classic-engine reads (Gen-1 dashboard) — a first-class part of this
        # student's progress, not a side feature. accuracy stored 0-1 → ×100.
        classic_rows = conn.execute(
            """
            SELECT id, target_sentence, wpm, accuracy, overall_score, timestamp, language
            FROM sessions WHERE student_id = ?
            ORDER BY timestamp ASC
            """, (student_id,)).fetchall()
        classics = []
        for r in classic_rows:
            r = dict(r)
            r["accuracy"] = round(float(r["accuracy"] or 0) * 100)
            classics.append(r)

        # AI-flagged struggling words/sounds from classic diagnoses
        classic_word_counts, classic_phoneme_counts = {}, {}
        diag_rows = conn.execute(
            """
            SELECT d.phonetic_result FROM diagnoses d
            JOIN sessions s ON s.id = d.session_id
            WHERE s.student_id = ?
            """, (student_id,)).fetchall()
        for r in diag_rows:
            try:
                phon = json.loads(r["phonetic_result"] or "{}")
            except json.JSONDecodeError:
                continue
            for w in phon.get("struggling_words") or []:
                key = str(w).strip().lower().strip(".,!?;:")
                if key:
                    classic_word_counts[key] = classic_word_counts.get(key, 0) + 1
        for p in phon.get("struggling_phonemes") or []:
            # the phonetic agent returns {"label", "words"} objects
            label = p.get("label") if isinstance(p, dict) else str(p)
            if not label:
                continue
            classic_phoneme_counts[label] = classic_phoneme_counts.get(label, 0) + 1

        recent = conn.execute(
            """
            SELECT ss.id, ss.story_id, ss.language, ss.created_at, ss.completed_at,
                   (SELECT COUNT(*) FROM checkpoint_results x
                     WHERE x.session_id = ss.id) AS attempted,
                   (SELECT AVG(accuracy) FROM checkpoint_results x
                     WHERE x.session_id = ss.id) AS avg_accuracy,
                   (SELECT SUM(stars) FROM checkpoint_results x
                     WHERE x.session_id = ss.id) AS stars
            FROM story_sessions ss
            WHERE ss.student_id = ?
            ORDER BY ss.created_at DESC LIMIT 8
            """, (student_id,)).fetchall()

    # Trend (daily) — story checkpoints AND classic reads combined
    by_day = {}
    for c in cps:
        by_day.setdefault((c["created_at"] or "")[:10], []).append(
            {"accuracy": c["accuracy"] or 0, "wpm": c["wpm"] or 0})
    for c in classics:
        by_day.setdefault((c["timestamp"] or "")[:10], []).append(
            {"accuracy": c["accuracy"], "wpm": c["wpm"] or 0})
    trend = []
    for day in sorted(by_day)[-14:]:
        items = by_day[day]
        trend.append({
            "date": day,
            "accuracy": int(round(sum(i["accuracy"] for i in items) / len(items))),
            "wpm": round(sum(i["wpm"] for i in items) / len(items), 1),
            "checkpoints": len(items),
        })
    if range == "week":
        trend = trend[-7:]
    elif range == "session":
        trend = trend[-1:]

    # Struggling words + phoneme errors (measured story words + AI-flagged classic)
    word_counts, phoneme_counts, total_words = {}, {}, 0
    for c in cps:
        try:
            words = json.loads(c["words_json"] or "[]")
        except json.JSONDecodeError:
            words = []
        for w in words:
            total_words += 1
            if not w["correct"]:
                key = w["word"].lower()
                word_counts[key] = word_counts.get(key, 0) + 1
                if w.get("phoneme_mismatch"):
                    phoneme_counts[w["phoneme_mismatch"]] = \
                        phoneme_counts.get(w["phoneme_mismatch"], 0) + 1
    for w, n in classic_word_counts.items():
        word_counts[w] = word_counts.get(w, 0) + n
    for p, n in classic_phoneme_counts.items():
        phoneme_counts[p] = phoneme_counts.get(p, 0) + n

    # Per-story progress
    stories_out = []
    for sid, story in STORIES.items():
        done = sum(1 for c in cps if c["story_id"] == sid and c["passed"])
        stars = sum((c["stars"] or 0) for c in cps if c["story_id"] == sid)
        stories_out.append({
            "story_id": sid, "title": story["title"], "emoji": story["emoji"],
            "passed": done, "total": len(story["checkpoints"]), "stars": stars,
        })

    total_stars = sum((c["stars"] or 0) for c in cps)

    # Combined accuracy across BOTH engines (classic rows are already 0-100)
    all_acc = [(c["accuracy"] or 0) for c in cps] + [c["accuracy"] for c in classics]
    avg_acc = int(round(sum(all_acc) / len(all_acc))) if all_acc else None
    # Most recent 3 reads of any engine
    reads = ([(c["created_at"] or "", c["accuracy"] or 0) for c in cps] +
             [(c["timestamp"] or "", c["accuracy"]) for c in classics])
    recent_score = None
    if reads:
        reads.sort(key=lambda x: x[0])
        last3 = [a for _, a in reads[-3:]]
        recent_score = int(round(sum(last3) / len(last3)))

    # Recent reads merged, newest first, both engines labeled
    recent_story = []
    for r in recent:
        d = dict(r)
        d["kind"] = "story"
        d["label"] = (d.get("story_id") or "").replace("story_", "").replace("_", " ")
        recent_story.append(d)
    recent_classic = [{
        "id": c["id"], "kind": "classic", "label": c["target_sentence"] or "Classic read",
        "created_at": c["timestamp"], "avg_accuracy": c["accuracy"],
        "wpm": c["wpm"], "stars": None,
        "language": c["language"] or "en", "attempted": 1,
        "completed_at": None, "story_id": None,
    } for c in classics]
    recent_all = sorted(recent_story + recent_classic,
                        key=lambda x: x["created_at"] or "", reverse=True)[:8]

    return {
        "student": {"id": student_id, "name": student["name"],
                    "grade": student["grade"], "level": student["level"]},
        "summary": {
            "stars": total_stars,
            "checkpoints_passed": sum(1 for c in cps if c["passed"]),
            "checkpoints_attempted": len(cps),
            "avg_accuracy": avg_acc,
            "recent_score": recent_score,
            "progress_pct": int(round(
                sum(1 for c in cps if c["passed"]) /
                max(sum(len(s["checkpoints"]) for s in STORIES.values()), 1) * 100)),
            "classic_sessions": len(classics),
            "story_sessions": len(cps),
        },
        "trend": trend,
        "struggling_words": sorted(
            [{"word": w, "count": n} for w, n in word_counts.items()],
            key=lambda x: -x["count"])[:8],
        "phoneme_errors": sorted(
            [{"phoneme": p, "count": n} for p, n in phoneme_counts.items()],
            key=lambda x: -x["count"])[:6],
        "stories": stories_out,
        "recent_sessions": recent_all,
    }


@api.get("/classroom/overview")
def classroom_overview(request: Request = None):
    forbidden = require_teacher(get_current_user(request))
    if forbidden:
        return forbidden
    with get_db_connection() as conn:
        students = conn.execute("SELECT COUNT(*) AS n FROM students").fetchone()["n"]
        sessions_today = conn.execute(
            "SELECT COUNT(*) AS n FROM story_sessions WHERE date(created_at) = date('now')"
        ).fetchone()["n"] + conn.execute(
            "SELECT COUNT(*) AS n FROM sessions WHERE date(timestamp) = date('now')"
        ).fetchone()["n"]
        cps = [dict(r) for r in conn.execute(
            """
            SELECT cr.accuracy, cr.stars, cr.words_json, cr.passed, cr.checkpoint_id,
                   ss.story_id, ss.created_at
            FROM checkpoint_results cr
            JOIN story_sessions ss ON ss.id = cr.session_id
            ORDER BY cr.created_at ASC
            """).fetchall()]

    class_accuracy = None
    if cps:
        last7 = cps[-40:]
        class_accuracy = int(round(
            sum((c["accuracy"] or 0) for c in last7) / len(last7)))

    # Weekly class performance
    by_day = {}
    for c in cps:
        day = (c["created_at"] or "")[:10]
        by_day.setdefault(day, []).append(c)
    weekly = []
    for day in sorted(by_day)[-7:]:
        items = by_day[day]
        weekly.append({
            "day": day,
            "accuracy": int(round(sum((i["accuracy"] or 0) for i in items) / len(items))),
            "sessions": len({i["story_id"] + i["created_at"][:16] for i in items}),
        })

    # Top struggling areas (phoneme labels) + struggling words
    phoneme_counts, word_counts = {}, {}
    for c in cps:
        try:
            words = json.loads(c["words_json"] or "[]")
        except json.JSONDecodeError:
            words = []
        for w in words:
            if not w["correct"]:
                if w.get("phoneme_mismatch"):
                    phoneme_counts[w["phoneme_mismatch"]] = \
                        phoneme_counts.get(w["phoneme_mismatch"], 0) + 1
                else:
                    word_counts[w["word"].lower()] = \
                        word_counts.get(w["word"].lower(), 0) + 1
    total_flagged = sum(phoneme_counts.values()) + sum(word_counts.values()) or 1
    areas = [{"label": f"Sound: {p}", "count": n,
              "rate": int(round(n / total_flagged * 100))}
             for p, n in phoneme_counts.items()]
    areas += [{"label": f"Word: {w}", "count": n,
               "rate": int(round(n / total_flagged * 100))}
              for w, n in word_counts.items()]
    areas = sorted(areas, key=lambda x: -x["count"])[:5]

    # Checkpoint progress per story across the class
    checkpoint_progress = []
    with get_db_connection() as conn:
        for sid, story in STORIES.items():
            for cp in story["checkpoints"]:
                stats = conn.execute(
                    """
                    SELECT COUNT(*) AS attempted, AVG(accuracy) AS avg_acc,
                           SUM(passed) AS passed
                    FROM checkpoint_results cr
                    JOIN story_sessions ss ON ss.id = cr.session_id
                    WHERE ss.story_id = ? AND cr.checkpoint_id = ?
                    """, (sid, cp["id"])).fetchone()
                checkpoint_progress.append({
                    "story_id": sid, "story_title": story["title"],
                    "story_emoji": story["emoji"],
                    "checkpoint_id": cp["id"], "checkpoint_label": cp["text_en"][:48],
                    "attempted": stats["attempted"] or 0,
                    "passed": int(stats["passed"] or 0),
                    "avg_accuracy": int(round(stats["avg_acc"] or 0)),
                })

    # Per-sound heatmap data (roadmap Phase 12.4): every phoneme label with its
    # share of all analyzed words — the frontend renders this as a grid.
    total_words_analyzed = 0
    for c in cps:
        try:
            words = json.loads(c["words_json"] or "[]")
        except json.JSONDecodeError:
            words = []
        total_words_analyzed += len(words)
    phoneme_heatmap = [
        {"phoneme": p, "count": n,
         "rate": round(n / max(total_words_analyzed, 1) * 100, 1)}
        for p, n in sorted(phoneme_counts.items(), key=lambda x: -x[1])
    ]

    return {
        "totals": {
            "active_students": students,
            "sessions_today": sessions_today,
            "class_accuracy": class_accuracy,
            "stars_awarded": sum((c["stars"] or 0) for c in cps),
        },
        "weekly": weekly,
        "struggling_areas": areas,
        "phoneme_heatmap": phoneme_heatmap,
        "words_analyzed": total_words_analyzed,
        "checkpoint_progress": checkpoint_progress,
    }


# ── Sync ─────────────────────────────────────────────────────────────────────
@api.post("/sync")
def trigger_sync():
    return push_queued()


@api.get("/sync/status")
def sync_status():
    return {
        "queued": get_queued_count(),
        "cloud_configured": bool(settings.CLOUD_SYNC_URL),
        "mode": "online" if network_available() else "offline",
    }


# ── WebSocket channel ────────────────────────────────────────────────────────
@ws_router.websocket("/ws/sessions/{session_id}")
async def session_ws(websocket: WebSocket, session_id: str):
    await ws_manager.connect(session_id, websocket)
    try:
        while True:
            # Client -> server messages are not used for Phase-2 push, but the
            # socket stays open to receive them; pings keep it alive.
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id, websocket)
    except Exception:
        ws_manager.disconnect(session_id, websocket)
