"""
Dynamic Story Mode — endless dual-track (English / اردو) level engine.

Design goals (roadmap: "not capped at 15 levels"):
- Levels are GENERATED content: every (track, level) maps to one sentence with a
  theme and a difficulty that ramps with the level number. Levels are generated
  once by the Gemini Flash-Lite agent, cached in `story_levels`, and shared by
  every student — so progression is consistent and teacher-friendly.
- Every 5th level is a BOSS level (tongue-twister challenge).
- Stars are the currency: 3★ ≥95 accuracy, 2★ ≥80, 1★ ≥70 (passed), 0 below.
  Best stars/accuracy per (student, track, level) persist in `story_progress`.
- Level N+1 unlocks when level N is passed.
- Reuses the exact measurement core as the other engines (Groq→local STT,
  librosa acoustics, alignment + morphology scoring, Gemini feedback).
"""
import os
import json
import time
import uuid
import base64
import asyncio
import logging

from fastapi import APIRouter, Request, BackgroundTasks, File, Form, UploadFile
from fastapi.responses import JSONResponse

from core.config import settings
from core.security import new_token
from database.schema import get_db_connection
from routers.auth import get_current_user
from services.stt import get_transcript
from services import acoustic
from services.reasoning import generate_feedback
from routers.v1 import ApiError

log = logging.getLogger("speakflow.story")

router = APIRouter(prefix="/api/v1/story", tags=["story-mode"])

# ── Content constants ─────────────────────────────────────────────────────────
WORLD_SIZE = 5

THEMES = {
    "en": ["Enchanted Forest", "Sunny Meadow", "Ocean Cove", "Sky Islands", "Desert Dunes",
           "Space Station", "Jungle Trek", "Crystal Caves", "Rainbow Valley", "Dragon Mountains",
           "Candy Kingdom", "Pirate Bay", "Arctic Expedition", "Time Travelers", "Dinosaur Valley",
           "Cloud Castle", "Racing Riverrun", "Mystery Museum", "Sports Stadium", "Music Mountain"],
    "ur": ["جادویی جنگل", "دھوپ کا میدان", "سمندری کھاڑی", "آسمانی جزیرے", "ریگستان کے ٹیلے",
           "خلا اسٹیشن", "جنگل کا سفر", "بلور غار", "قوس قزح وادی", "اژدہا پہاڑ",
           "مٹھائی کی سلطنت", "سمندری ڈاکو", "برفانی مہم", "وقت کے مسافر", "ڈائنوسار وادی",
           "بادلوں کا قلعہ", "دوڑتی ندی", "پراسرار میوزیم", "کھیل کا میدان", "موسیقی کا پہاڑ"],
}

# Offline fallback sentences (per track, per difficulty band)
FALLBACK = {
    "en": {
        "easy": ["The small bird sings all day.", "A red fish swims very fast.",
                 "Two cats play with a ball.", "The sun warms the green hill.",
                 "My kite flies in the wind.", "The happy dog runs home."],
        "medium": ["Bright green frogs jumped across the muddy garden path.",
                   "The friendly bus driver waved at the kids.",
                   "A small fish swam under the old stone bridge.",
                   "Two black birds sat on the garden fence.",
                   "The children played in the park after school.",
                   "Fluffy clouds drifted over the quiet village."],
        "hard": ["Six sleek swans swam swiftly past the wooden dock.",
                 "The brave knight fought through thick fog to reach the castle.",
                 "Twelve twins twisted twice around the twitching purple tree.",
                 "Grab the bright green wrench from the third shelf of the garage.",
                 "Crisp crunchy carrots cooled completely inside crystal copper cups.",
                 "The thoughtful thistle throve through the long dry summer."],
    },
    "ur": {
        "easy": ["علی اسکول جاتا ہے۔", "آم میٹھا ہوتا ہے۔", "بلی دودھ پیتی ہے۔",
                 "پرندے آسمان میں اڑتے ہیں۔", "چاند رات میں نظر آتا ہے۔", "میں کتاب پڑھتا ہوں۔"],
        "medium": ["چھوٹا لومڑ صبح جلدی اٹھا۔", "بارش کے بعد باغ بہت ہرا بھرا تھا۔",
                   "ننھی چڑیا نے درخت پر گھونسلہ بنایا۔", "بچے میدان میں کرکٹ کھیل رہے ہیں۔",
                   "دوست گاؤں کی طرف چل پڑے۔", "کہانی کا یہ حصہ بہت دلچسپ تھا۔"],
        "hard": ["پہاڑی سے برفانی ندی گرجتی ہوئی گزرتی ہے۔",
                 "شہر کی گلیوں میں روشنیوں کی چادر بچھ جاتی ہے۔",
                 "استاد نے مشکل الفاظ کے معنی آسانی سے سمجھا دیے۔",
                 "خوفزدہ خرگوش جھاڑیوں میں چھپ گیا۔",
                 "نغمہ خوان پرندوں نے صبح کا استقبال کیا۔",
                 "کشتکار نے تیز ہوا سے بچنے کے لیے فصلیں لگائیں۔"],
    },
}

