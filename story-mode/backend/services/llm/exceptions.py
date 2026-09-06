class GeminiUnavailableError(Exception):
    """Raised when Gemini API is unavailable (keys invalid, down, or quota exceeded)."""
    pass

class GeminiTimeoutError(Exception):
    """Raised when Gemini API takes too long to respond."""
    pass
