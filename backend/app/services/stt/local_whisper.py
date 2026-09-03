import os
import io
import time
from pathlib import Path
from pydantic import BaseModel, Field
from faster_whisper import WhisperModel

class TranscriptResult(BaseModel):
    text: str = Field(description="The transcribed text")
    language: str = Field(description="Detected language code (e.g. 'en')")
    duration: float = Field(default=0.0, description="Duration of audio in seconds")

class LocalWhisperClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LocalWhisperClient, cls).__new__(cls)
            cls._instance._init_model()
        return cls._instance

    def _init_model(self):
        print("Loading faster-whisper tiny.en model for local fallback...")
        start = time.time()
        
        # Download model explicitly to backend/models
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent
        models_dir = backend_dir / "models"
        models_dir.mkdir(exist_ok=True)
        
        # Load the INT8 quantized tiny model
        self.model = WhisperModel(
            "tiny.en",
            device="cpu",
            compute_type="int8",
            download_root=str(models_dir)
        )
        print(f"Loaded faster-whisper in {time.time() - start:.2f} seconds.")

    def transcribe(self, audio_bytes: bytes) -> TranscriptResult:
        audio_stream = io.BytesIO(audio_bytes)
        # Transcribe
        segments, info = self.model.transcribe(audio_stream, beam_size=1)
        
        text_parts = []
        for segment in segments:
            text_parts.append(segment.text)
            
        return TranscriptResult(
            text="".join(text_parts).strip(),
            language=info.language,
            duration=info.duration
        )

# Singleton instance initialized on startup/import
_client = None

def local_whisper(audio_bytes: bytes) -> TranscriptResult:
    """
    Fallback transcription using a locally hosted tiny Whisper model.
    """
    global _client
    if _client is None:
        _client = LocalWhisperClient()
        
    return _client.transcribe(audio_bytes)