LEVEL_PROMPT = """You create ONE reading-practice sentence for a grade-3 child.
Theme: "{theme}". Difficulty: "{difficulty}". Language: {language_name}.
Length guide: easy 5-8 words; medium 8-11 words; hard 11-15 words;
boss = a fun tongue-twister that packs the theme's sounds tightly.
For Urdu: natural, correct grade-3 Urdu in Nastaliq script ending with ۔
The sentence MUST mention the theme. Be original — never stock sentences.
Return ONLY valid JSON: {{"sentence": "..."}}"""

DIFFICULTY_LABELS = {"en": {"easy": "easy", "medium": "medium", "hard": "hard", "boss": "boss tongue-twister"},
                     "ur": {"easy": "آسان", "medium": "درمیانہ", "hard": "مشکل", "boss": "باس ٹانگ توڑ"}}


def _band(level: int) -> str:
    if level <= 3:
        return "easy"
    if level <= 8:
        return "medium"
    return "hard"


def level_difficulty(level: int) -> str:
    return "boss" if level % WORLD_SIZE == 0 else _band(level)


def level_theme(track: str, level: int) -> str:
    themes = THEMES.get(track, THEMES["en"])
    return themes[((level - 1) // WORLD_SIZE) % len(themes)]


def world_name(track: str, world: int) -> str:
    themes = THEMES.get(track, THEMES["en"])
    return themes[(world - 1) % len(themes)]


def language_name(track: str) -> str:
    return "Urdu (اردو)" if track == "ur" else "English"


def stars_for(accuracy: int) -> int:
    if accuracy >= 95: return 3
    if accuracy >= 80: return 2
    if accuracy >= 70: return 1
    return 0


# ── Level generation ──────────────────────────────────────────────────────────
def get_or_create_level(track: str, level: int) -> dict:
    """Return {sentence, theme, difficulty} for (track, level), generating and
    caching it on first touch so every student plays the same level N."""
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT sentence, theme, difficulty FROM story_levels WHERE track = ? AND level = ?",
            (track, level)).fetchone()
    if row:
        return {"sentence": row["sentence"], "theme": row["theme"], "difficulty": row["difficulty"]}

    theme = level_theme(track, level)
    difficulty = level_difficulty(level)
    band = "hard" if difficulty == "boss" else _band(level)
    sentence = None
    try:
        from agents.orchestrator import call_agent
        import asyncio as _asyncio

        async def _call():
            return await call_agent(
                LEVEL_PROMPT.format(theme=theme, difficulty=DIFFICULTY_LABELS[track][difficulty],
                                    language_name=language_name(track)),
                {"theme": theme, "difficulty": difficulty, "track": track, "level": level})

        try:
            _asyncio.get_running_loop()
            # called from inside a running loop (rare) — run on a worker thread
            import concurrent.futures as _cf
            data = _cf.ThreadPoolExecutor(1).submit(
                lambda: _asyncio.run(_call())).result(timeout=25)
        except RuntimeError:
            data = _asyncio.run(_call())
        sentence = str((data or {}).get("sentence") or "").strip()
    except Exception as e:
        log.warning("story level %s/%s generation failed: %s", track, level, e)

    if not sentence or len(sentence) < 8:
        bank = FALLBACK.get(track, FALLBACK["en"])[band]
        sentence = bank[(level * 7 + len(theme)) % len(bank)]

    with get_db_connection() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO story_levels (track, level, sentence, theme, difficulty) VALUES (?, ?, ?, ?, ?)",
            (track, level, sentence, theme, difficulty))
        conn.commit()
    return {"sentence": sentence, "theme": theme, "difficulty": difficulty}


