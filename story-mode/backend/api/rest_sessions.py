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
        
        # Practice recommendation: prioritize truly mispronounced words, then skipped/low-score
        practice_word = ""
        for w in words:
            if not w.get('correct') and w.get('phoneme_mismatch') == 'mispronounced':
                practice_word = w.get('word', '')
                break
        if not practice_word:
            for w in words:
                if not w.get('correct'):
                    practice_word = w.get('word', '')
                    break
        if practice_word:
            import string
            practice_word = practice_word.translate(str.maketrans('', '', string.punctuation))
        
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

    # ── Collect warnings from Whisper quality signals ──────────────────────────
    pipeline_warnings = []

    if transcript_res.no_speech_prob > 0.6:
        pipeline_warnings.append(
            f"Audio may contain too much silence or background noise "
            f"(no_speech_prob={transcript_res.no_speech_prob:.2f}). "
            "Try recording in a quieter environment."
        )

    LOW_CONFIDENCE_THRESHOLD = 0.5
    low_confidence_words = {
        w.word.lower().strip()
        for w in transcript_res.words
        if w.confidence < LOW_CONFIDENCE_THRESHOLD
    }
    
    words_result = []
    total_score = 0
    language = session["language"]

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

    target_text = ""
    MOCK_CHECKPOINTS = {
        "cp_1": "The brave little rabbit hopped through the meadow.",
        "cp_2": "The little explorer climbed the steep mountain slowly.",
        "cp_3": "She found a hidden path between the tall dark trees.",
        "cp_4": "The golden key unlocked a chest full of sparkling gems.",
        "cp_5": "All the forest animals gathered to celebrate together.",
        "cp_6": "کتے نے بھونکا",
        "cp_7": "بلی نے دودھ پیا",
        "cp_8": "میں نے کھانا کھایا",
        "cp_9": "وہ سکول گیا",
        "cp_10": "ہم نے کرکٹ کھیلی",
    }
    target_text = MOCK_CHECKPOINTS.get(checkpoint_id, transcript_res.text)

    import string
    def clean_word(w: str) -> str:
        return w.translate(str.maketrans('', '', string.punctuation)).lower()

    target_words_raw = target_text.split()
    valid_targets = []
    for raw_tw in target_words_raw:
        tw_clean = clean_word(raw_tw)
        if tw_clean:
            valid_targets.append((raw_tw, tw_clean))

    from difflib import SequenceMatcher

    target_clean_tokens = [tw_clean for _, tw_clean in valid_targets]
    spoken_clean_tokens = [clean_word(w.word) for w in effective_words if clean_word(w.word)]

    # Global sequence alignment between expected words and spoken words
    word_matcher = SequenceMatcher(None, target_clean_tokens, spoken_clean_tokens)
    aligned_pairs = []

    for tag, i1, i2, j1, j2 in word_matcher.get_opcodes():
        if tag == "equal":
            for t_idx, s_idx in zip(range(i1, i2), range(j1, j2)):
                aligned_pairs.append({
                    "target_idx": t_idx,
                    "spoken_idx": s_idx,
                    "status": "equal"
                })
        elif tag == "replace":
            t_indices = list(range(i1, i2))
            s_indices = list(range(j1, j2))
            min_len = min(len(t_indices), len(s_indices))
            for k in range(min_len):
                aligned_pairs.append({
                    "target_idx": t_indices[k],
                    "spoken_idx": s_indices[k],
                    "status": "replace"
                })
            for k in range(min_len, len(t_indices)):
                aligned_pairs.append({
                    "target_idx": t_indices[k],
                    "spoken_idx": None,
                    "status": "omitted"
                })
        elif tag == "delete":
            for t_idx in range(i1, i2):
                aligned_pairs.append({
                    "target_idx": t_idx,
                    "spoken_idx": None,
                    "status": "omitted"
                })

    for pair in aligned_pairs:
        raw_tw, tw_clean = valid_targets[pair["target_idx"]]
        s_idx = pair["spoken_idx"]
        status = pair["status"]

        matched_w = effective_words[s_idx] if s_idx is not None and s_idx < len(effective_words) else None

        if matched_w:
            feat = extract_features(audio_bytes, start_ms=matched_w.start_ms, end_ms=matched_w.end_ms)
            # Look up reference against the EXPECTED word target
            try:
                ref_feat = dictionary.lookup(tw_clean, language)
            except WordNotFoundError:
                try:
                    ref_feat = dictionary.lookup(clean_word(matched_w.word), language)
                except WordNotFoundError:
                    ref_feat = None

            word_score = score_against_reference(feat, ref_feat) if ref_feat else 80.0

            if matched_w.word.lower().strip() in low_confidence_words:
                word_score = max(0.0, word_score - 15.0)
                if matched_w.word.lower().strip() not in [w['word'].lower() for w in words_result]:
                    pipeline_warnings.append(
                        f"Low STT confidence on '{matched_w.word}' — result may be unreliable."
                    )

            has_letter_difference = (tw_clean != clean_word(matched_w.word))
            is_word_match = (status == "equal") or (not has_letter_difference)
            if not is_word_match:
                # Mispronounced or substituted word
                word_score = min(word_score, 45.0)

            is_correct = is_word_match and (word_score >= settings.CORRECT_THRESHOLD)
            total_score += word_score

            clarity = max(0.0, 100.0 - (feat.spectral_flatness_mean * 100.0 * 2))
            loudness = min(100.0, feat.energy_mean * 1000.0)
            pitch_stab = max(0.0, 100.0 - feat.pitch_std)

            letter_diff = []
            matcher = SequenceMatcher(None, tw_clean, clean_word(matched_w.word))
            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                normalized_type = "match" if tag == "equal" else tag
                letter_diff.append({
                    "type": normalized_type,
                    "expected": tw_clean[i1:i2],
                    "heard": clean_word(matched_w.word)[j1:j2]
                })

            diag_payload = {
                "clarity_score": round(clarity, 1),
                "loudness_score": round(loudness, 1),
                "pitch_stability": round(pitch_stab, 1),
                "spectral_centroid_hz": round(float(feat.spectral_centroid_mean), 1) if getattr(feat, 'spectral_centroid_mean', None) is not None else None,
                "spectral_flatness": round(float(feat.spectral_flatness_mean), 4) if getattr(feat, 'spectral_flatness_mean', None) is not None else None,
                "pitch_hz": round(float(feat.pitch_mean), 1) if getattr(feat, 'pitch_mean', None) is not None else None,
                "mfcc_coeffs": [round(float(c), 2) for c in feat.mfcc_mean[:6]] if getattr(feat, 'mfcc_mean', None) else None,
            }

            mismatch_label = None
            if not is_correct:
                mismatch_label = "mispronounced" if has_letter_difference else "acoustic_low"

            words_result.append({
                "word": raw_tw,
                "correct": is_correct,
                "phoneme_mismatch": mismatch_label,
                "transcribed_word": matched_w.word,
                "acoustic_score": round(word_score, 1),
                "stt_confidence": round(matched_w.confidence, 2),
                "diagnostics": diag_payload,
                "letter_diff": letter_diff if (not is_correct and has_letter_difference) else None
            })
        else:
            # Word was completely skipped / omitted
            words_result.append({
                "word": raw_tw,
                "correct": False,
                "phoneme_mismatch": "omitted",
                "transcribed_word": None,
                "acoustic_score": 0.0,
                "stt_confidence": 0.0,
                "diagnostics": None,
                "letter_diff": None
            })

    t2 = time.time()
    
    avg_score = total_score / len(words_result) if words_result else 0
    duration_mins = (effective_words[-1].end_ms if effective_words else 0) / 60000.0
    wpm = len(words_result) / duration_mins if duration_mins > 0 else 0

    HESITATION_THRESHOLD_MS = 400
    real_hesitations = []
    for i in range(1, len(effective_words)):
        prev_word = effective_words[i - 1]
        curr_word = effective_words[i]
        gap_ms = curr_word.start_ms - prev_word.end_ms
        if gap_ms > HESITATION_THRESHOLD_MS:
            real_hesitations.append({
                "after_word": prev_word.word,
                "pause_ms": gap_ms,
                "flagged_ambiguous": gap_ms > 1500
            })
    
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
        hesitations=real_hesitations,
        stt_source=stt_source,
        latency_ms=phase1_latencies,
        warnings=pipeline_warnings
    )
    
    background_tasks.add_task(
        _process_phase2,
        session_id,
        checkpoint_id,
        transcript_res.text,
        avg_score,
        words_result,
        audio_bytes,
        real_hesitations,
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
