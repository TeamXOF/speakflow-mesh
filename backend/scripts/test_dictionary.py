import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.dictionary.reference_dictionary import ReferenceDictionary, WordNotFoundError

def test_dictionary():
    print("Initializing ReferenceDictionary...")
    d = ReferenceDictionary()
    
    print("\n--- Testing Standard Lookups ---")
    
    # 1. English word
    en_rabbit = d.lookup("rabbit", "en")
    print(f"[OK] en_rabbit found. Pitch mean: {en_rabbit.pitch_mean}")
    assert en_rabbit.pitch_mean == 440.0, "Mismatch in English auto-generated vector"
    
    # 2. English word 2
    en_fox = d.lookup("fox", "en")
    print(f"[OK] en_fox found. Pitch mean: {en_fox.pitch_mean}")
    assert en_fox.pitch_mean == 220.0, "Mismatch in English auto-generated vector"
    
    print("\n--- Testing Manual Overrides ---")
    # 3. Urdu word with override
    ur_qaf = d.lookup("qaf", "ur")
    print(f"[OK] ur_qaf found. Pitch mean: {ur_qaf.pitch_mean}")
    # The auto-generated one has 300, the override has 320. 
    # The override MUST take precedence.
    assert ur_qaf.pitch_mean == 320.0, "Override was not applied! Expected 320.0, got 300.0"
    
    print("\n--- Testing Missing Words ---")
    try:
        d.lookup("unknown_word", "en")
        assert False, "Should have raised WordNotFoundError!"
    except WordNotFoundError as e:
        print(f"[OK] Caught expected WordNotFoundError: {e}")

    print("\n[OK] All Phase D dictionary tests passed!")

if __name__ == "__main__":
    test_dictionary()
