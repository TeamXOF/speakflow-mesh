import io
import time
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field
from faster_whisper import WhisperModel

# Import the richer TranscriptResult from groq_whisper so both STT paths share the same shape
from app.services.stt.groq_whisper import WordTimestamp, SegmentResult, TranscriptResult


class LocalWhisperClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LocalWhisperClient, cls).__new__(cls)
            cls._instance._init_model()
        return cls._instance

    def _init_model(self):
        print("Loading faster-whisper tiny model for local fallback...")
        start = time.time()

        backend_dir = Path(__file__).resolve().parent.parent.parent.parent
        models_dir = backend_dir / "models"
        models_dir.mkdir(exist_ok=True)

        # Use multilingual "tiny" (not "tiny.en") so Urdu audio can be transcribed
        self.model = WhisperModel(
            "tiny",
            device="cpu",
            compute_type="int8",
            download_root=str(models_dir)
        )
        print(f"Loaded faster-whisper in {time.time() - start:.2f} seconds.")

    def transcribe(self, audio_bytes: bytes) -> TranscriptResult:
        audio_stream = io.BytesIO(audio_bytes)
        # word_timestamps=True enables per-word probability + timing
        # beam_size=5 is more accurate than beam_size=1 (small latency tradeoff on fallback)
        segments, info = self.model.transcribe(
            audio_stream,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,  # Voice Activity Detection: strips leading/trailing silence
            vad_parameters={"min_silence_duration_ms": 300}
        )

        text_parts: List[str] = []
        words: List[WordTimestamp] = []
        segment_results: List[SegmentResult] = []

        logprob_sum = 0.0
        no_speech_sum = 0.0
        seg_count = 0

        for segment in segments:
            text_parts.append(segment.text)

            # --- Segment-level quality signals ---
            avg_lp = float(segment.avg_logprob) if segment.avg_logprob is not None else 0.0
            no_sp = float(segment.no_speech_prob) if segment.no_speech_prob is not None else 0.0
            comp_r = float(segment.compression_ratio) if segment.compression_ratio is not None else 1.0

            segment_results.append(SegmentResult(
                text=segment.text,
                start_ms=int(segment.start * 1000),
                end_ms=int(segment.end * 1000),
                avg_logprob=avg_lp,
                no_speech_prob=no_sp,
                compression_ratio=comp_r,
                temperature=0.0  # faster-whisper doesn't expose temperature directly
            ))

            logprob_sum += avg_lp
            no_speech_sum += no_sp
            seg_count += 1

            # --- Word-level timestamps + confidence probability ---
            if segment.words:
                for w in segment.words:
                    words.append(WordTimestamp(
                        word=w.word.strip(),
                        start_ms=int(w.start * 1000),
                        end_ms=int(w.end * 1000),
                        confidence=float(w.probability) if w.probability is not None else 1.0
                    ))

        mean_logprob = logprob_sum / seg_count if seg_count > 0 else 0.0
        mean_no_speech = no_speech_sum / seg_count if seg_count > 0 else 0.0

        return TranscriptResult(
            text="".join(text_parts).strip(),
            words=words,
            segments=segment_results,
            language=info.language,
            duration=float(info.duration) if info.duration else 0.0,
            avg_logprob=mean_logprob,
            no_speech_prob=mean_no_speech
        )


# Singleton — lazily initialized on first call
_client = None


def local_whisper(audio_bytes: bytes) -> TranscriptResult:
    """
    Fallback transcription using locally hosted multilingual tiny Whisper model.
    Extracts EVERYTHING faster-whisper provides:
    - text, word timestamps with per-word probability scores
    - segment avg_logprob, no_speech_prob, compression_ratio
    - language detection, total duration
    - VAD filtering for cleaner silence detection
    Returns a TranscriptResult fully compatible with groq_whisper output.
    """
    global _client
    if _client is None:
        _client = LocalWhisperClient()

    return _client.transcribe(audio_bytes)
