from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from database.schema import get_db_connection

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

class SessionResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    target_sentence: Optional[str]
    transcript: Optional[str]
    wpm: Optional[float]
    accuracy: Optional[float]
    overall_score: Optional[int]
    timestamp: str

@router.get("/", response_model=List[SessionResponse])
def get_sessions(student_id: Optional[str] = None):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = '''
            SELECT s.*, st.name as student_name 
            FROM sessions s
            JOIN students st ON s.student_id = st.id
        '''
        params = []
        
        if student_id:
            query += " WHERE s.student_id = ?"
            params.append(student_id)
            
        query += " ORDER BY s.timestamp DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

@router.get("/{session_id}/diagnosis")
def get_session_diagnosis(session_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM diagnoses WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Diagnosis not found")
            
        import json
        
        # Parse the JSON strings back to objects for the API response
        return {
            "session_id": row["session_id"],
            "phonetic_result": json.loads(row["phonetic_result"]) if row["phonetic_result"] else None,
            "difficulty_result": json.loads(row["difficulty_result"]) if row["difficulty_result"] else None,
            "engagement_result": json.loads(row["engagement_result"]) if row["engagement_result"] else None,
            "practice_result": json.loads(row["practice_result"]) if row["practice_result"] else None,
            "progress_result": json.loads(row["progress_result"]) if row["progress_result"] else None,
        }
