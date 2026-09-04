from fastapi import FastAPI
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
app.include_router(ws_sessions_router)

@app.get("/api/v1/health")
async def health_check():
    """
    Health check endpoint. Reachability checks are stubbed out for now.
    """
    return {
        "mode": "online",
        "groq_reachable": None,
        "gemini_reachable": None,
        "server_time": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/v1/sync")
async def manual_sync():
    """
    Manually triggers the offline-to-cloud sync job.
    """
    result = await run_sync_job()
    return result
