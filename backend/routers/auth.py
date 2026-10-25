"""
Role-based authentication (teacher / student).

Flow: students self-register -> account sits in `pending` -> a teacher approves
from the Settings page -> the account links to a roster entry so Story Mode
sessions bind to the right student. Tokens are opaque random strings stored in
SQLite (Authorization: Bearer <token>).
"""
from __future__ import annotations
from typing import Optional

import uuid
import logging

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from core.security import (
    hash_password, verify_password, new_token,
    ACCESS_TOKEN_EXPIRE_SECONDS, REFRESH_TOKEN_EXPIRE_SECONDS,
    COOKIE_ACCESS_NAME, COOKIE_REFRESH_NAME
)
from database.schema import get_db_connection

log = logging.getLogger("speakflow.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_dict(row) -> dict:
    d = dict(row)
    d.pop("password_hash", None)
    return d


def set_auth_cookies(response: Response, access_token: str, refresh_token: Optional[str] = None):
    response.set_cookie(
        key=COOKIE_ACCESS_NAME,
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_SECONDS,
        httponly=True,
        samesite="lax",
        path="/",
        secure=False,
    )
    if refresh_token:
        response.set_cookie(
            key=COOKIE_REFRESH_NAME,
            value=refresh_token,
            max_age=REFRESH_TOKEN_EXPIRE_SECONDS,
            httponly=True,
            samesite="lax",
            path="/",
            secure=False,
        )


def clear_auth_cookies(response: Response):
    response.delete_cookie(key=COOKIE_ACCESS_NAME, path="/")
    response.delete_cookie(key=COOKIE_REFRESH_NAME, path="/")


def get_current_user(request: Request) -> Optional[dict]:
    """Resolve the Bearer token or access_token cookie to a user row, or None."""
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[len("Bearer "):].strip()
    if not token:
        token = request.cookies.get(COOKIE_ACCESS_NAME)
    if not token:
        return None
    with get_db_connection() as conn:
        row = conn.execute(
            """SELECT u.* FROM auth_tokens t
               JOIN users u ON u.id = t.user_id
               WHERE t.token = ?
                 AND (t.token_type IS NULL OR t.token_type = 'access')
                 AND (t.expires_at IS NULL OR t.expires_at > datetime('now'))""",
            (token,)).fetchone()
    return _user_dict(row) if row else None


def require_teacher(user: Optional[dict]) -> Optional[JSONResponse]:
    """Return a 403 envelope response when the user is not an approved teacher."""
    if not user or user["role"] != "teacher" or user["status"] != "approved":
        return JSONResponse(status_code=403, content={
            "error": {"code": "VALIDATION_ERROR",
                      "message": "Teacher access required", "retryable": False}})
    return None


def _json_error(message: str, status: int = 400) -> JSONResponse:
    return JSONResponse(status_code=status, content={
        "error": {"code": "VALIDATION_ERROR", "message": message, "retryable": False}})


@router.post("/register")
async def register(body: dict):
    name = (body.get("name") or "").strip()
    username = (body.get("username") or "").strip().lower()
    password = body.get("password") or ""
    if not name or not username or len(password) < 4:
        return _json_error("Name, username and a password of at least 4 characters are required.")
    if not all(c.isalnum() or c in "._-" for c in username):
        return _json_error("Usernames can only contain letters, numbers, dots, dashes and underscores.")

    with get_db_connection() as conn:
        existing = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if existing:
            return _json_error("That username is already taken.", 409)
        user_id = f"user-{uuid.uuid4().hex[:8]}"
        conn.execute(
            """INSERT INTO users (id, username, name, password_hash, role, status)
               VALUES (?, ?, ?, ?, 'student', 'pending')""",
            (user_id, username, name, hash_password(password)))
        conn.commit()

    return {
        "ok": True,
        "message": "Account created! Your teacher will approve it shortly — then you can log in.",
        "status": "pending",
    }


@router.post("/login")
async def login(body: dict):
    username = (body.get("username") or "").strip().lower()
    password = body.get("password") or ""
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        return _json_error("Wrong username or password.", 401)
    user = _user_dict(row)
    if user["status"] == "pending":
        return JSONResponse(status_code=403, content={
            "error": {"code": "VALIDATION_ERROR", "retryable": False,
                      "message": "Your account is waiting for teacher approval. "
                                 "Please check back soon!"}})
    if user["status"] == "rejected":
        return JSONResponse(status_code=403, content={
            "error": {"code": "VALIDATION_ERROR", "retryable": False,
                      "message": "This account was not approved. Please talk to your teacher."}})

    access_token = new_token()
    refresh_token = new_token()
    with get_db_connection() as conn:
        conn.execute(
            """INSERT INTO auth_tokens (token, user_id, token_type, expires_at)
               VALUES (?, ?, 'access', datetime('now', '+15 minutes'))""",
            (access_token, user["id"]))
        conn.execute(
            """INSERT INTO auth_tokens (token, user_id, token_type, expires_at)
               VALUES (?, ?, 'refresh', datetime('now', '+7 days'))""",
            (refresh_token, user["id"]))
        conn.commit()

    response = JSONResponse(content={
        "token": access_token,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user
    })
    set_auth_cookies(response, access_token, refresh_token)
    return response


@router.post("/refresh")
async def refresh(request: Request):
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    refresh_tok = request.cookies.get(COOKIE_REFRESH_NAME)
    if not refresh_tok and body:
        refresh_tok = body.get("refresh_token")
    if not refresh_tok:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            refresh_tok = auth[len("Bearer "):].strip()

    if not refresh_tok:
        return JSONResponse(status_code=401, content={
            "error": {"code": "REFRESH_TOKEN_MISSING", "message": "No refresh token provided.", "retryable": False}})

    with get_db_connection() as conn:
        row = conn.execute(
            """SELECT u.* FROM auth_tokens t
               JOIN users u ON u.id = t.user_id
               WHERE t.token = ?
                 AND t.token_type = 'refresh'
                 AND (t.expires_at IS NULL OR t.expires_at > datetime('now'))""",
            (refresh_tok,)).fetchone()
        if not row:
            return JSONResponse(status_code=401, content={
                "error": {"code": "REFRESH_TOKEN_EXPIRED", "message": "Refresh token is invalid or expired.", "retryable": False}})

        user = _user_dict(row)
        if user["status"] != "approved":
            return JSONResponse(status_code=403, content={
                "error": {"code": "ACCOUNT_NOT_APPROVED", "message": "Account is not active.", "retryable": False}})

        new_access = new_token()
        conn.execute(
            """INSERT INTO auth_tokens (token, user_id, token_type, expires_at)
               VALUES (?, ?, 'access', datetime('now', '+15 minutes'))""",
            (new_access, user["id"]))
        conn.commit()

    response = JSONResponse(content={
        "ok": True,
        "token": new_access,
        "access_token": new_access,
        "user": user
    })
    set_auth_cookies(response, new_access)
    return response


@router.post("/logout")
async def logout(request: Request):
    tokens_to_delete = []
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        tokens_to_delete.append(auth[len("Bearer "):].strip())
    c_access = request.cookies.get(COOKIE_ACCESS_NAME)
    if c_access:
        tokens_to_delete.append(c_access)
    c_refresh = request.cookies.get(COOKIE_REFRESH_NAME)
    if c_refresh:
        tokens_to_delete.append(c_refresh)

    with get_db_connection() as conn:
        for tok in set(tokens_to_delete):
            conn.execute("DELETE FROM auth_tokens WHERE token = ?", (tok,))
        conn.commit()

    response = JSONResponse(content={"ok": True})
    clear_auth_cookies(response)
    return response


@router.get("/me")
async def me(request: Request):
    user = get_current_user(request)
    if not user:
        return _json_error("Not logged in.", 401)
    return {"user": user}


@router.post("/change-password")
async def change_password(body: dict, request: Request):
    user = get_current_user(request)
    if not user:
        return _json_error("Not logged in.", 401)
    current = body.get("current_password") or ""
    new = body.get("new_password") or ""
    if len(new) < 4:
        return _json_error("New password needs at least 4 characters.")
    with get_db_connection() as conn:
        row = conn.execute("SELECT password_hash FROM users WHERE id = ?",
                           (user["id"],)).fetchone()
        if not row or not verify_password(current, row["password_hash"]):
            return _json_error("Your current password is not correct.", 401)
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?",
                     (hash_password(new), user["id"]))
        conn.commit()
    return {"ok": True, "message": "Password updated."}


