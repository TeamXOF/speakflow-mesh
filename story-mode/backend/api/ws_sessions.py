import base64
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.stt.groq_whisper import groq_whisper
from app.services.stt.local_whisper import local_whisper
from app.services.network.connectivity import network_available
from app.services.acoustic.scorer import score_against_reference
from app.services.acoustic.feature_extractor import extract_features
from app.services.dictionary.reference_dictionary import ReferenceDictionary, WordNotFoundError
from app.services.llm.gemini_client import GeminiFeedbackClient

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/ws/test_route")
async def ws_test_route():
    return {"hello": "world"}

@router.websocket("/ws/sessions/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected for session: {session_id}")
    
    # Initialize singletons
    ref_dict = ReferenceDictionary()
    gemini_client = GeminiFeedbackClient()

    try:
        while True:
            # We expect a JSON payload
            data = await websocket.receive_text()
            
            try:
                payload = json.loads(data)
                b64_audio = payload.get("audio")
                expected_word = payload.get("expected_word", "")
                
                if not b64_audio:
                    await websocket.send_json({"error": "Missing 'audio' field in JSON payload"})
                    continue
                
                # 1. Decode audio
                audio_bytes = base64.b64decode(b64_audio)
                
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON format. Expected JSON payload."})
                continue
            except Exception as e:
                await websocket.send_json({"error": f"Failed to decode audio: {str(e)}"})
                continue

            # PHASE 1: STT
            try:
                if network_available():
                    # Cloud fallback
                    logger.info("Network available, using Groq for STT.")
                    # groq_whisper is synchronous, could block event loop slightly, but acceptable for this demo
                    transcript_result = groq_whisper(audio_bytes)
                else:
                    # Local fallback
                    logger.info("Network offline or Groq unavailable, using Local Whisper.")
                    transcript_result = local_whisper(audio_bytes)
                
                # Note: local_whisper has language/duration, groq_whisper doesn't. 
                # We'll safely use getattr/default to handle both shapes if needed.
                text = getattr(transcript_result, 'text', '')
                lang = getattr(transcript_result, 'language', 'en')
                
                phase1_msg = {
                    "phase": 1,
                    "text": text,
                    "language": lang
                }
                
                # Send Phase 1 immediately
                await websocket.send_json(phase1_msg)
                
            except Exception as e:
                logger.error(f"Phase 1 error: {e}")
                await websocket.send_json({"error": f"Phase 1 STT failed: {str(e)}"})
                continue

            # PHASE 2: Acoustic & LLM Feedback
            try:
                if not expected_word:
                    # If no expected word is provided, we skip phase 2 or just return dummy data
                    await websocket.send_json({"phase": 2, "error": "No expected_word provided for scoring"})
                    continue

                actual_transcript = text.strip()
                
                # Look up reference vector
                try:
                    ref_vector = ref_dict.lookup(expected_word, lang)
                    
                    # Extract features from child's audio
                    child_vector = extract_features(audio_bytes)
                    
                    # Compute acoustic match score
                    score = score_against_reference(child_vector, ref_vector)
                except WordNotFoundError:
                    # Fallback if word not in dictionary
                    logger.warning(f"Word '{expected_word}' not found in dict, defaulting score to 50")
                    score = 50.0
                    child_vector = extract_features(audio_bytes) # Just to have something
                    ref_vector = child_vector
                
                # Generate AI feedback
                hesitation = ""
                feedback = ""
                if network_available():
                    try:
                        # Prepare mismatch data payload
                        mismatch_data = {
                            "word": expected_word,
                            "transcript": actual_transcript,
                            "score": score,
                            "child_features": child_vector.model_dump(),
                            "reference_features": ref_vector.model_dump()
                        }
                        
                        feedback = gemini_client.generate_feedback(mismatch_data)
                        
                        # Judge hesitation if duration > 2 and transcript is empty or very short
                        duration = getattr(transcript_result, 'duration', 0.0)
                        if not actual_transcript and duration > 2.0:
                            hesitation = gemini_client.judge_hesitation(audio_bytes, mismatch_data)
                    except Exception as e:
                        logger.warning(f"Gemini feedback failed: {e}")
                        feedback = "Oops, my brain is taking a quick nap! Try again!"
                else:
                    feedback = "Keep trying! Practice makes perfect!"
                
                phase2_msg = {
                    "phase": 2,
                    "score": score,
                    "feedback": feedback,
                    "hesitation": hesitation
                }
                
                await websocket.send_json(phase2_msg)

            except Exception as e:
                logger.error(f"Phase 2 error: {e}")
                await websocket.send_json({"error": f"Phase 2 processing failed: {str(e)}"})
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session: {session_id}")
