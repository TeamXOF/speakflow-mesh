import asyncio
import json
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

from .phonetic_agent import PHONETIC_SYSTEM_PROMPT
from .difficulty_agent import DIFFICULTY_SYSTEM_PROMPT
from .engagement_agent import ENGAGEMENT_SYSTEM_PROMPT
from .practice_agent import PRACTICE_SYSTEM_PROMPT
from .progress_agent import PROGRESS_SYSTEM_PROMPT

# Setup API Key Pool
api_keys_str = os.getenv("GOOGLE_API_KEYS", os.getenv("GOOGLE_API_KEY", ""))
API_KEYS = [k.strip() for k in api_keys_str.split(",") if k.strip()]
if not API_KEYS:
    raise ValueError("No API keys found. Please set GOOGLE_API_KEYS in .env")

current_key_idx = 0
key_lock = asyncio.Lock()
genai.configure(api_key=API_KEYS[current_key_idx])

# Model choice: Gemini Flash-Lite is the default (much faster than the served
# open Gemma on the free tier, same free quota, strict JSON mode) with an alias
# fallback if the pinned name disappears. GEN1_AGENT_MODEL is live-editable from
# Settings: "auto" (→ Flash-Lite), "gemini-3.5-flash-lite", or "gemma-4-31b-it".
_FLASH = "gemini-3.5-flash-lite"
MODEL_FALLBACK = "gemini-flash-lite-latest"
_MODEL_NOT_FOUND_MARKERS = ("not found", "is not supported", "unsupported", "404")


def _resolve_model() -> str:
    model = (os.getenv("GEN1_AGENT_MODEL", "auto") or "auto").strip()
    return _FLASH if model.lower() in ("", "auto") else model


# Advanced tier for the fallback net (strong reads)
_HARD_SENTENCES = [
    {"text": "She sells seashells by the seashore.", "target_phoneme": "s/sh blend", "difficulty": "hard"},
    {"text": "How much wood would a woodchuck chuck if a woodchuck could chuck wood?", "target_phoneme": "w/ch blend", "difficulty": "hard"},
    {"text": "Peter Piper picked a peck of pickled peppers.", "target_phoneme": "p consonant", "difficulty": "hard"},
    {"text": "Fuzzy Wuzzy was a bear, Fuzzy Wuzzy had no hair.", "target_phoneme": "z consonant", "difficulty": "medium"},
    {"text": "I scream, you scream, we all scream for ice cream!", "target_phoneme": "scr blend", "difficulty": "medium"},
]


def _story_sentences_for(words: list, language: str = "en", limit: int = 5) -> list:
    """Real story checkpoint sentences that contain the flagged words — a
    natural, targeted fallback tier for readers who need support."""
    try:
        with open(os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "data", "stories.json"), encoding="utf-8") as f:
            stories = json.load(f)["stories"]
    except Exception:
        return []
    text_key = "text_ur" if language == "ur" else "text_en"
    sentences, seen = [], set()
    for story in stories:
        for cp in story.get("checkpoints", []):
            text = cp.get(text_key, "")
            low = text.lower()
            hit_word = next((w for w in words if w.lower() in low), None)
            if hit_word and text not in seen:
                seen.add(text)
                sentences.append({"text": text,
                                  "target_phoneme": f"word: {hit_word}",
                                  "difficulty": "medium"})
            if len(sentences) >= limit:
                return sentences
    return sentences


async def call_agent(system_prompt: str, user_data: dict) -> dict:
    """
    One diagnosis agent: prompt → structured JSON, with API-key rotation and
    model fallback. (Named call_agent since the model is Flash-Lite by default;
    was call_gemma in the original Gemma-only build.)
    """
    global current_key_idx

    model_name = _resolve_model()
    max_retries = len(API_KEYS) * 2 if len(API_KEYS) > 1 else 3

    for attempt in range(max_retries):
        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            # Sync call in a worker thread (same pattern as services/reasoning.py):
            # the deprecated SDK's generate_content_async is dramatically slower
            # under the server's event loop than a plain threaded call.
            response = await asyncio.to_thread(model.generate_content, json.dumps(user_data))

            text = response.text
            start = text.find("{")
            if start != -1:
                # Use raw_decode to parse exactly one valid JSON object and ignore any "Extra data" that follows it
                decoder = json.JSONDecoder()
                parsed_json, _ = decoder.raw_decode(text[start:])
                return parsed_json

            # Fallback if no '{' is found (highly unlikely given the prompt)
            return json.loads(text)

        except Exception as e:
            error_msg = str(e)
            print(f"Attempt {attempt+1}/{max_retries} failed ({model_name}): {error_msg}")

            # Wrong model name → try the alias once, don't burn key rotations on it
            if any(m in error_msg.lower() for m in _MODEL_NOT_FOUND_MARKERS) and model_name != MODEL_FALLBACK:
                model_name = MODEL_FALLBACK
                continue

            # If we have multiple keys, rotate. If not, just exponential backoff.
            if len(API_KEYS) > 1:
                async with key_lock:
                    current_key_idx = (current_key_idx + 1) % len(API_KEYS)
                    new_key = API_KEYS[current_key_idx]
                    genai.configure(api_key=new_key)
                    print(f"Rotated to API Key {current_key_idx+1}/{len(API_KEYS)}")

            # Backoff before retry (1s, 2s, 4s...)
            await asyncio.sleep(2 ** attempt)

    return {"error": "All retry attempts failed."}

