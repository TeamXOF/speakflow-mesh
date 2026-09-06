import json
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from app.core.config import settings
from app.services.llm.exceptions import GeminiUnavailableError

class GeminiFeedbackClient:
    def __init__(self, use_demo_key: bool = False):
        if settings.ENV == "demo":
            use_demo_key = True
        api_key = settings.GEMINI_API_KEY_DEMO if use_demo_key else settings.GEMINI_API_KEY
        if not api_key:
            raise GeminiUnavailableError("Gemini API key is not configured in settings.")
        
        genai.configure(api_key=api_key)
        
        # User requested to explicitly use this string
        model_name = "models/gemini-3.5-flash-lite"
        try:
            self.model = genai.GenerativeModel(model_name)
        except Exception as e:
            raise GeminiUnavailableError(f"Failed to initialize Gemini model '{model_name}': {e}")

    def generate_feedback(self, mismatch_data: dict) -> str:
        """
        Generates encouraging feedback based on pronunciation mismatch data.
        """
        prompt = f"""
        You are a supportive, encouraging speech coach for a 7-year-old child.
        The child attempted to say a word, and here is the acoustic analysis:
        {json.dumps(mismatch_data, indent=2)}

        Provide 1-2 short, highly encouraging sentences to help them improve. 
        Do not use technical jargon. Speak directly to the child.
        """
        
        try:
            response = self.model.generate_content(
                prompt,
                request_options={"timeout": 5.0}
            )
            return response.text.strip()
        except google_exceptions.GoogleAPIError as e:
            raise GeminiUnavailableError(f"Gemini API error during feedback generation: {e}")
        except Exception as e:
            raise GeminiUnavailableError(f"Unexpected error calling Gemini: {e}")

    def judge_hesitation(self, audio_bytes: bytes, pause_context: dict) -> str:
        """
        Multimodal call: uses audio context to judge if a pause is due to being nervous
        or not knowing the word. Returns exactly "nervous" or "not_knowing".
        """
        prompt = f"""
        Listen to this audio clip of a child reading. There was a hesitation.
        Context about the session:
        {json.dumps(pause_context, indent=2)}

        Your ONLY output must be exactly one of these two strings:
        "nervous" if the child sounds anxious or stressed.
        "not_knowing" if the child sounds like they forgot the word or are trying to sound it out.
        """
        
        try:
            # We must pass the audio bytes wrapped in a dict with mime_type for the GenAI SDK
            audio_part = {
                "mime_type": "audio/wav",
                "data": audio_bytes
            }
            response = self.model.generate_content(
                [prompt, audio_part],
                request_options={"timeout": 5.0}
            )
            result = response.text.strip().lower()
            if "nervous" in result:
                return "nervous"
            return "not_knowing"
        except google_exceptions.GoogleAPIError as e:
            raise GeminiUnavailableError(f"Gemini API error during hesitation judging: {e}")
        except Exception as e:
            raise GeminiUnavailableError(f"Unexpected error calling Gemini: {e}")
