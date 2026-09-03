from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="SpeakFlow API", version="1.0.0")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
