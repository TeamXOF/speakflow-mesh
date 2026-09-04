# SpeakFlow V2 - Backend

This is the FastAPI backend for SpeakFlow V2.

## Privacy Notice
SpeakFlow is designed with child privacy as a top priority.
- **No Audio Persistence:** All audio processing is handled in memory. No raw audio files are ever written to disk or stored on the server.
- **Local Processing:** Standard speech-to-text (STT) and acoustic analysis (librosa) are performed locally (or via Groq's ephemeral API).
- **Cloud AI (Hesitation Judgment):** The only exception is the multimodal hesitation judgment (Phase E.2), which sends a short audio clip to Google's Gemini API for analysis. This data is processed ephemerally by Google according to their API terms.
