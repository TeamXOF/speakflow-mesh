from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from app.api.models import (
    CreateSessionRequest, 
    CreateSessionResponse, 
    Checkpoint,
    Phase1Response,
    Phase2Response,
    SessionSummary,
    ErrorCode,
    ErrorDetail
)
from app.storage.database import (
    save_session, get_session, update_session_metrics, save_latency_log,
    save_checkpoint_phase1, update_checkpoint_phase2, get_session_details, get_all_sessions
)
from app.services.stt.wrapper import get_transcript
from app.services.stt.local_whisper import local_whisper
from app.services.acoustic.feature_extractor import extract_features
from app.services.acoustic.scorer import score_against_reference
from app.services.dictionary.reference_dictionary import ReferenceDictionary, WordNotFoundError
from app.services.reasoning.wrapper import get_feedback
from app.services.llm.gemini_client import GeminiFeedbackClient
from app.core.config import settings
from app.services.network.connectivity import network_available
import time

router = APIRouter()
dictionary = ReferenceDictionary()
gemini_client = GeminiFeedbackClient()

# Mock checkpoints for Forest Adventure
DEMO_CHECKPOINTS = [
    {"checkpoint_id": "cp_1", "target_text": "The brave little rabbit hopped through the meadow."},
    {"checkpoint_id": "cp_2", "target_text": "The little explorer climbed the steep mountain slowly."},
    {"checkpoint_id": "cp_3", "target_text": "She found a hidden path between the tall dark trees."},
    {"checkpoint_id": "cp_4", "target_text": "The golden key unlocked a chest full of sparkling gems."},
    {"checkpoint_id": "cp_5", "target_text": "All the forest animals gathered to celebrate together."}
]

# Simple in-memory storage for Phase 2 results (key: f"{session_id}_{checkpoint_id}")
PHASE2_RESULTS = {}

@router.post("/sessions", response_model=CreateSessionResponse, status_code=201)
async def create_session(request: CreateSessionRequest):
    session_id = await save_session(request.student_id, request.story_id, request.language)
    checkpoints = [Checkpoint(**cp) for cp in DEMO_CHECKPOINTS]
    return CreateSessionResponse(session_id=session_id, checkpoints=checkpoints)

async def _process_phase2(session_id: str, checkpoint_id: str, transcript: str, score: float, words: list, audio_bytes: bytes, hesitations: list, phase1_latencies: dict):
    try:
        t0 = time.time()
        # Fallback handling for Gemini via wrapper
        mismatch_data = {
            "sentence": transcript,
            "score": score,
            "words": words
        }
        feedback_text, feedback_source = get_feedback(mismatch_data)
        t1 = time.time()
        
        engagement = "confident"
        if hesitations:
            engagement = gemini_client.judge_hesitation(audio_bytes, {"hesitations": hesitations})
        t2 = time.time()
        
        practice_word = next((w['word'] for w in words if not w['correct']), "")
        
        result = Phase2Response(
            session_id=session_id,
            checkpoint_id=checkpoint_id,
            feedback_text=feedback_text,
            engagement_state=engagement,
            comprehension_question="What happened in the story?",
            practice_recommendation=practice_word,
            feedback_source=feedback_source,
            latency_ms={
                "gemini_feedback": int((t1 - t0)*1000),
                "gemini_hesitation": int((t2 - t1)*1000) if hesitations else 0
            }
        )
        PHASE2_RESULTS[f"{session_id}_{checkpoint_id}"] = result
        
        # Save latencies combining Phase 1 and Phase 2
        all_latencies = {**phase1_latencies, "gemini": int((t1 - t0)*1000)}
        await save_latency_log(session_id, checkpoint_id, all_latencies)
        
        await update_checkpoint_phase2(session_id, checkpoint_id, feedback_text, feedback_source, engagement)
        
    except Exception as e:
        # Save a basic fallback
        PHASE2_RESULTS[f"{session_id}_{checkpoint_id}"] = Phase2Response(
            session_id=session_id,
            checkpoint_id=checkpoint_id,
            feedback_text="Good effort! Keep practicing those tricky words.",
            engagement_state="neutral",
            comprehension_question="",
            practice_recommendation="",
            feedback_source="fallback",
            latency_ms={"gemini_feedback": 0, "gemini_hesitation": 0}
        )
        
        all_latencies = {**phase1_latencies, "gemini": 0}
        await save_latency_log(session_id, checkpoint_id, all_latencies)
        
        await update_checkpoint_phase2(session_id, checkpoint_id, "Good effort! Keep practicing those tricky words.", "fallback", "neutral")

