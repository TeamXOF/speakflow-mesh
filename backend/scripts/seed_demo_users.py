"""Seed default teacher and student demo users into speakflow.db."""
import os
import sys
import sqlite3

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from core.security import hash_password

db_path = os.path.join(backend_dir, "speakflow.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. Teacher account
cur.execute(
    """
    INSERT OR REPLACE INTO users (id, username, name, password_hash, role, status)
    VALUES ('user-teacher-1', 'teacher', 'Teacher', ?, 'teacher', 'approved')
    """,
    (hash_password("speakflow123"),)
)

# 2. Student account 1: student / speakflow123
cur.execute(
    """
    INSERT OR REPLACE INTO users (id, username, name, password_hash, role, status, student_id)
    VALUES ('user-student-1', 'student', 'Aarav Sharma', ?, 'student', 'approved', 'student-1')
    """,
    (hash_password("speakflow123"),)
)

# 3. Student account 2: kid1 / speakflow123
cur.execute(
    """
    INSERT OR REPLACE INTO users (id, username, name, password_hash, role, status, student_id)
    VALUES ('user-student-2', 'kid1', 'Young Explorer', ?, 'student', 'approved', 'student-1')
    """,
    (hash_password("speakflow123"),)
)

# 4. Student account 3: waleedkhalid / Onepunch
cur.execute(
    """
    INSERT OR REPLACE INTO users (id, username, name, password_hash, role, status, student_id)
    VALUES ('user-student-3', 'waleedkhalid', 'Waleed Khalid', ?, 'student', 'approved', 'student-1')
    """,
    (hash_password("Onepunch"),)
)

conn.commit()
print("Successfully seeded demo users:")
for row in cur.execute("SELECT username, role, status, student_id FROM users").fetchall():
    print(f"  - Username: {row[0]} | Role: {row[1]} | Status: {row[2]} | Student ID: {row[3]}")
conn.close()