def _student_id_or_403(request: Request, wanted: str | None):
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in.", 401)
    if user["status"] != "approved":
        raise ApiError("VALIDATION_ERROR", "Account not approved.", 403)
    if user["role"] == "teacher":
        if not wanted:
            raise ApiError("VALIDATION_ERROR", "student_id required", 422)
        return wanted
    return user.get("student_id")


def _progress_rows(student_id: str, track: str) -> list:
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT level, best_accuracy, stars, attempts, passed FROM story_progress "
            "WHERE student_id = ? AND track = ? ORDER BY level",
            (student_id, track)).fetchall()
    return [dict(r) for r in rows]


def _unlocked_and_next(progress: list) -> tuple[int, int, int]:
    """Returns (unlocked_upto, next_level, total_stars)."""
    total_stars = sum(int(r["stars"] or 0) for r in progress)
    unlocked = 1
    by_level = {r["level"]: r for r in progress}
    while by_level.get(unlocked, {}).get("passed"):
        unlocked += 1
    next_level = unlocked
    return unlocked, next_level, total_stars


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/map")
def story_map(request: Request, world: int = 0, track: str = "en", student_id: str | None = None):
    """Level map for one world: statuses, stars, unlocks. Auth: approved user
    (students always see their own progression)."""
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in.", 401)
    track = track if track in ("en", "ur") else "en"
    if user["role"] == "teacher":
        if not student_id:
            raise ApiError("VALIDATION_ERROR", "student_id required", 422)
        student_id = student_id
    else:
        student_id = user.get("student_id")

    progress = _progress_rows(student_id or "", track)
    by_level = {r["level"]: r for r in progress}
    unlocked, next_level, total_stars = _unlocked_and_next(progress)

    if world <= 0:
        # current world = world of the next recommended level
        world = ((next_level - 1) // WORLD_SIZE) + 1
    start = (world - 1) * WORLD_SIZE + 1
    levels = []
    for lv in range(start, start + WORLD_SIZE):
        pr = by_level.get(lv)
        status = "completed" if pr and pr["passed"] else ("current" if lv == next_level else "locked")
        levels.append({
            "level": lv,
            "theme": level_theme(track, lv),
            "difficulty": level_difficulty(lv),
            "boss": lv % WORLD_SIZE == 0,
            "stars": int(pr["stars"] or 0) if pr else 0,
            "best_accuracy": int(pr["best_accuracy"] or 0) if pr else None,
            "attempts": int(pr["attempts"] or 0) if pr else 0,
            "status": status,
            "unlocked": lv <= unlocked,
        })
    return {
        "track": track, "world": world, "world_name": world_name(track, world),
        "levels": levels, "total_stars": total_stars,
        "next_level": next_level, "unlocked_upto": unlocked,
        "levels_completed": sum(1 for r in progress if r["passed"]),
    }


@router.get("/play")
def play_level(request: Request, level: int, track: str = "en"):
    """Level content for the play screen. The sentence is shown only here."""
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in.", 401)
    track = track if track in ("en", "ur") else "en"
    if level < 1 or level > 9999:
        raise ApiError("VALIDATION_ERROR", "level out of range", 422)
    info = get_or_create_level(track, level)
    progress = _progress_rows(user.get("student_id") or "", track) if user["role"] != "teacher" else []
    by_level = {r["level"]: r for r in progress}
    unlocked, _, _ = _unlocked_and_next(progress)
    if user["role"] != "teacher" and level > unlocked:
        raise ApiError("VALIDATION_ERROR", "This level is still locked. Pass the level before it!", 403)
    return {"track": track, "level": level, "sentence": info["sentence"],
            "theme": info["theme"], "difficulty": info["difficulty"],
            "best_stars": int(by_level[level]["stars"] or 0) if level in by_level else 0,
            "attempts": int(by_level[level]["attempts"] or 0) if level in by_level else 0}


def _audio_ext(data: bytes) -> str:
    if data[:4] == b"OggS": return ".ogg"
    if len(data) > 8 and data[4:8] == b"ftyp": return ".mp4"
    if data[:4] == b"RIFF": return ".wav"
    if data[:3] == b"ID3" or (len(data) > 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0): return ".mp3"
    return ".webm"


def _run_phase2(attempt_id: str, sentence: str, track: str, signal: dict):
    """Background Gemini coaching, persisted for polling."""
    try:
        import asyncio as _asyncio
        hint = {"target_text": sentence, "language": track, "comprehension_hint": ""}
        payload = _asyncio.run(generate_feedback(signal, hint))
    except Exception as e:
        log.warning("story phase2 failed: %s", e)
        payload = {"feedback_text": "Good try! Read it again slowly — you are getting better!",
                   "practice_recommendation": None, "engagement_state": "unknown",
                   "feedback_source": "template_fallback"}
    with get_db_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO story_phase2 (attempt_id, payload_json) VALUES (?, ?)",
            (attempt_id, json.dumps(payload, ensure_ascii=False)))
        conn.commit()


