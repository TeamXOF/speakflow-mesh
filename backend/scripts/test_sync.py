import asyncio
from app.storage.database import init_db, save_session, get_unsynced_sessions
from app.storage.sync import run_sync_job

async def test_sync():
    print("Initializing DB...")
    await init_db()
    
    print("Saving test session...")
    await save_session("stu_3", "ch_3", "en", 90.0)
    
    unsynced = await get_unsynced_sessions()
    print(f"Unsynced count before sync: {len(unsynced)}")
    
    print("Running sync job...")
    result = await run_sync_job()
    print(f"Sync result: {result}")
    
    unsynced_after = await get_unsynced_sessions()
    print(f"Unsynced count after sync: {len(unsynced_after)}")

if __name__ == "__main__":
    asyncio.run(test_sync())
