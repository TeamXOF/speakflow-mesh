import io
from typing import List
from pydantic import BaseModel
from groq import Groq, APIError, APITimeoutError
from app.core.config import settings

class WordTimestamp(BaseModel):
    word: str
    start_ms: int
    end_ms: int

class TranscriptResult(BaseModel):
    text: str
    words: List[WordTimestamp]

class GroqSTTError(Exception):
    """Custom exception for Groq STT API errors or timeouts."""
    pass

def groq_whisper(audio_bytes: bytes) -> TranscriptResult:
    """
    Calls the Groq Whisper API (whisper-large-v3) to get transcript and word timestamps.
    """
    try:
        client = Groq(api_key=settings.GROQ_API_KEY, timeout=0.6)
        
        # The API requires a tuple of (filename, file-like object, content_type)
        # Using .webm helps Groq's internal FFmpeg process decode it correctly
        file_obj = ("audio.webm", io.BytesIO(audio_bytes), "audio/webm")
        
        response = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=file_obj,
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )
        
        # Parse the response
        text = response.text
        words_data = response.words if hasattr(response, "words") and response.words else []
        
        words: List[WordTimestamp] = []
        for w in words_data:
            words.append(WordTimestamp(
                word=w["word"] if isinstance(w, dict) else w.word,
                start_ms=int((w["start"] if isinstance(w, dict) else w.start) * 1000),
                end_ms=int((w["end"] if isinstance(w, dict) else w.end) * 1000)
            ))
            
        return TranscriptResult(text=text, words=words)
        
    except APITimeoutError as e:
        raise GroqSTTError(f"Groq API timed out: {e}")
    except APIError as e:
        raise GroqSTTError(f"Groq API error: {e}")
    except Exception as e:
        raise GroqSTTError(f"Unexpected error calling Groq API: {e}")