@router.post("/analyze")
async def story_analyze(request: Request, background_tasks: BackgroundTasks,
                        audio: UploadFile = File(...), track: str = Form("en"),
                        level: int = Form(...)):
    """One recorded attempt at one level. Same measurement core as the other
    engines: Groq→local STT, librosa acoustics, alignment + morphology scoring,
    extra-word penalty, Gemini coaching in the background."""
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in.", 401)
    if user["status"] != "approved":
        raise ApiError("VALIDATION_ERROR", "Account not approved.", 403)
    student_id = user.get("student_id")
    if user["role"] == "teacher":
        raise ApiError("VALIDATION_ERROR", "Story Mode is for students — use a student account.", 403)
    if not student_id:
        raise ApiError("VALIDATION_ERROR", "Your account is not linked to a reader profile.", 403)
    track = track if track in ("en", "ur") else "en"
    if level < 1 or level > 9999:
        raise ApiError("VALIDATION_ERROR", "level out of range", 422)

    info = get_or_create_level(track, level)
    sentence = info["sentence"]
    progress = _progress_rows(student_id, track)
    unlocked, _, _ = _unlocked_and_next(progress)
    if level > unlocked:
        raise ApiError("VALIDATION_ERROR", "This level is still locked. Pass the level before it!", 403)

    audio_bytes = await audio.read()
    if len(audio_bytes) < 1000:
        raise ApiError("AUDIO_TOO_SHORT", "Audio recording was too short", 422)
    ext = _audio_ext(audio_bytes)
    tmp_path = None
    t0 = time.perf_counter()
    try:
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        t_s = time.perf_counter()
        transcript = get_transcript(tmp_path, track)
        stt_ms = (time.perf_counter() - t_s) * 1000
        t_a = time.perf_counter()
        acoustics = acoustic.extract_word_acoustics(tmp_path, transcript.words)
        acoustic_ms = (time.perf_counter() - t_a) * 1000

        entries = acoustic.align_words(sentence, transcript.words)
        for e in entries:
            e["language"] = track
        scored = [acoustic.score_word(e, acoustics) for e in entries if e["target"]]
        extras = []
        for e in entries:
            for w in e.get("extra_words") or []:
                extras.append({"word": w, "correct": False, "score": 15,
                               "phoneme_mismatch": "extra word", "spoken": w, "extra": True})
        scored.extend(extras)

        target_count = max(len(acoustic.tokenize(sentence)), 1)
        correct_count = sum(1 for w in scored if w["correct"])
        accuracy = int(round(correct_count / (target_count + len(extras)) * 100))
        stars = stars_for(accuracy)
        passed = accuracy >= settings.CHECKPOINT_PASS_THRESHOLD
        wpm = 0.0
        if transcript.words:
            dur = acoustics.get("total_duration") or (
                transcript.words[-1]["end"] - transcript.words[0]["start"])
            if dur > 0:
                wpm = round(len(transcript.words) / dur * 60, 1)
        pauses = acoustic.detect_hesitations(transcript.words)
        engagement = acoustic.engagement_heuristic(acoustics.get("pitch_variance", 0.0), pauses, accuracy)
        scoring_ms = (time.perf_counter() - t0) * 1000

        attempt_id = f"att_{uuid.uuid4().hex[:10]}"
        signal = {"transcript": transcript.text, "words": scored, "accuracy": accuracy,
                  "wpm": wpm, "hesitations": pauses, "engagement_state": engagement}
        background_tasks.add_task(_run_phase2, attempt_id, sentence, track, signal)

        with get_db_connection() as conn:
            conn.execute(
                """INSERT INTO story_attempts (id, student_id, track, level, accuracy, stars, passed, result_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (attempt_id, student_id, track, level, accuracy, stars, 1 if passed else 0,
                 json.dumps({"words": scored, "wpm": wpm, "hesitations": pauses,
                             "latency_ms": {"stt": int(stt_ms), "acoustic": int(acoustic_ms),
                                            "total": int(scoring_ms)}, "transcript": transcript.text},
                            ensure_ascii=False)))
            conn.execute(
                """INSERT INTO story_progress (student_id, track, level, best_accuracy, stars, attempts, passed)
                   VALUES (?, ?, ?, ?, ?, 1, ?)
                   ON CONFLICT(student_id, track, level) DO UPDATE SET
                     best_accuracy = MAX(best_accuracy, excluded.best_accuracy),
                     stars = MAX(stars, excluded.stars),
                     passed = MAX(passed, excluded.passed),
                     attempts = attempts + 1,
                     updated_at = datetime('now')""",
                (student_id, track, level, accuracy, stars, 1 if passed else 0))
            conn.commit()

        return {
            "attempt_id": attempt_id, "track": track, "level": level,
            "sentence": sentence, "theme": info["theme"], "difficulty": info["difficulty"],
            "transcript": transcript.text,
            "words": scored, "accuracy": accuracy, "stars": stars, "passed": passed,
            "wpm": wpm, "hesitations": pauses, "engagement_state": engagement,
            "stt_source": transcript.source, "latency_ms": {"stt": int(stt_ms), "acoustic": int(acoustic_ms),
                                                            "total": int(scoring_ms)},
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


@router.post("/analyze-mock")
async def story_analyze_mock(request: Request, background_tasks: BackgroundTasks, body: dict):
    """Dev/demo path: same scoring machinery with a supplied transcript."""
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in.", 401)
    if user["role"] != "student" or not user.get("student_id"):
        raise ApiError("VALIDATION_ERROR", "Student account required.", 403)
    student_id = user["student_id"]
    track = body.get("track", "en")
    track = track if track in ("en", "ur") else "en"
    level = int(body.get("level") or 1)
    info = get_or_create_level(track, level)
    sentence = info["sentence"]

    words_in = body.get("words") or []
    probs = body.get("word_probabilities") or {}
    spoken = []
    clock = 0.3
    for i, w in enumerate(words_in):
        dur = 0.22
        spoken.append({"word": w, "start": round(clock, 3), "end": round(clock + dur, 3),
                       "probability": float(probs.get(w, 0.92))})
        clock += dur

    entries = acoustic.align_words(sentence, spoken)
    for e in entries:
        e["language"] = track
    scored = [acoustic.score_word(e, {"word_features": {}, "pitch_variance": 300.0,
                                      "total_duration": clock}) for e in entries if e["target"]]
    extras = []
    for e in entries:
        for w in e.get("extra_words") or []:
            extras.append({"word": w, "correct": False, "score": 15,
                           "phoneme_mismatch": "extra word", "spoken": w, "extra": True})
    scored.extend(extras)

    target_count = max(len(acoustic.tokenize(sentence)), 1)
    correct_count = sum(1 for w in scored if w["correct"])
    accuracy = int(round(correct_count / (target_count + len(extras)) * 100))
    stars = stars_for(accuracy)
    passed = accuracy >= settings.CHECKPOINT_PASS_THRESHOLD
    wpm = round(len(words_in) / max(clock, 0.1) * 60, 1)

    attempt_id = f"att_{uuid.uuid4().hex[:10]}"
    signal = {"transcript": " ".join(words_in), "words": scored, "accuracy": accuracy,
              "wpm": wpm, "hesitations": [], "engagement_state": "unknown"}
    background_tasks.add_task(_run_phase2, attempt_id, sentence, track, signal)

    with get_db_connection() as conn:
        conn.execute(
            """INSERT INTO story_attempts (id, student_id, track, level, accuracy, stars, passed, result_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (attempt_id, student_id, track, level, accuracy, stars, 1 if passed else 0,
             json.dumps({"words": scored, "wpm": wpm, "mock": True}, ensure_ascii=False)))
        conn.execute(
            """INSERT INTO story_progress (student_id, track, level, best_accuracy, stars, attempts, passed)
               VALUES (?, ?, ?, ?, ?, 1, ?)
               ON CONFLICT(student_id, track, level) DO UPDATE SET
                 best_accuracy = MAX(best_accuracy, excluded.best_accuracy),
                 stars = MAX(stars, excluded.stars),
                 passed = MAX(passed, excluded.passed),
                 attempts = attempts + 1,
                 updated_at = datetime('now')""",
            (student_id, track, level, accuracy, stars, 1 if passed else 0))
        conn.commit()

    return {"attempt_id": attempt_id, "track": track, "level": level, "sentence": sentence,
            "theme": info["theme"], "difficulty": info["difficulty"], "words": scored,
            "accuracy": accuracy, "stars": stars, "passed": passed, "wpm": wpm}


@router.get("/feedback/{attempt_id}")
def story_feedback(attempt_id: str, request: Request):
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in.", 401)
    with get_db_connection() as conn:
        row = conn.execute("SELECT payload_json FROM story_phase2 WHERE attempt_id = ?",
                           (attempt_id,)).fetchone()
    if not row:
        return {"status": "pending"}
    return json.loads(row["payload_json"] or "{}")


@router.get("/summary")
def story_summary(request: Request, track: str = "en"):
    user = get_current_user(request)
    if not user:
        raise ApiError("VALIDATION_ERROR", "Please log in.", 401)
    track = track if track in ("en", "ur") else "en"
    student_id = user.get("student_id") or ""
    progress = _progress_rows(student_id, track)
    unlocked, next_level, total_stars = _unlocked_and_next(progress)
    return {"track": track, "total_stars": total_stars, "levels_completed": sum(1 for r in progress if r["passed"]),
            "attempts": sum(int(r["attempts"] or 0) for r in progress),
            "unlocked_upto": unlocked, "next_level": next_level}
