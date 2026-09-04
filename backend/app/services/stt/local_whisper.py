import io
import time
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field
from faster_whisper import WhisperModel


class WordTimestamp(BaseModel):
    word: str
    start_ms: int
    end_ms: int


class TranscriptResult(BaseModel):
    text: str = Field(description="The transcribed text")
    words: List[WordTimestamp] = Field(default_factory=list, description="Word-level timestamps")
    language: str = Field(default="en", description="Detected language code (e.g. 'en')")
    duration: float = Field(default=0.0, description="Duration of audio in seconds")


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
        # word_timestamps=True so we get per-word timing
        segments, info = self.model.transcribe(audio_stream, beam_size=1, word_timestamps=True)

        text_parts: List[str] = []
        words: List[WordTimestamp] = []

        for segment in segments:
            text_parts.append(segment.text)
            if segment.words:
                for w in segment.words:
                    words.append(WordTimestamp(
                        word=w.word.strip(),
                        start_ms=int(w.start * 1000),
                        end_ms=int(w.end * 1000)
                    ))

        return TranscriptResult(
            text="".join(text_parts).strip(),
            words=words,
            language=info.language,
            duration=info.duration
        )


# Singleton — lazily initialized on first call
_client = None


def local_whisper(audio_bytes: bytes) -> TranscriptResult:
    """
    Fallback transcription using a locally hosted multilingual tiny Whisper model.
    Returns a TranscriptResult compatible with groq_whisper output.
    """
    global _client
    if _client is None:
        _client = LocalWhisperClient()

    return _client.transcribe(audio_bytes)
