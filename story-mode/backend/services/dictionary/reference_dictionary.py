import json
from pathlib import Path
from app.services.acoustic.models import FeatureVector

class WordNotFoundError(Exception):
    """Exception raised when a requested word is not found in the reference dictionaries."""
    pass

class ReferenceDictionary:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ReferenceDictionary, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self._load_dictionaries()
            self.initialized = True

    def _load_dictionaries(self):
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        data_dir = base_dir / "data"

        self.main_dict = {}
        self.overrides_dict = {}

        main_path = data_dir / "phoneme_dictionary.json"
        if main_path.exists():
            with open(main_path, "r", encoding="utf-8") as f:
                self.main_dict = json.load(f)

        overrides_path = data_dir / "manual_overrides.json"
        if overrides_path.exists():
            with open(overrides_path, "r", encoding="utf-8") as f:
                self.overrides_dict = json.load(f)

    def lookup(self, word: str, language: str) -> FeatureVector:
        """
        Looks up a word's acoustic feature vector.
        Checks overrides first, then the main dictionary.
        """
        key = f"{language}_{word.lower()}"

        # 1. Check overrides for high-stakes corrections (e.g. ur_qaf)
        if key in self.overrides_dict:
            return FeatureVector(**self.overrides_dict[key])
        
        # 2. Check main dictionary
        if key in self.main_dict:
            return FeatureVector(**self.main_dict[key])

        raise WordNotFoundError(f"Word '{word}' for language '{language}' not found in reference dictionary.")