async def run_pipeline(signal_data: dict, session_history: list) -> dict:
    """
    Main pipeline execution.
    Agents 1-3 run in parallel.
    Agent 4 waits for 1-3.
    Agent 5 runs independently (in parallel with 4).
    """
    # Phase 1: Parallel diagnosis (agents 1, 2, 3)
    phonetic, difficulty, engagement = await asyncio.gather(
        call_agent(PHONETIC_SYSTEM_PROMPT, signal_data),
        call_agent(DIFFICULTY_SYSTEM_PROMPT, signal_data),
        call_agent(ENGAGEMENT_SYSTEM_PROMPT, signal_data),
    )
    
    # Check for API errors in phase 1
    if "error" in phonetic: return {"error": "Phonetic agent failed"}
    
    # Phase 2: Practice generator waits for 1-3 to complete
    recent = [s for s in (session_history or []) if s.get("accuracy") is not None][:3]
    recent_accuracy = (
        round(sum(float(s["accuracy"]) for s in recent) / len(recent) * 100)
        if recent else None)
    recent_wpm = (
        round(sum(float(s.get("wpm") or 0) for s in recent) / len(recent), 1)
        if recent else None)
    language = signal_data.get("language", "en")
    practice_input = {
        **phonetic,
        **difficulty,
        **engagement,
        "grade": signal_data.get("grade", 3),
        # Urdu reads get Urdu practice sentences + Urdu encouragement
        "output_language": "Urdu (اردو)" if language == "ur" else "English",
        # Adaptive ladder inputs: how well the child has actually been reading
        "recent_accuracy": recent_accuracy,
        "recent_wpm": recent_wpm,
        "sessions_practiced": len(session_history or []),
        "accuracy_trend": signal_data.get("accuracy_trend", "stable"),
    }

    progress_input = {
        "sessions": session_history,
        "today_diagnosis": {**phonetic, **difficulty, **engagement},
        **signal_data
    }

    # Practice and Progress can run in parallel
    practice, progress = await asyncio.gather(
        call_agent(PRACTICE_SYSTEM_PROMPT, practice_input),
        call_agent(PROGRESS_SYSTEM_PROMPT, progress_input),
    )

    # 🛑 FALLBACK NET (only when the model returns nothing usable):
    # tiered by actual performance, grounded in real sentences.
    if not practice.get("sentences") or len(practice.get("sentences", [])) == 0:
        struggling = phonetic.get("struggling_words") or []
        if struggling and recent_accuracy is not None and recent_accuracy < 90:
            # Needs support → real story sentences containing the flagged words
            sentences = _story_sentences_for(struggling, language)
            practice["focus_area"] = "Flagged words from your own reading"
            practice["sentences"] = sentences or _HARD_SENTENCES
            practice["difficulty_note"] = "easier, targeted"
        else:
            # Strong read → advanced articulation tier
            practice["focus_area"] = "Advanced Mastery & Articulation"
            practice["sentences"] = _HARD_SENTENCES
        practice["encouraging_note"] = (
            "You read really well! Now let's try some really tricky tongue twisters!"
            if not struggling else
            "Let's practice the tricky words from your reading — you've got this!")
        practice["teacher_tip"] = (
            "Fallback exercise tier assigned from the child's measured performance.")

    return {
        "phonetic": phonetic,
        "difficulty": difficulty,
        "engagement": engagement,
        "practice": practice,
        "progress": progress,
    }
