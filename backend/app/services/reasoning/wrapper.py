import random
import logging
from typing import Tuple, Dict, Any
from app.services.llm.gemini_client import GeminiFeedbackClient
from app.services.llm.exceptions import GeminiUnavailableError

logger = logging.getLogger(__name__)

TEMPLATE_BANK = [
    "Great try! Keep practicing and you'll get it perfect.",
    "Good effort! Let's try saying it a little slower next time.",
    "Nice work! Remember to take a deep breath before you read.",
    "You're doing great! Sound out the tricky words carefully.",
    "Awesome attempt! Keep reading, you are improving every day!"
]

def get_feedback(mismatch_data: Dict[str, Any]) -> Tuple[str, str]:
    """
    Attempts to get feedback using Gemini.
    Falls back to a predefined template if Gemini is unavailable or fails.
    
    Returns:
        (feedback_text string, feedback_source string)
    """
    try:
        client = GeminiFeedbackClient()
        feedback = client.generate_feedback(mismatch_data)
        return feedback, "gemini"
    except (GeminiUnavailableError, Exception) as e:
        logger.warning(f"gemini_fallback: {e}")
        # Fall back to template
        feedback = random.choice(TEMPLATE_BANK)
        # If there's a specific word that was flagged, we could potentially inject it, 
        # but the templates are generic enough to work without it.
        return feedback, "template_fallback"
