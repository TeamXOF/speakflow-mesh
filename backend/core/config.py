"""
SpeakFlow v2 — central settings.
All v2 tunables live here; nothing else reads os.environ directly (roadmap Prompt 1).
Gen-1 modules keep their own env reads — untouched by design.
"""
import os
from dotenv import load_dotenv

load_dotenv()

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(_BACKEND_DIR, "data")


class Settings:
    # ── Reasoning layer (roadmap Feature 3: Gemini feedback + hesitation) ─────
    # Primary model per the locked roadmap; the -latest alias is tried once if
    # the exact model ID is not available on this key's free tier.
    FEEDBACK_MODEL = os.getenv("FEEDBACK_MODEL", "gemini-3.5-flash-lite")
    FEEDBACK_MODEL_FALLBACK = os.getenv("FEEDBACK_MODEL_FALLBACK", "gemini-flash-lite-latest")
    # Phase 2 is async and never blocks the child, so the soft timeout is longer
    # than the roadmap's synchronous 1.5s sketch — the child sees Phase 1 immediately.
    FEEDBACK_TIMEOUT_S = float(os.getenv("FEEDBACK_TIMEOUT_S", "10"))
    JUDGE_HESITATION_ENABLED = os.getenv("JUDGE_HESITATION_ENABLED", "1") == "1"
    HESITATION_TIMEOUT_S = float(os.getenv("HESITATION_TIMEOUT_S", "8"))

    # ── Demo-day key isolation (roadmap Phase E.4 / K.3) ──────────────────────
    # ENV=dev uses GOOGLE_API_KEYS; ENV=demo switches to GEMINI_API_KEY_DEMO so
    # demo-day traffic never shares quota with development testing.
    ENV = os.getenv("ENV", "dev")
    GEMINI_API_KEY_DEMO = os.getenv("GEMINI_API_KEY_DEMO", "")

    @property
    def active_gemini_key(self) -> str:
        if self.ENV == "demo" and self.GEMINI_API_KEY_DEMO:
            return self.GEMINI_API_KEY_DEMO
        return os.getenv("GOOGLE_API_KEYS", os.getenv("GOOGLE_API_KEY", ""))

    # ── STT (roadmap: Groq online, local quantized Whisper fallback) ──────────
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_STT_MODEL = os.getenv("GROQ_STT_MODEL", "whisper-large-v3")
    GROQ_STT_URL = os.getenv("GROQ_STT_URL", "https://api.groq.com/openai/v1/audio/transcriptions")
    # The roadmap's 600ms Phase-1 STT budget is the ideal; 3s keeps the online
    # path usable in practice while still guaranteeing the local fallback fires.
    STT_TIMEOUT_S = float(os.getenv("STT_TIMEOUT_S", "3"))

    # STT engine choice (Settings → live-editable): "auto" = Groq when online
    # with a key, local otherwise; "groq" = prefer cloud, gracefully fall back
    # to local when offline; "local" = never call Groq.
    @property
    def stt_mode(self) -> str:
        mode = (os.getenv("STT_MODE", "auto") or "auto").strip().lower()
        return mode if mode in ("auto", "groq", "local") else "auto"

    # Classic-engine agent model (Settings → live-editable): "auto" resolves to
    # Flash-Lite; explicit names pin that model.
    @property
    def agent_model(self) -> str:
        model = (os.getenv("GEN1_AGENT_MODEL", "auto") or "auto").strip()
        return model or "auto"

    # ── Local Whisper (shared with Gen-1) ─────────────────────────────────────
    WHISPER_MODEL = os.getenv("WHISPER_MODEL", "tiny")

    # ── Scoring (roadmap Part 2.1: threshold is a tuning knob, not truth) ─────
    WORD_CORRECT_THRESHOLD = int(os.getenv("WORD_CORRECT_THRESHOLD", "70"))
    CHECKPOINT_PASS_THRESHOLD = int(os.getenv("CHECKPOINT_PASS_THRESHOLD", "70"))

    # ── Reference-vector dictionary (roadmap Phase D) ─────────────────────────
    # When a word has a hand-verified reference vector, blend the acoustic
    # distance into the composite score with this weight. Synthetic placeholder
    # references can be disabled entirely by setting USE_REFERENCE_VECTORS=0.
    USE_REFERENCE_VECTORS = os.getenv("USE_REFERENCE_VECTORS", "1") == "1"
    REFERENCE_BLEND_WEIGHT = float(os.getenv("REFERENCE_BLEND_WEIGHT", "0.25"))

    # ── Hesitation / pause flags ──────────────────────────────────────────────
    PAUSE_FLAG_MS = int(os.getenv("PAUSE_FLAG_MS", "400"))
    PAUSE_AMBIGUOUS_MS = int(os.getenv("PAUSE_AMBIGUOUS_MS", "900"))

    # ── Offline / sync (roadmap Part 1.3) ─────────────────────────────────────
    # Point this at a cloud ingest endpoint to enable sync-on-reconnect.
    # Unset = queue mechanics still work (synced flags tracked), nothing is pushed.
    CLOUD_SYNC_URL = os.getenv("CLOUD_SYNC_URL", "")
    NETWORK_PROBE_TTL_S = float(os.getenv("NETWORK_PROBE_TTL_S", "5"))
    SYNC_INTERVAL_S = int(os.getenv("SYNC_INTERVAL_S", "30"))

    # ── Story checkpoints count cap (roadmap Feature 4: 3-5 fixed) ────────────
    MAX_CHECKPOINTS = 5


settings = Settings()
