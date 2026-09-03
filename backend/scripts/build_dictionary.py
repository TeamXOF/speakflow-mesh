import json
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

def build_dictionary():
    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Main Phoneme Dictionary (Auto-generated from reference audio ideally)
    # The structure must match the FeatureVector pydantic model exactly.
    phoneme_dict = {
        "en_rabbit": {
            "pitch_mean": 440.0,
            "pitch_std": 10.0,
            "f1_mean": 600.0,
            "f1_std": 20.0,
            "f2_mean": 1200.0,
            "f2_std": 40.0,
            "zcr_mean": 0.05,
            "zcr_std": 0.01,
            "energy_mean": 0.8,
            "energy_std": 0.1
        },
        "en_fox": {
            "pitch_mean": 220.0,
            "pitch_std": 15.0,
            "f1_mean": 500.0,
            "f1_std": 25.0,
            "f2_mean": 1100.0,
            "f2_std": 35.0,
            "zcr_mean": 0.08,
            "zcr_std": 0.02,
            "energy_mean": 0.7,
            "energy_std": 0.15
        },
        "ur_qaf": {
            "pitch_mean": 300.0,
            "pitch_std": 12.0,
            "f1_mean": 700.0,
            "f1_std": 30.0,
            "f2_mean": 1300.0,
            "f2_std": 50.0,
            "zcr_mean": 0.04,
            "zcr_std": 0.01,
            "energy_mean": 0.85,
            "energy_std": 0.1
        }
    }
    
    dict_path = DATA_DIR / "phoneme_dictionary.json"
    with open(dict_path, "w", encoding="utf-8") as f:
        json.dump(phoneme_dict, f, indent=2, ensure_ascii=False)
    print(f"[OK] Created main dictionary at {dict_path}")

    # 2. Manual Overrides Dictionary
    # Used to override auto-generated values for tricky high-stakes pairs (e.g. ق)
    overrides_dict = {
        "ur_qaf": {
            "pitch_mean": 320.0,  # Manually tuned higher pitch
            "pitch_std": 8.0,
            "f1_mean": 750.0,
            "f1_std": 15.0,
            "f2_mean": 1400.0,
            "f2_std": 25.0,
            "zcr_mean": 0.045,
            "zcr_std": 0.005,
            "energy_mean": 0.9,
            "energy_std": 0.05
        }
    }
    
    overrides_path = DATA_DIR / "manual_overrides.json"
    with open(overrides_path, "w", encoding="utf-8") as f:
        json.dump(overrides_dict, f, indent=2, ensure_ascii=False)
    print(f"[OK] Created manual overrides at {overrides_path}")

if __name__ == "__main__":
    build_dictionary()