# ── Teacher: account management ──────────────────────────────────────────────
@router.get("/users")
async def list_users(request: Request):
    forbidden = require_teacher(get_current_user(request))
    if forbidden:
        return forbidden
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM users ORDER BY status = 'pending' DESC, created_at DESC").fetchall()
    return [_user_dict(r) for r in rows]


@router.post("/users/{user_id}/approve")
async def approve_user(user_id: str, request: Request):
    forbidden = require_teacher(get_current_user(request))
    if forbidden:
        return forbidden
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return _json_error("User not found.", 404)
        if row["status"] == "approved":
            return {"ok": True, "student_id": row["student_id"]}
        # Approve + link (or create) the roster entry so story sessions work
        student_id = row["student_id"]
        if not student_id:
            student_id = f"stu-{uuid.uuid4().hex[:8]}"
            conn.execute(
                """INSERT INTO students (id, name, grade, level)
                   VALUES (?, ?, 3, 'Level 1')""",
                (student_id, row["name"]))
        conn.execute(
            "UPDATE users SET status = 'approved', student_id = ? WHERE id = ?",
            (student_id, user_id))
        conn.commit()
    return {"ok": True, "student_id": student_id}


@router.post("/users/{user_id}/reject")
async def reject_user(user_id: str, request: Request):
    forbidden = require_teacher(get_current_user(request))
    if forbidden:
        return forbidden
    with get_db_connection() as conn:
        conn.execute("UPDATE users SET status = 'rejected' WHERE id = ?", (user_id,))
        conn.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    me_user = get_current_user(request)
    forbidden = require_teacher(me_user)
    if forbidden:
        return forbidden
    if me_user and me_user["id"] == user_id:
        return _json_error("You cannot delete your own account.", 422)
    with get_db_connection() as conn:
        conn.execute("DELETE FROM auth_tokens WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    return {"ok": True}
