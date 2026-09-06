import logging
from app.storage.database import get_unsynced_sessions, mark_sessions_synced
from app.services.network.connectivity import network_available

logger = logging.getLogger(__name__)

async def run_sync_job() -> dict:
    """
    Checks for unsynced sessions. If network is available, mocks the cloud sync 
    and marks them as synced. Returns counts of synced and failed records.
    """
    result = {"synced_count": 0, "failed_count": 0}
    
    unsynced = await get_unsynced_sessions()
    if not unsynced:
        return result
        
    if not network_available():
        logger.info("Sync skipped: No network connectivity.")
        result["failed_count"] = len(unsynced)
        return result
        
    try:
        # MOCK CLOUD SYNC: In a real system, we would POST to a remote API here.
        session_ids = [s["id"] for s in unsynced]
        logger.info(f"Mock syncing {len(session_ids)} records to cloud...")
        
        # Mark as synced in local DB
        await mark_sessions_synced(session_ids)
        
        result["synced_count"] = len(session_ids)
        logger.info(f"Successfully synced {len(session_ids)} records.")
        
    except Exception as e:
        logger.error(f"Sync failed: {str(e)}")
        result["failed_count"] = len(unsynced)
        
    return result
