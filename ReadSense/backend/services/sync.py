"""
Sync-on-reconnect (roadmap Part 1.3 / Prompt 8).

Sessions created while offline get synced=0. A background thread watches
network_available(); on a false->true transition it pushes queued rows to
CLOUD_SYNC_URL (session_id is the idempotency key — re-sends overwrite).
If CLOUD_SYNC_URL is unset the queue mechanics still work end-to-end and
POST /api/v1/sync reports honestly that no cloud target is configured.
"""
import os
import json
import logging
import threading
import time

import requests

from core.config import settings
from services.stt import network_available
from database.schema import get_db_connection

log = logging.getLogger("speakflow.sync")


def get_queued_count() -> int:
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM story_sessions WHERE synced = 0").fetchone()
        return int(row["n"]) if row else 0


def push_queued() -> dict:
    """Attempt to push every unsynced session + its checkpoint results."""
    if not settings.CLOUD_SYNC_URL:
        return {
            "synced_count": 0,
            "failed_count": 0,
            "queued": get_queued_count(),
            "note": "CLOUD_SYNC_URL not configured — queue retained locally.",
        }
    synced, failed = 0, 0
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM story_sessions WHERE synced = 0").fetchall()
        for row in rows:
            payload = dict(row)
            cps = conn.execute(
                "SELECT * FROM checkpoint_results WHERE session_id = ?",
                (row["id"],)).fetchall()
            payload["checkpoints"] = [dict(c) for c in cps]
            try:
                resp = requests.post(
                    settings.CLOUD_SYNC_URL, json=payload, timeout=5)
                resp.raise_for_status()
                conn.execute(
                    "UPDATE story_sessions SET synced = 1 WHERE id = ?", (row["id"],))
                conn.commit()
                synced += 1
            except Exception as e:
                log.warning("sync push failed for %s: %s", row["id"], e)
                failed += 1
    return {"synced_count": synced, "failed_count": failed,
            "queued": get_queued_count(), "note": "" if failed == 0 else "some rows failed"}


class SyncWatcher(threading.Thread):
    """Background false->true transition watcher (roadmap Prompt 8)."""
    daemon = True

    def __init__(self):
        super().__init__(name="sync-watcher")
        self._was_online = True
        self._stop = threading.Event()

    def run(self):
        while not self._stop.wait(settings.SYNC_INTERVAL_S):
            try:
                online = network_available()
                if online and not self._was_online:
                    log.info("network restored — triggering sync")
                    push_queued()
                self._was_online = online
            except Exception as e:
                log.warning("sync watcher error: %s", e)

    def stop(self):
        self._stop.set()


def start_sync_watcher() -> SyncWatcher:
    watcher = SyncWatcher()
    watcher.start()
    return watcher
