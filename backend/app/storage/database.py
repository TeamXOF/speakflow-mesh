import aiosqlite
import logging
from pathlib import Path
from datetime import datetime, timezone
import uuid
import sqlite3

logger = logging.getLogger(__name__)

# Resolve the DB path to backend/data/speakflow.db
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "speakflow.db"

async def init_db():
    """Initializes the database schema if it doesn't exist."""
    DATA_DIR.mkdir(exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                story_id TEXT NOT NULL,
                language TEXT NOT NULL,
                score REAL,
                total_words INTEGER DEFAULT 0,
                correct_words INTEGER DEFAULT 0,
                wpm REAL DEFAULT 0.0,
                synced BOOLEAN NOT NULL DEFAULT 0,
                local_created_at TIMESTAMP NOT NULL
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS latency_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                checkpoint_id TEXT NOT NULL,
                stt_ms INTEGER,
                acoustic_ms INTEGER,
                scoring_ms INTEGER,
                gemini_ms INTEGER,
                total_phase1_ms INTEGER,
                created_at TIMESTAMP NOT NULL
            )
        ''')
        # Simple migrations for existing DB
        try:
            await db.execute('ALTER TABLE sessions ADD COLUMN total_words INTEGER DEFAULT 0')
            await db.execute('ALTER TABLE sessions ADD COLUMN correct_words INTEGER DEFAULT 0')
            await db.execute('ALTER TABLE sessions ADD COLUMN wpm REAL DEFAULT 0.0')
        except sqlite3.OperationalError:
            pass # columns already exist
        await db.commit()
        logger.info(f"Initialized database at {DB_PATH}")

async def save_session(student_id: str, story_id: str, language: str, score: float = 0.0) -> str:
    """Saves a new session record. By default, synced=False."""
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    created_at = datetime.now(timezone.utc).isoformat()
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            INSERT INTO sessions (id, student_id, story_id, language, score, total_words, correct_words, wpm, synced, local_created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, student_id, story_id, language, score, 0, 0, 0.0, 0, created_at))
        await db.commit()
        return session_id

async def save_latency_log(session_id: str, checkpoint_id: str, latencies: dict):
    """Saves latency metrics for a session's checkpoint."""
    created_at = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            INSERT INTO latency_logs (
                session_id, checkpoint_id, stt_ms, acoustic_ms, scoring_ms, gemini_ms, total_phase1_ms, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session_id,
            checkpoint_id,
            latencies.get("stt", 0),
            latencies.get("acoustic", 0),
            latencies.get("scoring", 0),
            latencies.get("gemini", 0),
            latencies.get("total_phase1", 0),
            created_at
        ))
        await db.commit()

async def get_unsynced_sessions() -> list:
    """Returns a list of unsynced session records."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute('SELECT * FROM sessions WHERE synced = 0') as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def mark_sessions_synced(session_ids: list):
    """Marks the specified session IDs as synced."""
    if not session_ids:
        return
        
    async with aiosqlite.connect(DB_PATH) as db:
        # Create a parameterized query string for the IN clause
        placeholders = ','.join(['?'] * len(session_ids))
        await db.execute(f'''
            UPDATE sessions 
            SET synced = 1 
            WHERE id IN ({placeholders})
        ''', session_ids)
        await db.commit()

async def get_session(session_id: str) -> dict | None:
    """Retrieves a single session by ID."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute('SELECT * FROM sessions WHERE id = ?', (session_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def get_student_sessions(student_id: str) -> list:
    """Retrieves all sessions for a student."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute('SELECT * FROM sessions WHERE student_id = ? ORDER BY local_created_at DESC', (student_id,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def update_session_metrics(session_id: str, score: float, total_words: int, correct_words: int, wpm: float):
    """Updates the session metrics after analysis."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            UPDATE sessions 
            SET score = ?, total_words = total_words + ?, correct_words = correct_words + ?, wpm = ?
            WHERE id = ?
        ''', (score, total_words, correct_words, wpm, session_id))
        await db.commit()
