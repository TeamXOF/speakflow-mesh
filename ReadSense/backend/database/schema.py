import sqlite3
import os
from contextlib import contextmanager

# Always resolve to absolute path from the backend directory
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_db_env = os.getenv("DATABASE_URL", "speakflow.db")
# If the env path is relative, make it absolute relative to backend dir
DB_PATH = _db_env if os.path.isabs(_db_env) else os.path.join(_BACKEND_DIR, os.path.basename(_db_env))

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Students table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            grade INTEGER NOT NULL,
            level TEXT DEFAULT 'Level 1',
            created_at TEXT DEFAULT (datetime('now'))
        )
        ''')
        
        # Sessions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            student_id TEXT REFERENCES students(id),
            target_sentence TEXT,
            transcript TEXT,
            audio_path TEXT,
            wpm REAL,
            accuracy REAL,
            overall_score INTEGER,
            timestamp TEXT DEFAULT (datetime('now'))
        )
        ''')
        
        # Signal data table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS signal_data (
            session_id TEXT PRIMARY KEY REFERENCES sessions(id),
            pauses TEXT,
            pitch_series TEXT,
            pitch_variance REAL,
            repetition_count INTEGER DEFAULT 0,
            hesitation_count INTEGER DEFAULT 0
        )
        ''')
        
        # Diagnoses table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS diagnoses (
            session_id TEXT PRIMARY KEY REFERENCES sessions(id),
            phonetic_result TEXT,
            difficulty_result TEXT,
            engagement_result TEXT,
            practice_result TEXT,
            progress_result TEXT
        )
        ''')
        
        # Seed demo student if not exists
        cursor.execute('''
        INSERT OR IGNORE INTO students (id, name, grade, level, created_at)
        VALUES ('student-1', 'Aarav Sharma', 3, 'Level 2', datetime('now'))
        ''')

        # ── v2 checkpoint-based sessions (roadmap API contract) ────────────────
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS story_sessions (
            id TEXT PRIMARY KEY,
            student_id TEXT REFERENCES students(id),
            story_id TEXT NOT NULL,
            language TEXT DEFAULT 'en',
            created_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT,
            synced INTEGER DEFAULT 1,
            mode TEXT DEFAULT 'online'
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS checkpoint_results (
            id TEXT PRIMARY KEY,
            session_id TEXT REFERENCES story_sessions(id),
            checkpoint_id TEXT NOT NULL,
            target_text TEXT,
            transcript TEXT,
            wpm REAL,
            accuracy REAL,
            passed INTEGER DEFAULT 0,
            stars INTEGER DEFAULT 0,
            words_json TEXT,
            hesitations_json TEXT,
            feedback_text TEXT,
            engagement_state TEXT,
            comprehension_question TEXT,
            practice_recommendation TEXT,
            teacher_note TEXT,
            stt_source TEXT,
            feedback_source TEXT,
            latency_json TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(session_id, checkpoint_id)
        )
        ''')

        # ── Auth & roles (teacher / student accounts) ──────────────────────────
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            status TEXT NOT NULL DEFAULT 'pending',
            student_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS auth_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            created_at TEXT DEFAULT (datetime('now'))
        )
        ''')

        # Per-word pronunciation tips (tap-a-word feature). Cached: each word is
        # generated once, then served from here forever.
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS word_tips (
            word TEXT NOT NULL,
            language TEXT NOT NULL DEFAULT 'en',
            tip TEXT NOT NULL,
            syllables_json TEXT,
            source TEXT DEFAULT 'template',
            created_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (word, language)
        )
        ''')

        # Seed the default teacher account (username: teacher / speakflow123)
        from core.security import hash_password
        cursor.execute('''
        INSERT OR IGNORE INTO users (id, username, name, password_hash, role, status)
        VALUES ('user-teacher-1', 'teacher', 'Teacher', ?, 'teacher', 'approved')
        ''', (hash_password("speakflow123"),))

        # Parent auto-update preference (may be missing on pre-existing DBs)
        try:
            cursor.execute(
                "ALTER TABLE students ADD COLUMN parent_update_enabled INTEGER DEFAULT 1")
        except sqlite3.OperationalError:
            pass  # column already exists

        # Reading language of classic-engine sessions ("en" | "ur") — added
        # when Urdu support landed so progress tracking can tell them apart
        try:
            cursor.execute(
                "ALTER TABLE sessions ADD COLUMN language TEXT DEFAULT 'en'")
        except sqlite3.OperationalError:
            pass  # column already exists

        conn.commit()

if __name__ == "__main__":
    print("Initializing Database...")
    init_db()
    print(f"Database initialized at {DB_PATH}")
