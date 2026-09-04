import aiosqlite
import logging
from pathlib import Path
from datetime import datetime, timezone
import uuid

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
                synced BOOLEAN NOT NULL DEFAULT 0,
                local_created_at TIMESTAMP NOT NULL
            )
        ''')
        await db.commit()
        logger.info(f"Initialized database at {DB_PATH}")

async def save_session(student_id: str, story_id: str, language: str, score: float = 0.0) -> str:
    """Saves a new session record. By default, synced=False."""
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    created_at = datetime.now(timezone.utc).isoformat()
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            INSERT INTO sessions (id, student_id, story_id, language, score, synced, local_created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, student_id, story_id, language, score, 0, created_at))
        await db.commit()
        return session_id

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
