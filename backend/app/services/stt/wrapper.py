import logging
from typing import Tuple
from app.services.stt.groq_whisper import groq_whisper, GroqSTTError, TranscriptResult
from app.services.stt.local_whisper import local_whisper

logger = logging.getLogger(__name__)

def get_transcript(audio_bytes: bytes) -> Tuple[TranscriptResult, str]:
    """
    Attempts to get a transcript using Groq online STT.
    Falls back to local Whisper if Groq fails or times out.
    
    Returns:
        (TranscriptResult, stt_source string)
    """
    try:
        # groq_whisper already has a built-in timeout in its client
        transcript = groq_whisper(audio_bytes)
        return transcript, "groq"
    except (GroqSTTError, Exception) as e:
        logger.warning(f"groq_fallback: {e}")
        # Fall back to local model
        transcript = local_whisper(audio_bytes)
        return transcript, "local_fallback"
