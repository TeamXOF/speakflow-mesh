from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class ErrorCode(str, Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    AUDIO_TOO_SHORT = "AUDIO_TOO_SHORT"
    GROQ_UNAVAILABLE = "GROQ_UNAVAILABLE"
    GEMINI_UNAVAILABLE = "GEMINI_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"

class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str
    retryable: bool

class ErrorEnvelope(BaseModel):
    error: ErrorDetail

class CreateSessionRequest(BaseModel):
    student_id: str
    story_id: str
    language: str

class Checkpoint(BaseModel):
    checkpoint_id: str
    target_text: str

class CreateSessionResponse(BaseModel):
    session_id: str
    checkpoints: List[Checkpoint]

class AcousticDiagnostics(BaseModel):
    clarity_score: float = Field(default=100.0, description="Derived from spectral flatness/centroid. 0=muffled/noise, 100=clear tone")
    loudness_score: float = Field(default=100.0, description="Derived from RMS energy. 0=whisper, 100=good volume")
    pitch_stability: float = Field(default=100.0, description="Derived from pitch standard deviation. 0=unstable/shaky, 100=stable")
    spectral_centroid_hz: Optional[float] = Field(default=None, description="Perceived brightness / consonant articulation in Hz")
    spectral_flatness: Optional[float] = Field(default=None, description="Tonal clarity vs noise (0.0=pure tone, 1.0=white noise)")
    pitch_hz: Optional[float] = Field(default=None, description="Fundamental pitch F0 in Hz")
    mfcc_coeffs: Optional[List[float]] = Field(default=None, description="Top MFCC coefficients representing vocal tract timbre")

class LetterDiff(BaseModel):
    type: str = Field(description="'match', 'replace', 'insert', 'delete'")
    expected: str
    heard: str

class WordResult(BaseModel):
    word: str
    correct: bool
    phoneme_mismatch: Optional[str] = None
    transcribed_word: Optional[str] = None
    acoustic_score: Optional[float] = None
    stt_confidence: float = 0.0
    diagnostics: Optional[AcousticDiagnostics] = None
    letter_diff: Optional[List[LetterDiff]] = None

class HesitationDetail(BaseModel):
    after_word: str
    pause_ms: int
    flagged_ambiguous: bool

class LatencyDetailPhase1(BaseModel):
    stt: int
    acoustic: int
    scoring: int
    total_phase1: int

class Phase1Response(BaseModel):
    session_id: str
    checkpoint_id: str
    phase: int = 1
    transcript: str
    words: List[WordResult]
    wpm: int
    hesitations: List[HesitationDetail]
    stt_source: str
    latency_ms: LatencyDetailPhase1
    warnings: List[str]

class LatencyDetailPhase2(BaseModel):
    gemini_feedback: int
    gemini_hesitation: int

class Phase2Response(BaseModel):
    session_id: str
    checkpoint_id: str
    phase: int = 2
    feedback_text: str
    engagement_state: str
    comprehension_question: str
    practice_recommendation: str
    feedback_source: str
    latency_ms: LatencyDetailPhase2

class SessionSummary(BaseModel):
    id: str
    student_id: str
    story_id: str
    language: str
    score: float
    total_words: int
    correct_words: int
    wpm: float
    synced: bool
    local_created_at: str

class StrugglingWord(BaseModel):
    word: str
    misses: int

class DashboardMetrics(BaseModel):
    student_id: str
    active_sessions: int
    average_accuracy: float
    average_wpm: float
    improvement: float
    struggling_words: List[StrugglingWord] = []

class ClassDashboardMetrics(BaseModel):
    active_students: int
    daily_sessions: int
    class_accuracy: float
    improvement: float

class StudentRosterItem(BaseModel):
    id: str
    name: str
    level: int
    age: int
    last_active: str
    status: str
    
class CheckpointDetail(BaseModel):
    id: int
    session_id: str
    checkpoint_id: str
    transcript: Optional[str]
    stt_source: Optional[str]
    feedback_text: Optional[str]
    feedback_source: Optional[str]
    engagement_state: Optional[str]
    words: List[WordResult]

class SessionDetailResponse(SessionSummary):
    checkpoints: List[CheckpointDetail]
