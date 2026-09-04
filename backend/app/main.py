from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.api.models import ErrorEnvelope, ErrorDetail, ErrorCode
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

import asyncio
from contextlib import asynccontextmanager
from app.storage.database import init_db
from app.storage.sync import run_sync_job

async def sync_loop():
    """Background task that runs the sync job every 30 seconds."""
    while True:
        try:
            await asyncio.sleep(30)
            await run_sync_job()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logging.error(f"Error in sync loop: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB
    await init_db()
    
    # Start background sync loop
    task = asyncio.create_task(sync_loop())
    
    yield
    
    # Shutdown sync loop
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="SpeakFlow API", version="1.0.0", lifespan=lifespan)
# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.ws.sessions import router as ws_sessions_router
from app.api.rest.sessions import router as rest_sessions_router
from app.api.rest.students import router as rest_students_router

app.include_router(ws_sessions_router)
app.include_router(rest_sessions_router, prefix="/api/v1")
app.include_router(rest_students_router, prefix="/api/v1/students")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content=ErrorEnvelope(
            error=ErrorDetail(
                code=ErrorCode.VALIDATION_ERROR,
                message=str(exc),
                retryable=False
            )
        ).model_dump()
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=ErrorEnvelope(
            error=ErrorDetail(
                code=ErrorCode.INTERNAL_ERROR,
                message=str(exc),
                retryable=True
            )
        ).model_dump()
    )

import httpx

@app.get("/api/v1/health")
async def health_check():
    """
    Health check endpoint. Checks reachability for Groq and Gemini.
    """
    groq_reachable = False
    gemini_reachable = False
    
    async with httpx.AsyncClient(timeout=1.0) as client:
        try:
            # Simple GET request to the base domains to check network path
            res = await client.get("https://api.groq.com/")
            groq_reachable = True
        except Exception:
            pass
            
        try:
            res = await client.get("https://generativelanguage.googleapis.com/")
            gemini_reachable = True
        except Exception:
            pass

    return {
        "mode": "online",
        "groq_reachable": groq_reachable,
        "gemini_reachable": gemini_reachable,
        "server_time": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/v1/sync")
async def manual_sync():
    """
    Manually triggers the offline-to-cloud sync job.
    """
    result = await run_sync_job()
    return result
