import io
from typing import List, Optional
from pydantic import BaseModel, Field
from groq import Groq, APIError, APITimeoutError
from app.core.config import settings


class WordTimestamp(BaseModel):
    word: str
    start_ms: int
    end_ms: int
    confidence: float = Field(default=1.0, description="Per-word confidence score (0.0–1.0) from Whisper")


class SegmentResult(BaseModel):
    text: str
    start_ms: int
    end_ms: int
    avg_logprob: float = Field(default=0.0, description="Average log probability — proxy for transcription quality")
    no_speech_prob: float = Field(default=0.0, description="Probability that segment contains no speech (silence/noise)")
    compression_ratio: float = Field(default=1.0, description="Audio compression ratio for the segment")
    temperature: float = Field(default=0.0, description="Sampling temperature used for decoding this segment")


class TranscriptResult(BaseModel):
    text: str
    words: List[WordTimestamp] = Field(default_factory=list)
    segments: List[SegmentResult] = Field(default_factory=list)
    language: str = Field(default="en", description="Auto-detected language code (e.g. 'en', 'ur')")
    duration: float = Field(default=0.0, description="Total audio duration in seconds")
    # Aggregated quality signals derived from segments
    avg_logprob: float = Field(default=0.0, description="Mean avg_logprob across all segments")
    no_speech_prob: float = Field(default=0.0, description="Mean no_speech_prob across all segments")


class GroqSTTError(Exception):
    """Custom exception for Groq STT API errors or timeouts."""
    pass


def groq_whisper(audio_bytes: bytes) -> TranscriptResult:
    """
    Calls the Groq Whisper API (whisper-large-v3) to get transcript, word timestamps,
    per-word confidence scores, segment quality signals, detected language, and duration.

    Extracts EVERYTHING the Groq verbose_json response provides:
    - text, words (with start/end/confidence)
    - segments (with avg_logprob, no_speech_prob, compression_ratio, temperature)
    - language detection
    - total audio duration
    """
    try:
        client = Groq(api_key=settings.GROQ_API_KEY, timeout=10.0)
        file_obj = ("audio.webm", io.BytesIO(audio_bytes), "audio/webm")

        response = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=file_obj,
            response_format="verbose_json",
            timestamp_granularities=["segment", "word"]  # Request both granularities
        )

        # --- Full text ---
        text = response.text or ""

        # --- Language & duration ---
        language = getattr(response, "language", "en") or "en"
        duration = float(getattr(response, "duration", 0.0) or 0.0)

        # --- Word-level timestamps + confidence ---
        words_data = getattr(response, "words", None) or []
        words: List[WordTimestamp] = []
        for w in words_data:
            if isinstance(w, dict):
                word_text = w.get("word", "")
                start = w.get("start", 0.0)
                end = w.get("end", 0.0)
                conf = w.get("confidence", 1.0)
            else:
                word_text = getattr(w, "word", "")
                start = getattr(w, "start", 0.0)
                end = getattr(w, "end", 0.0)
                conf = getattr(w, "confidence", 1.0)

            words.append(WordTimestamp(
                word=word_text,
                start_ms=int(start * 1000),
                end_ms=int(end * 1000),
                confidence=float(conf) if conf is not None else 1.0
            ))

        # --- Segment-level quality signals ---
        segments_data = getattr(response, "segments", None) or []
        segments: List[SegmentResult] = []
        logprob_sum = 0.0
        no_speech_sum = 0.0

        for seg in segments_data:
            if isinstance(seg, dict):
                seg_text = seg.get("text", "")
                seg_start = seg.get("start", 0.0)
                seg_end = seg.get("end", 0.0)
                avg_lp = seg.get("avg_logprob", 0.0)
                no_sp = seg.get("no_speech_prob", 0.0)
                comp_r = seg.get("compression_ratio", 1.0)
                temp = seg.get("temperature", 0.0)
            else:
                seg_text = getattr(seg, "text", "")
                seg_start = getattr(seg, "start", 0.0)
                seg_end = getattr(seg, "end", 0.0)
                avg_lp = getattr(seg, "avg_logprob", 0.0)
                no_sp = getattr(seg, "no_speech_prob", 0.0)
                comp_r = getattr(seg, "compression_ratio", 1.0)
                temp = getattr(seg, "temperature", 0.0)

            segments.append(SegmentResult(
                text=seg_text,
                start_ms=int(seg_start * 1000),
                end_ms=int(seg_end * 1000),
                avg_logprob=float(avg_lp or 0.0),
                no_speech_prob=float(no_sp or 0.0),
                compression_ratio=float(comp_r or 1.0),
                temperature=float(temp or 0.0)
            ))
            logprob_sum += float(avg_lp or 0.0)
            no_speech_sum += float(no_sp or 0.0)

        n = len(segments)
        mean_logprob = logprob_sum / n if n > 0 else 0.0
        mean_no_speech = no_speech_sum / n if n > 0 else 0.0

        return TranscriptResult(
            text=text,
            words=words,
            segments=segments,
            language=language,
            duration=duration,
            avg_logprob=mean_logprob,
            no_speech_prob=mean_no_speech
        )

    except APITimeoutError as e:
        raise GroqSTTError(f"Groq API timed out: {e}")
    except APIError as e:
        raise GroqSTTError(f"Groq API error: {e}")
    except Exception as e:
        raise GroqSTTError(f"Unexpected error calling Groq API: {e}")