@router.post("/sessions/{session_id}/analyze", response_model=Phase1Response)
async def analyze_checkpoint(
    session_id: str, 
    background_tasks: BackgroundTasks,
    checkpoint_id: str = Form(...),
    audio: UploadFile = File(...)
):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail={"code": ErrorCode.SESSION_NOT_FOUND, "message": "Session not found", "retryable": False})
    
    audio_bytes = await audio.read()
    if len(audio_bytes) < 1000:
        raise HTTPException(status_code=400, detail={"code": ErrorCode.AUDIO_TOO_SHORT, "message": "Audio file too short", "retryable": True})
        
    t0 = time.time()
    
    # STT Fallback wrapper for Phase J
    is_online = network_available()
    if is_online:
        transcript_res, stt_source = get_transcript(audio_bytes)
    else:
        transcript_res = local_whisper(audio_bytes)
        stt_source = "offline"
        
    t1 = time.time()
    
    # Acoustic scoring
    words_result = []
    total_score = 0
    language = session["language"]

    # If STT returned no word timestamps, synthesize them from the transcript text.
    # This happens with local whisper on non-English audio or when Groq omits word-level data.
    effective_words = transcript_res.words
    if not effective_words and transcript_res.text.strip():
        tokens = transcript_res.text.strip().split()
        avg_duration_ms = int((transcript_res.duration * 1000) / len(tokens)) if tokens else 500
        synthetic_words = []
        cursor = 0
        from app.services.stt.groq_whisper import WordTimestamp
        for token in tokens:
            synthetic_words.append(WordTimestamp(
                word=token,
                start_ms=cursor,
                end_ms=cursor + avg_duration_ms
            ))
            cursor += avg_duration_ms
        effective_words = synthetic_words

    for w in effective_words:
        feat = extract_features(audio_bytes, start_ms=w.start_ms, end_ms=w.end_ms)
        try:
            ref_feat = dictionary.lookup(w.word, language)
        except WordNotFoundError:
            ref_feat = None

        word_score = score_against_reference(feat, ref_feat) if ref_feat else 80.0

        is_correct = word_score >= settings.CORRECT_THRESHOLD
        total_score += word_score

        words_result.append({
            "word": w.word,
            "correct": is_correct,
            "phoneme_mismatch": None if is_correct else "generic_mismatch"
        })

    t2 = time.time()

    avg_score = total_score / len(words_result) if words_result else 0
    duration_mins = (effective_words[-1].end_ms if effective_words else 0) / 60000.0
    wpm = len(words_result) / duration_mins if duration_mins > 0 else 0
    
    # Update DB
    correct_count = sum(1 for w in words_result if w["correct"])
    await update_session_metrics(session_id, avg_score, len(words_result), correct_count, wpm)
    
    t3 = time.time()
    
    phase1_latencies = {
        "stt": int((t1 - t0)*1000),
        "acoustic": int((t2 - t1)*1000),
        "scoring": int((t3 - t2)*1000),
        "total_phase1": int((t3 - t0)*1000)
    }
    
    await save_checkpoint_phase1(session_id, checkpoint_id, transcript_res.text, stt_source, words_result)

    phase1 = Phase1Response(
        session_id=session_id,
        checkpoint_id=checkpoint_id,
        transcript=transcript_res.text,
        words=words_result,
        wpm=int(wpm),
        hesitations=[], # Mocking hesitations for Phase I payload
        stt_source=stt_source,
        latency_ms=phase1_latencies,
        warnings=[]
    )
    
    # Trigger Phase 2 in background
    background_tasks.add_task(
        _process_phase2, 
        session_id, 
        checkpoint_id, 
        transcript_res.text, 
        avg_score, 
        words_result, 
        audio_bytes, 
        [],
        phase1_latencies
    )
    
    return phase1

@router.get("/sessions", response_model=list[SessionSummary])
async def get_sessions(limit: int = 50):
    sessions = await get_all_sessions(limit)
    return [SessionSummary(**s) for s in sessions]

from app.api.models import SessionDetailResponse

@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session_summary(session_id: str):
    session = await get_session_details(session_id)
    if not session:
        raise HTTPException(status_code=404, detail={"code": ErrorCode.SESSION_NOT_FOUND, "message": "Session not found", "retryable": False})
    return SessionDetailResponse(**session)

@router.get("/sessions/{session_id}/feedback/{checkpoint_id}", response_model=Phase2Response)
async def get_phase2_feedback(session_id: str, checkpoint_id: str):
    key = f"{session_id}_{checkpoint_id}"
    if key in PHASE2_RESULTS:
        return PHASE2_RESULTS[key]
    raise HTTPException(status_code=404, detail={"code": ErrorCode.INTERNAL_ERROR, "message": "Feedback not ready yet", "retryable": True})
