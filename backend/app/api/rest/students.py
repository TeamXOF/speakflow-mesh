from fastapi import APIRouter
from app.api.models import DashboardMetrics, ClassDashboardMetrics, StudentRosterItem
from app.storage.database import get_student_sessions, get_all_sessions, get_all_students, get_student_struggling_words

router = APIRouter()

@router.get("/class/dashboard", response_model=ClassDashboardMetrics)
async def get_class_dashboard():
    sessions = await get_all_sessions(100) # Mock 100 recent for class
    if not sessions:
        return ClassDashboardMetrics(active_students=0, daily_sessions=0, class_accuracy=0.0, improvement=0.0)
        
    unique_students = len(set(s['student_id'] for s in sessions))
    daily_sessions = len(sessions) # Simple mock for daily sessions
    
    total_score = sum(s['score'] for s in sessions)
    avg_accuracy = (total_score / len(sessions)) if sessions else 0.0
    
    return ClassDashboardMetrics(
        active_students=unique_students,
        daily_sessions=daily_sessions,
        class_accuracy=avg_accuracy,
        improvement=4.2
    )

@router.get("", response_model=list[StudentRosterItem])
async def list_students():
    roster_rows = await get_all_students()
    result = []
    for row in roster_rows:
        result.append(StudentRosterItem(
            id=row['student_id'],
            name=f"Student {row['student_id'][-4:]}",
            level=3,
            age=8,
            last_active=row['last_active'],
            status="Active"
        ))
    return result

@router.get("/{student_id}/dashboard", response_model=DashboardMetrics)
async def get_student_dashboard(student_id: str, range: str = "all"):
    # range parameter is stubbed for now (can filter by date in SQL later)
    sessions = await get_student_sessions(student_id)
    struggling = await get_student_struggling_words(student_id)
    
    if not sessions:
        return DashboardMetrics(
            student_id=student_id,
            active_sessions=0,
            average_accuracy=0.0,
            average_wpm=0.0,
            improvement=0.0,
            struggling_words=struggling
        )
        
    total_wpm = 0
    total_score = 0
    total_words_all = 0
    correct_words_all = 0
    valid_wpm_count = 0
    
    for sess in sessions:
        if sess["wpm"] > 0:
            total_wpm += sess["wpm"]
            valid_wpm_count += 1
        total_score += sess["score"]
        total_words_all += sess["total_words"]
        correct_words_all += sess["correct_words"]
        
    avg_accuracy = (correct_words_all / total_words_all * 100) if total_words_all > 0 else 0.0
    avg_wpm = (total_wpm / valid_wpm_count) if valid_wpm_count > 0 else 0.0
    
    # Calculate simple improvement (last session score vs average)
    improvement = 0.0
    if len(sessions) > 1:
        last_score = sessions[0]["score"] # they are sorted DESC by created_at
        older_sessions = sessions[1:]
        older_avg = sum(s["score"] for s in older_sessions) / len(older_sessions)
        improvement = last_score - older_avg

    return DashboardMetrics(
        student_id=student_id,
        active_sessions=len(sessions),
        average_accuracy=avg_accuracy,
        average_wpm=avg_wpm,
        improvement=improvement,
        struggling_words=struggling
    )
