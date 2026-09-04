import asyncio
from app.storage.database import init_db, save_session, get_unsynced_sessions, mark_sessions_synced

async def test_db():
    print("Initializing DB...")
    await init_db()
    
    print("Saving test session 1...")
    id1 = await save_session("stu_1", "ch_1", "en", 85.0)
    print("Saving test session 2...")
    id2 = await save_session("stu_2", "ch_2", "ur", 72.0)
    
    unsynced = await get_unsynced_sessions()
    print(f"Unsynced count: {len(unsynced)}")
    for s in unsynced:
        print(f" - {s['id']}: {s['synced']}")
        
    print("Marking as synced...")
    await mark_sessions_synced([id1, id2])
    
    unsynced_after = await get_unsynced_sessions()
    print(f"Unsynced count after: {len(unsynced_after)}")

if __name__ == "__main__":
    asyncio.run(test_db())
