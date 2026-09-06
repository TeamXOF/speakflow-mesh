from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import uuid
from typing import List, Optional
from database.schema import get_db_connection

router = APIRouter(prefix="/api/students", tags=["students"])

class StudentCreate(BaseModel):
    name: str
    grade: int
    level: Optional[str] = "Level 1"

class StudentResponse(BaseModel):
    id: str
    name: str
    grade: int
    level: str
    created_at: str

@router.get("/", response_model=List[StudentResponse])
def get_students():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM students ORDER BY name ASC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

@router.post("/", response_model=StudentResponse)
def create_student(student: StudentCreate):
    student_id = f"stu-{str(uuid.uuid4())[:8]}"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO students (id, name, grade, level) VALUES (?, ?, ?, ?)",
            (student_id, student.name, student.grade, student.level)
        )
        conn.commit()
        
        cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
        row = cursor.fetchone()
        return dict(row)

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Student not found")
        return dict(row)

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: str, student: StudentCreate):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE students SET name = ?, grade = ?, level = ? WHERE id = ?",
            (student.name, student.grade, student.level, student_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        conn.commit()
        
        cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
        return dict(cursor.fetchone())

@router.delete("/{student_id}")
def delete_student(student_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # First delete sessions associated with student
        cursor.execute("DELETE FROM sessions WHERE student_id = ?", (student_id,))
        # Then delete student
        cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        conn.commit()
        return {"status": "success", "message": "Student deleted"}
