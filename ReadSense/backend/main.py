import os

# ── Inject ffmpeg into PATH so Whisper can decode audio ───────────────────────
# winget installs to a user-local path that isn't in the inherited PATH
# when the process is launched programmatically.
_FFMPEG_CANDIDATES = [
    # winget default install location (Gyan build)
    r"C:\Users\Ace\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-8.1.2-full_build\bin",
    # Also check standard Program Files locations
    r"C:\Program Files\ffmpeg\bin",
    r"C:\ffmpeg\bin",
]
for _ffmpeg_bin in _FFMPEG_CANDIDATES:
    if os.path.isfile(os.path.join(_ffmpeg_bin, "ffmpeg.exe")):
        os.environ["PATH"] = _ffmpeg_bin + os.pathsep + os.environ.get("PATH", "")
        print(f"[STARTUP] ffmpeg found and added to PATH: {_ffmpeg_bin}")
        break
else:
    print("[STARTUP WARNING] ffmpeg not found in known locations. Audio processing may fail.")

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from database.schema import init_db
from routers import pipeline, students, sessions
from routers.auth import router as auth_router
from routers.teacher import router as teacher_router
from routers.v1 import api as v1_api, ws_router, ws_manager, ApiError

# Ensure .env is loaded if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI(title="SpeakFlow AI API")

# Configure CORS — localhost always, plus private LAN ranges (any port) so the
# --local-host classroom mesh (tablets hitting the laptop's :3000 build) works.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
                       r"|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on startup + start the sync-on-reconnect watcher (v2)
@app.on_event("startup")
def startup_event():
    init_db()
    try:
        from services.sync import start_sync_watcher
        start_sync_watcher()
        print("[STARTUP] sync watcher running")
    except Exception as e:
        print(f"[STARTUP WARNING] sync watcher not started: {e}")

# Mount routers (Gen-1 untouched; v2 additive)
app.include_router(pipeline.router)
app.include_router(students.router)
app.include_router(sessions.router)
app.include_router(auth_router)
app.include_router(teacher_router)
app.include_router(v1_api)
app.include_router(ws_router)


@app.on_event("shutdown")
async def shutdown_event():
    # Drop any open Phase-2 WebSocket channels cleanly
    for sid in list(ws_manager._conns.keys()):
        for ws in list(ws_manager._conns.get(sid, set())):
            try:
                await ws.close()
            except Exception:
                pass
        ws_manager._conns.pop(sid, None)


# ── Error envelope for /api/v1 (roadmap Part 1.2) ────────────────────────────
# { "error": { "code", "message", "retryable" } } — Gen-1 routes keep their
# original FastAPI error shape untouched.

@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message,
                           "retryable": exc.retryable}})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    if request.url.path.startswith("/api/v1"):
        msg = "; ".join(
            f"{'.'.join(str(x) for x in e.get('loc', []))}: {e.get('msg', '')}"
            for e in exc.errors())[:300]
        return JSONResponse(status_code=422, content={
            "error": {"code": "VALIDATION_ERROR", "message": msg, "retryable": False}})
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if request.url.path.startswith("/api/v1"):
        code = {404: "SESSION_NOT_FOUND", 422: "VALIDATION_ERROR"}.get(
            exc.status_code, "INTERNAL_ERROR")
        return JSONResponse(status_code=exc.status_code, content={
            "error": {"code": code, "message": str(exc.detail), "retryable": False}})
    return JSONResponse(status_code=exc.status_code,
                        content={"detail": exc.detail},
                        headers=getattr(exc, "headers", None))


if __name__ == "__main__":
    import argparse
    import uvicorn
    parser = argparse.ArgumentParser(description="SpeakFlow AI backend")
    parser.add_argument("--local-host", action="store_true",
                        help="bind to 0.0.0.0 (LAN) for the offline classroom mesh")
    args = parser.parse_args()
    uvicorn.run("main:app", host="0.0.0.0" if args.local_host else "127.0.0.1",
                port=8000, reload=True)

@app.get("/health")
def health_check():
    api_keys_str = os.getenv("GOOGLE_API_KEYS", os.getenv("GOOGLE_API_KEY", ""))
    api_keys = [k.strip() for k in api_keys_str.split(",") if k.strip()]
    return {"status": "ok", "api_key_count": len(api_keys)}

@app.get("/debug-ffmpeg")
def debug_ffmpeg():
    import subprocess
    try:
        r = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
        return {"status": "success", "out": r.stdout[:100]}
    except Exception as e:
        return {"status": "error", "error": str(e), "type": str(type(e).__name__)}
